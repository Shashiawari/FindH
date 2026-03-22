const supabase = require('../utils/supabaseClient');
const { emitToUser } = require('../utils/socketServer');
const nodemailer = require('nodemailer');

const transporter = process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
    : null;

const sendEmail = async ({ to, subject, text, html }) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !transporter) {
        console.warn('SMTP not configured. Skipping email.');
        return;
    }
    await transporter.sendMail({
        from: `"FindH" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html
    });
};

// ==========================
// GET PROFILE OVERVIEW
// ==========================
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user
        const { data: user, error: uErr } = await supabase
            .from('users')
            .select('id, name, email, user_code, phone, date_of_birth, postal_code, city, state, country, address1, created_at')
            .eq('id', userId)
            .single();
        if (uErr || !user) return res.status(404).json({ message: 'User not found' });

        // Fetch agent record (if any)
        const { data: agent } = await supabase
            .from('agents')
            .select('id, verification_status, verified_badge, name, agent_type')
            .eq('user_id', userId)
            .single();

        res.json({ user, agent: agent || null });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// ==========================
// MY ROOMS (Listings posted by this user)
// ==========================
exports.getMyRooms = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: listings, error } = await supabase
            .from('listings')
            .select('id, title, city, country, cold_rent, warm_rent, status, created_at, property_images')
            .eq('tenant_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getMyRooms error:', error.message);
            // Return empty array instead of crashing
            return res.json([]);
        }
        res.json(Array.isArray(listings) ? listings : []);
    } catch (err) {
        console.error('getMyRooms exception:', err.message);
        res.json([]); // Always return array
    }
};


// ==========================
// UPDATE SETTINGS
// ==========================
exports.updateSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, date_of_birth, postal_code, address1, city, state, country } = req.body;

        const { error } = await supabase
            .from('users')
            .update({ name, phone, date_of_birth: date_of_birth || null, postal_code, address1, city, state, country })
            .eq('id', userId);

        if (error) throw new Error(error.message);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// UPLOAD PROPERTY DOCS (Agent uploads for a booking)
// ==========================
exports.uploadPropertyDocs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;

        // Only verified agents assigned to the booking can upload documents.
        const { data: agent } = await supabase
            .from('agents')
            .select('id, verification_status')
            .eq('user_id', userId)
            .maybeSingle();

        if (!agent || agent.verification_status !== 'Verified') {
            return res.status(403).json({ message: 'Only verified agents can upload property documents' });
        }

        // Get booking
        const { data: booking } = await supabase
            .from('bookings')
            .select(`
                id,
                agent_id, 
                listing_id, 
                user_id,
                users!inner(name, email),
                listings!inner(title)
            `)
            .eq('id', bookingId)
            .single();

        if (!booking || booking.agent_id !== agent.id) {
            return res.status(403).json({ message: 'Booking not assigned to you' });
        }

        const files = req.files || {};
        const uploadFile = async (file, docType) => {
            if (!file) return null;
            const ext = file.originalname.split('.').pop();
            const filePath = `property-docs/${agent.id}/${booking.listing_id}/${docType}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage
                .from('documents')
                .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });
            if (error) throw new Error(`Upload failed for ${docType}: ${error.message}`);
            return filePath;
        };

        const ownershipProof = await uploadFile(files['ownershipProof']?.[0], 'ownership_proof');
        const rentalAgreement = await uploadFile(files['rentalAgreement']?.[0], 'rental_agreement');
        const electricityBill = await uploadFile(files['electricityBill']?.[0], 'electricity_bill');
        const propertyRegistration = await uploadFile(files['propertyRegistration']?.[0], 'property_registration');

        // Handle property images array
        let propertyImages = [];
        if (files['propertyImages']) {
            propertyImages = await Promise.all(
                files['propertyImages'].map((f, i) => uploadFile(f, `property_img_${i}`))
            );
        }

        // Reuse an existing row when present so admin approvals and tenant lookups
        // stay linked to a stable application record.
        const { data: bookingLinkedDoc } = await supabase
            .from('agent_property_documents')
            .select('id')
            .eq('booking_id', bookingId)
            .maybeSingle();

        const { data: listingLinkedDoc } = bookingLinkedDoc
            ? { data: null }
            : await supabase
                .from('agent_property_documents')
                .select('id')
                .eq('agent_id', agent.id)
                .eq('listing_id', booking.listing_id)
                .maybeSingle();

        const existingDoc = bookingLinkedDoc || listingLinkedDoc;

        let upsertErr;
        if (existingDoc) {
            // Update existing record
            const { error } = await supabase
                .from('agent_property_documents')
                .update({
                    booking_id: bookingId,
                    ownership_proof: ownershipProof,
                    rental_agreement: rentalAgreement,
                    electricity_bill: electricityBill,
                    property_registration: propertyRegistration,
                    property_images: propertyImages.filter(Boolean),
                    verification_status: 'pending'
                })
                .eq('id', existingDoc.id);
            upsertErr = error;
        } else {
            // Insert new record
            const { error } = await supabase
                .from('agent_property_documents')
                .insert([{
                    agent_id: agent.id,
                    listing_id: booking.listing_id,
                    booking_id: bookingId,
                    ownership_proof: ownershipProof,
                    rental_agreement: rentalAgreement,
                    electricity_bill: electricityBill,
                    property_registration: propertyRegistration,
                    property_images: propertyImages.filter(Boolean),
                    verification_status: 'pending'
                }]);
            upsertErr = error;
        }

        if (upsertErr) throw new Error(upsertErr.message);

        const { error: bookingStatusError } = await supabase
            .from('bookings')
            .update({ verification_status: 'in_progress' })
            .eq('id', bookingId);

        if (bookingStatusError) throw new Error(bookingStatusError.message);

        const { data: tenantNotification, error: tenantNotificationError } = await supabase
            .from('notifications')
            .insert([{
                user_id: booking.user_id,
                type: 'VERIFICATION_IN_PROGRESS',
                booking_id: bookingId,
                listing_id: booking.listing_id,
                message: 'Verification is now in progress. Agent documents were uploaded.',
                is_read: false
            }])
            .select('*')
            .maybeSingle();

        if (tenantNotificationError) throw new Error(tenantNotificationError.message);

        if (tenantNotification) {
            emitToUser(booking.user_id, 'notification:new', { notification: tenantNotification });
        }

        emitToUser(booking.user_id, 'verification_request:status-updated', {
            bookingId,
            listingId: booking.listing_id,
            verificationStatus: 'in_progress',
            message: 'Verification is now in progress.'
        });

        // Send Email to Tenant
        try {
            await sendEmail({
                to: booking.users.email,
                subject: 'Verification Documents Uploaded – FindH',
                text: `The agent has uploaded verification documents for your requested property: ${booking.listings.title}.\n\nThe documents are currently under review by our admin team.`,
                html: `
                    <p>The agent has uploaded verification documents for your requested property: <strong>${booking.listings.title}</strong>.</p>
                    <p>The documents are currently under review by our admin team.</p>
                    <p>You can check the status anytime in your Profile under "Agent Docs".</p>
                `
            });
        } catch (emailErr) {
            console.error('Failed to send upload email:', emailErr);
        }

        res.json({ message: 'Documents uploaded successfully. Awaiting admin review.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// TENANT VERIFICATIONS VIEW
// ==========================
exports.getMyVerifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                id,
                listing_id,
                agent_id,
                listings!inner(title, city, address1)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        if (!bookings || bookings.length === 0) {
            return res.json([]);
        }

        const flatDocs = [];

        for (const booking of bookings) {
            let docs = null;

            if (booking.agent_id && booking.listing_id) {
                const { data: agentListingDoc, error: agentListingError } = await supabase
                    .from('agent_property_documents')
                    .select(`
                        id,
                        booking_id,
                        listing_id,
                        agent_id,
                        verification_status,
                        ownership_proof,
                        rental_agreement,
                        electricity_bill,
                        property_registration,
                        created_at,
                        agents(name, email),
                        listings(title, city)
                    `)
                    .eq('agent_id', booking.agent_id)
                    .eq('listing_id', booking.listing_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (agentListingError) throw new Error(agentListingError.message);
                docs = agentListingDoc;
            }

            if (!docs && booking.id) {
                const { data: bookingDoc, error: bookingDocError } = await supabase
                    .from('agent_property_documents')
                    .select(`
                        id,
                        booking_id,
                        listing_id,
                        agent_id,
                        verification_status,
                        ownership_proof,
                        rental_agreement,
                        electricity_bill,
                        property_registration,
                        created_at,
                        agents(name, email),
                        listings(title, city)
                    `)
                    .eq('booking_id', booking.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (bookingDocError) throw new Error(bookingDocError.message);
                docs = bookingDoc;
            }

            const status = docs?.verification_status || 'not_uploaded';
            const approvedDocs = status === 'approved'
                ? {
                    'Ownership Proof': docs.ownership_proof,
                    'Rental Agreement': docs.rental_agreement,
                    'Electricity Bill': docs.electricity_bill,
                    'Property Registration': docs.property_registration
                }
                : null;

            flatDocs.push({
                bookingId: booking.id,
                propertyName: docs?.listings?.title || booking.listings?.title || null,
                propertyTitle: docs?.listings?.title || booking.listings?.title || null,
                propertyCity: docs?.listings?.city || booking.listings?.city || null,
                agentName: docs?.agents?.name || null,
                agentEmail: docs?.agents?.email || null,
                verificationStatus: status,
                ownership_proof: status === 'approved' ? docs?.ownership_proof || null : null,
                rental_agreement: status === 'approved' ? docs?.rental_agreement || null : null,
                electricity_bill: status === 'approved' ? docs?.electricity_bill || null : null,
                property_registration: status === 'approved' ? docs?.property_registration || null : null,
                docs: approvedDocs,
                uploadedAt: docs?.created_at || null
            });
        }

        res.json(flatDocs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// AGENT EARNINGS
// ==========================
exports.getMyEarnings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: agent } = await supabase.from('agents').select('id').eq('user_id', userId).maybeSingle();
        
        if (!agent) {
            return res.json({ totalEarnings: 0, verificationsCompleted: 0 });
        }

        const { data: completedDocs } = await supabase
            .from('agent_property_documents')
            .select('id')
            .eq('agent_id', agent.id)
            .eq('verification_status', 'approved');

        const verificationsCompleted = completedDocs ? completedDocs.length : 0;
        const totalEarnings = verificationsCompleted * 50; // $50 per verification

        res.json({ totalEarnings, verificationsCompleted });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
