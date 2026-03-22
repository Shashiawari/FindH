const nodemailer = require('nodemailer');
const supabase = require('../utils/supabaseClient');
const { emitToUser } = require('../utils/socketServer');

const transporter = process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
    : null;

const ensureSmtpConfigured = () => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !transporter) {
        throw new Error('SMTP not configured. Set SMTP_USER and SMTP_PASS.');
    }
};

const getAgentProfileByUserId = async (userId) => {
    const { data: agent, error } = await supabase
        .from('agents')
        .select('id, user_id, name, email, city, verification_status')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    if (!agent || agent.verification_status !== 'Verified') {
        return null;
    }

    return agent;
};

const getNearbyVerifiedAgents = async (listing, requestingUserId) => {
    const normalizedListingCity = (listing.city || '').trim().toLowerCase();
    if (!normalizedListingCity) return [];

    const { data: agents, error } = await supabase
        .from('agents')
        .select('id, user_id, email, name, city, verification_status')
        .eq('verification_status', 'Verified');

    if (error) throw new Error(error.message);

    return (agents || []).filter((agent) => {
        if (!agent.user_id) return false;
        if (agent.user_id === requestingUserId) return false;
        if (agent.user_id === listing.tenant_id) return false;
        return (agent.city || '').trim().toLowerCase() === normalizedListingCity;
    });
};

const isEligibleAgentForBooking = ({ agentUserId, requestingUserId, listingOwnerUserId }) => {
    if (!agentUserId) return false;
    if (requestingUserId && agentUserId === requestingUserId) return false;
    if (listingOwnerUserId && agentUserId === listingOwnerUserId) return false;
    return true;
};

const insertNotifications = async (rows) => {
    if (!rows || rows.length === 0) return [];

    const { data, error } = await supabase
        .from('notifications')
        .insert(rows)
        .select('*');

    if (error) throw new Error(error.message);
    return data || [];
};

const sendEmail = async ({ to, subject, text, html }) => {
    ensureSmtpConfigured();
    await transporter.sendMail({
        from: `"FindH" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html
    });
};

const hydrateBookings = async (bookings) => {
    if (!Array.isArray(bookings) || bookings.length === 0) return [];

    const listingIds = [...new Set(bookings.map((b) => b.listing_id).filter(Boolean))];
    const assignedAgentIds = [...new Set(bookings.map((b) => b.assigned_agent_id || b.agent_id).filter(Boolean))];

    const [{ data: listings, error: listingsError }, { data: agents, error: agentsError }] = await Promise.all([
        listingIds.length
            ? supabase.from('listings').select('id, title, city, address1').in('id', listingIds)
            : Promise.resolve({ data: [], error: null }),
        assignedAgentIds.length
            ? supabase.from('agents').select('id, name, email, phone, city').in('id', assignedAgentIds)
            : Promise.resolve({ data: [], error: null })
    ]);

    if (listingsError) throw new Error(listingsError.message);
    if (agentsError) throw new Error(agentsError.message);

    const listingsById = new Map((listings || []).map((listing) => [listing.id, listing]));
    const agentsById = new Map((agents || []).map((agent) => [agent.id, agent]));

    return bookings.map((booking) => {
        const listing = listingsById.get(booking.listing_id) || null;
        const assignedAgentId = booking.assigned_agent_id || booking.agent_id || null;
        const assignedAgent = assignedAgentId ? agentsById.get(assignedAgentId) || null : null;

        return {
            bookingId: booking.id,
            listingId: booking.listing_id,
            paymentStatus: booking.payment_status,
            verificationStatus: booking.verification_status,
            acceptedAt: booking.accepted_at,
            createdAt: booking.created_at,
            property: listing
                ? {
                    title: listing.title,
                    city: listing.city,
                    address1: listing.address1
                }
                : null,
            assignedAgent: assignedAgent
                ? {
                    id: assignedAgent.id,
                    name: assignedAgent.name,
                    email: assignedAgent.email,
                    phone: assignedAgent.phone,
                    city: assignedAgent.city
                }
                : null
        };
    });
};

exports.createVerificationRequestAfterPayment = async (req, res) => {
    let createdBookingId = null;

    try {
        const userId = req.user?.id;
        const { propertyId } = req.body;

        if (!userId) return res.status(401).json({ message: 'Must be logged in' });
        if (!propertyId) return res.status(400).json({ message: 'propertyId is required' });

        ensureSmtpConfigured();

        const [{ data: listing, error: listingError }, { data: user, error: userError }] = await Promise.all([
            supabase
                .from('listings')
                .select('id, title, city, lat, lng, address1, tenant_id')
                .eq('id', propertyId)
                .maybeSingle(),
            supabase
                .from('users')
                .select('id, name, email, phone, user_code')
                .eq('id', userId)
                .maybeSingle()
        ]);

        if (listingError) throw new Error(listingError.message);
        if (userError) throw new Error(userError.message);
        if (!listing) return res.status(404).json({ message: 'Property not found' });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (listing.tenant_id === userId) {
            return res.status(403).json({ message: 'You cannot request verification for your own property' });
        }

        const { data: existingActiveBooking, error: existingBookingError } = await supabase
            .from('bookings')
            .select('id, verification_status')
            .eq('user_id', userId)
            .eq('listing_id', propertyId)
            .in('verification_status', ['pending', 'accepted', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingBookingError) throw new Error(existingBookingError.message);
        if (existingActiveBooking) {
            return res.status(400).json({ message: 'You already have an active verification request for this property.' });
        }

        const nearbyAgents = (await getNearbyVerifiedAgents(listing, userId)).filter((agent) =>
            isEligibleAgentForBooking({
                agentUserId: agent.user_id,
                requestingUserId: userId,
                listingOwnerUserId: listing.tenant_id
            })
        );
        if (!nearbyAgents || nearbyAgents.length === 0) {
            return res.status(404).json({ message: 'No nearby verified agents found for this property right now.' });
        }

        const agentsMissingEmail = nearbyAgents.filter((agent) => !agent.email);
        if (agentsMissingEmail.length > 0) {
            return res.status(400).json({ message: 'Some nearby verified agents are missing email addresses.' });
        }

        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert([{
                user_id: userId,
                listing_id: propertyId,
                payment_status: 'Paid',
                verification_status: 'pending',
                assigned_agent_id: null,
                agent_id: null
            }])
            .select('id, user_id, listing_id, payment_status, verification_status, created_at')
            .single();

        if (bookingError) throw new Error(bookingError.message);
        createdBookingId = booking.id;

        const { error: requestError } = await supabase
            .from('property_verification_requests')
            .insert([{
                property_id: propertyId,
                property_name: listing.title,
                user_id: userId,
                user_name: user.name || '',
                user_email: user.email,
                user_phone: user.phone || '',
                payment_status: 'paid',
                verification_status: 'pending',
                booking_id: booking.id
            }]);

        if (requestError) throw new Error(requestError.message);

        const requestAgentRows = nearbyAgents.map((agent) => ({
            booking_id: booking.id,
            listing_id: propertyId,
            agent_id: agent.id,
            response_status: 'pending'
        }));

        const { error: responseInsertError } = await supabase
            .from('verification_request_agent_responses')
            .insert(requestAgentRows);

        if (responseInsertError) throw new Error(responseInsertError.message);

        const eligibleAgents = nearbyAgents.filter((agent) =>
            isEligibleAgentForBooking({
                agentUserId: agent.user_id,
                requestingUserId: userId,
                listingOwnerUserId: listing.tenant_id
            })
        );

        const insertedAgentNotifications = await insertNotifications(
            eligibleAgents.map((agent) => ({
                user_id: agent.user_id,
                type: 'VERIFICATION_REQUEST',
                booking_id: booking.id,
                listing_id: propertyId,
                message: 'New property verification request near you',
                is_read: false
            }))
        );

        const tenantNotifications = await insertNotifications([{
            user_id: userId,
            type: 'VERIFICATION_REQUEST_SUBMITTED',
            booking_id: booking.id,
            listing_id: propertyId,
            message: `Verification request sent to ${nearbyAgents.length} nearby agents.`,
            is_read: false
        }]);

        const notificationsByUserId = new Map(
            insertedAgentNotifications.map((notification) => [notification.user_id, notification])
        );

        for (const agent of eligibleAgents) {
            const notification = notificationsByUserId.get(agent.user_id) || null;
            emitToUser(agent.user_id, 'notification:new', { notification });
            emitToUser(agent.user_id, 'verification_request:new', {
                bookingId: booking.id,
                listingId: propertyId,
                propertyTitle: listing.title,
                location: listing.city,
                tenant: {
                    name: user.name || '',
                    email: user.email,
                    userCode: user.user_code || null
                },
                message: 'New verification request available near you'
            });
        }

        if (tenantNotifications[0]) {
            emitToUser(userId, 'notification:new', { notification: tenantNotifications[0] });
        }

        const emailResults = await Promise.allSettled(
            eligibleAgents.map((agent) => sendEmail({
                to: agent.email,
                subject: 'New Verification Request - FindH',
                text: `A new property near your location needs verification.\n\nAccept quickly to claim this request.\nOnly one agent can accept.`,
                html: `
                    <p>A new property near your location needs verification.</p>
                    <p><strong>Property:</strong> ${listing.title}</p>
                    <p><strong>Location:</strong> ${listing.address1 || ''} ${listing.city || ''}</p>
                    <p>Accept quickly to claim this request.<br/>Only one agent can accept.</p>
                `
            }))
        );

        const failedEmails = emailResults.filter((result) => result.status === 'rejected');
        if (failedEmails.length > 0) {
            console.error(`Verification request created, but ${failedEmails.length} agent email(s) failed.`);
        }

        return res.status(201).json({
            message: 'Verification request created and sent to nearby agents.',
            bookingId: booking.id,
            verificationStatus: booking.verification_status,
            notifiedAgents: eligibleAgents.length
        });
    } catch (err) {
        if (createdBookingId) {
            try {
                await supabase.from('verification_request_agent_responses').delete().eq('booking_id', createdBookingId);
                await supabase.from('notifications').delete().eq('booking_id', createdBookingId);
                await supabase.from('property_verification_requests').delete().eq('booking_id', createdBookingId);
                await supabase.from('bookings').delete().eq('id', createdBookingId);
            } catch (cleanupError) {
                console.error('Failed to rollback verification request creation:', cleanupError.message);
            }
        }
        return res.status(500).json({ message: err.message });
    }
};

exports.getAgentVerificationRequests = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Must be logged in' });

        const agent = await getAgentProfileByUserId(userId);
        if (!agent) return res.status(403).json({ message: 'Only agents can access verification requests.' });

        const { data: responses, error: responsesError } = await supabase
            .from('verification_request_agent_responses')
            .select('booking_id, listing_id, response_status, responded_at, created_at')
            .eq('agent_id', agent.id)
            .order('created_at', { ascending: false });

        if (responsesError) throw new Error(responsesError.message);

        const bookingIds = [...new Set((responses || []).map((response) => response.booking_id).filter(Boolean))];
        if (bookingIds.length === 0) return res.json([]);

        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, user_id, listing_id, verification_status, payment_status, assigned_agent_id, accepted_at, created_at')
            .in('id', bookingIds);

        if (bookingsError) throw new Error(bookingsError.message);

        const listingIds = [...new Set((bookings || []).map((booking) => booking.listing_id).filter(Boolean))];
        const tenantIds = [...new Set((bookings || []).map((booking) => booking.user_id).filter(Boolean))];

        const [{ data: listings, error: listingsError }, { data: users, error: usersError }] = await Promise.all([
            listingIds.length
                ? supabase.from('listings').select('id, title, city, address1, tenant_id').in('id', listingIds)
                : Promise.resolve({ data: [], error: null }),
            tenantIds.length
                ? supabase.from('users').select('id, name, email, user_code').in('id', tenantIds)
                : Promise.resolve({ data: [], error: null })
        ]);

        if (listingsError) throw new Error(listingsError.message);
        if (usersError) throw new Error(usersError.message);

        const bookingsById = new Map((bookings || []).map((booking) => [booking.id, booking]));
        const listingsById = new Map((listings || []).map((listing) => [listing.id, listing]));
        const usersById = new Map((users || []).map((user) => [user.id, user]));

        const enriched = (responses || []).map((response) => {
            const booking = bookingsById.get(response.booking_id) || null;
            const listing = booking ? listingsById.get(booking.listing_id) || null : null;
            const tenant = booking ? usersById.get(booking.user_id) || null : null;
            const alreadyTakenByAnotherAgent =
                booking &&
                booking.verification_status !== 'pending' &&
                booking.assigned_agent_id &&
                booking.assigned_agent_id !== agent.id;

            return {
                bookingId: response.booking_id,
                listingId: response.listing_id,
                propertyTitle: listing?.title || 'Unknown Property',
                location: [listing?.address1, listing?.city].filter(Boolean).join(', '),
                tenant: tenant
                    ? {
                        name: tenant.name || '',
                        email: tenant.email,
                        userCode: tenant.user_code || null
                    }
                    : null,
                requestStatus: response.response_status,
                verificationStatus: booking?.verification_status || 'pending',
                acceptedAt: booking?.accepted_at || null,
                createdAt: response.created_at,
                alreadyTakenByAnotherAgent: Boolean(alreadyTakenByAnotherAgent)
            };
        }).filter((request) => {
            const booking = bookingsById.get(request.bookingId) || null;
            const listing = booking ? listingsById.get(booking.listing_id) || null : null;

            return isEligibleAgentForBooking({
                agentUserId: userId,
                requestingUserId: booking?.user_id || null,
                listingOwnerUserId: listing?.tenant_id || null
            });
        });

        return res.json(enriched);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.acceptVerificationRequest = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookingId } = req.params;

        if (!userId) return res.status(401).json({ message: 'Must be logged in' });
        if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });

        ensureSmtpConfigured();

        const agent = await getAgentProfileByUserId(userId);
        if (!agent) return res.status(403).json({ message: 'Only agents can accept verification requests.' });

        const { data: responseRow, error: responseError } = await supabase
            .from('verification_request_agent_responses')
            .select('id, response_status')
            .eq('booking_id', bookingId)
            .eq('agent_id', agent.id)
            .maybeSingle();

        if (responseError) throw new Error(responseError.message);
        if (!responseRow) return res.status(404).json({ message: 'This request is not available for your account.' });
        if (responseRow.response_status === 'rejected') {
            return res.status(400).json({ message: 'You already rejected this request.' });
        }

        const { data: bookingContext, error: bookingContextError } = await supabase
            .from('bookings')
            .select('id, user_id, listing_id')
            .eq('id', bookingId)
            .maybeSingle();

        if (bookingContextError) throw new Error(bookingContextError.message);
        if (!bookingContext) return res.status(404).json({ message: 'Booking not found' });

        const { data: listingContext, error: listingContextError } = await supabase
            .from('listings')
            .select('id, tenant_id')
            .eq('id', bookingContext.listing_id)
            .maybeSingle();

        if (listingContextError) throw new Error(listingContextError.message);

        if (!isEligibleAgentForBooking({
            agentUserId: userId,
            requestingUserId: bookingContext.user_id,
            listingOwnerUserId: listingContext?.tenant_id || null
        })) {
            return res.status(403).json({ message: 'You cannot accept your own verification request.' });
        }

        const acceptedAt = new Date().toISOString();
        const { data: bookingUpdates, error: bookingUpdateError } = await supabase
            .from('bookings')
            .update({
                assigned_agent_id: agent.id,
                agent_id: agent.id,
                verification_status: 'accepted',
                accepted_at: acceptedAt
            })
            .eq('id', bookingId)
            .eq('verification_status', 'pending')
            .is('assigned_agent_id', null)
            .select('id, user_id, listing_id, verification_status, assigned_agent_id, accepted_at')
            .limit(1);

        if (bookingUpdateError) throw new Error(bookingUpdateError.message);

        if (!bookingUpdates || bookingUpdates.length === 0) {
            await supabase
                .from('verification_request_agent_responses')
                .update({ response_status: 'blocked', responded_at: acceptedAt })
                .eq('booking_id', bookingId)
                .eq('agent_id', agent.id)
                .eq('response_status', 'pending');

            return res.status(409).json({ message: 'This request is already taken by another agent' });
        }

        const booking = bookingUpdates[0];

        const { error: markAcceptedError } = await supabase
            .from('verification_request_agent_responses')
            .update({ response_status: 'accepted', responded_at: acceptedAt })
            .eq('booking_id', bookingId)
            .eq('agent_id', agent.id);

        if (markAcceptedError) throw new Error(markAcceptedError.message);

        const { error: markOthersBlockedError } = await supabase
            .from('verification_request_agent_responses')
            .update({ response_status: 'blocked', responded_at: acceptedAt })
            .eq('booking_id', bookingId)
            .eq('response_status', 'pending')
            .neq('agent_id', agent.id);

        if (markOthersBlockedError) throw new Error(markOthersBlockedError.message);

        await supabase
            .from('property_verification_requests')
            .update({
                verification_status: 'accepted',
                assigned_agent_id: agent.id,
                accepted_at: acceptedAt
            })
            .eq('booking_id', bookingId);

        const [{ data: listing, error: listingError }, { data: tenant, error: tenantError }] = await Promise.all([
            supabase
                .from('listings')
                .select('id, title, city, address1')
                .eq('id', booking.listing_id)
                .maybeSingle(),
            supabase
                .from('users')
                .select('id, email, name')
                .eq('id', booking.user_id)
                .maybeSingle()
        ]);

        if (listingError) throw new Error(listingError.message);
        if (tenantError) throw new Error(tenantError.message);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found for this request.' });

        const { data: allResponses, error: allResponsesError } = await supabase
            .from('verification_request_agent_responses')
            .select('agent_id, response_status')
            .eq('booking_id', bookingId);

        if (allResponsesError) throw new Error(allResponsesError.message);

        const blockedAgentIds = (allResponses || [])
            .filter((response) => response.response_status === 'blocked')
            .map((response) => response.agent_id);

        const { data: blockedAgents, error: blockedAgentsError } = blockedAgentIds.length
            ? await supabase
                .from('agents')
                .select('id, user_id')
                .in('id', blockedAgentIds)
            : { data: [], error: null };

        if (blockedAgentsError) throw new Error(blockedAgentsError.message);

        const notificationsToInsert = [
            {
                user_id: tenant.id,
                type: 'VERIFICATION_ACCEPTED',
                booking_id: booking.id,
                listing_id: booking.listing_id,
                message: 'An agent has accepted your verification request',
                is_read: false
            },
            {
                user_id: userId,
                type: 'VERIFICATION_ACCEPTED_BY_ME',
                booking_id: booking.id,
                listing_id: booking.listing_id,
                message: 'You have accepted this verification request.',
                is_read: false
            },
            ...((blockedAgents || []).map((blockedAgent) => ({
                user_id: blockedAgent.user_id,
                type: 'VERIFICATION_REQUEST_TAKEN',
                booking_id: booking.id,
                listing_id: booking.listing_id,
                message: 'This request is already taken by another agent',
                is_read: false
            })))
        ];

        const insertedNotifications = await insertNotifications(notificationsToInsert);
        const notificationGroups = insertedNotifications.reduce((acc, notification) => {
            acc[notification.user_id] = acc[notification.user_id] || [];
            acc[notification.user_id].push(notification);
            return acc;
        }, {});

        Object.keys(notificationGroups).forEach((targetUserId) => {
            const newestNotification = notificationGroups[targetUserId][0];
            emitToUser(targetUserId, 'notification:new', { notification: newestNotification });
        });

        emitToUser(tenant.id, 'verification_request:accepted', {
            bookingId: booking.id,
            listingId: booking.listing_id,
            verificationStatus: 'accepted',
            assignedAgent: {
                id: agent.id,
                name: agent.name,
                email: agent.email
            },
            message: 'An agent has accepted your verification request'
        });

        for (const blockedAgent of blockedAgents || []) {
            emitToUser(blockedAgent.user_id, 'verification_request:taken', {
                bookingId: booking.id,
                listingId: booking.listing_id,
                message: 'This request is already taken by another agent'
            });
        }

        await sendEmail({
            to: tenant.email,
            subject: 'Verification Request Accepted - FindH',
            text: `Your property verification request has been accepted.\nThe agent will visit and upload documents soon.`,
            html: `
                <p>Your property verification request has been accepted.</p>
                <p><strong>Property:</strong> ${listing?.title || 'Property'}</p>
                <p><strong>Location:</strong> ${listing?.address1 || ''} ${listing?.city || ''}</p>
                <p>The agent will visit and upload documents soon.</p>
            `
        });

        return res.json({
            message: 'Verification request accepted successfully.',
            bookingId: booking.id,
            verificationStatus: 'accepted',
            assignedAgentId: agent.id
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.rejectVerificationRequest = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookingId } = req.params;

        if (!userId) return res.status(401).json({ message: 'Must be logged in' });
        if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });

        const agent = await getAgentProfileByUserId(userId);
        if (!agent) return res.status(403).json({ message: 'Only agents can reject verification requests.' });

        const { data: responseRow, error: responseError } = await supabase
            .from('verification_request_agent_responses')
            .select('id, response_status')
            .eq('booking_id', bookingId)
            .eq('agent_id', agent.id)
            .maybeSingle();

        if (responseError) throw new Error(responseError.message);
        if (!responseRow) return res.status(404).json({ message: 'This request is not available for your account.' });
        if (responseRow.response_status === 'accepted') {
            return res.status(400).json({ message: 'You cannot reject a request already accepted by you.' });
        }
        if (responseRow.response_status === 'rejected') {
            return res.json({ message: 'Request already rejected for your account.' });
        }
        if (responseRow.response_status === 'blocked') {
            return res.json({ message: 'Request already taken by another agent.' });
        }

        const respondedAt = new Date().toISOString();
        const { error: rejectError } = await supabase
            .from('verification_request_agent_responses')
            .update({ response_status: 'rejected', responded_at: respondedAt })
            .eq('booking_id', bookingId)
            .eq('agent_id', agent.id)
            .eq('response_status', 'pending');

        if (rejectError) throw new Error(rejectError.message);

        const notifications = await insertNotifications([{
            user_id: userId,
            type: 'VERIFICATION_REQUEST_REJECTED',
            booking_id: bookingId,
            message: 'You rejected this verification request.',
            is_read: false
        }]);

        if (notifications[0]) {
            emitToUser(userId, 'notification:new', { notification: notifications[0] });
        }

        return res.json({ message: 'Request rejected successfully. Other agents can still accept it.' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getMyVerificationRequests = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { listingId } = req.query;

        if (!userId) return res.status(401).json({ message: 'Must be logged in' });

        let bookingsQuery = supabase
            .from('bookings')
            .select('id, user_id, listing_id, payment_status, verification_status, assigned_agent_id, agent_id, accepted_at, created_at')
            .eq('user_id', userId)
            .not('verification_status', 'is', null)
            .order('created_at', { ascending: false });

        if (listingId) {
            bookingsQuery = bookingsQuery.eq('listing_id', listingId);
        }

        const { data: bookings, error: bookingsError } = await bookingsQuery;
        if (bookingsError) throw new Error(bookingsError.message);

        const hydrated = await hydrateBookings(bookings || []);
        return res.json(hydrated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getMyNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Must be logged in' });

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) throw new Error(error.message);
        return res.json(data || []);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getMyUnreadNotificationCount = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Must be logged in' });

        const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw new Error(error.message);
        return res.json({ unread: count || 0 });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { notificationId } = req.params;

        if (!userId) return res.status(401).json({ message: 'Must be logged in' });
        if (!notificationId) return res.status(400).json({ message: 'notificationId is required' });

        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', userId)
            .select('id')
            .limit(1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) return res.status(404).json({ message: 'Notification not found' });

        return res.json({ message: 'Notification marked as read' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { notificationId } = req.params;

        if (!userId) return res.status(401).json({ message: 'Must be logged in' });
        if (!notificationId) return res.status(400).json({ message: 'notificationId is required' });

        const { data, error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', userId)
            .select('id, is_read')
            .limit(1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) return res.status(404).json({ message: 'Notification not found' });

        return res.json({
            message: 'Notification deleted',
            deletedId: data[0].id,
            wasUnread: data[0].is_read === false
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
