const supabase = require('../utils/supabaseClient');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { logAdminAction } = require('../middlewares/adminLogMiddleware');
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

const sendEmail = async ({ to, subject, text, html }) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !transporter) {
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

const generateToken = (id) => {
    return jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '30m' });
};

// ==========================
// ADMIN LOGIN
// ==========================
exports.adminLogin = async (req, res) => {
    const { adminId, password } = req.body;
    try {
        const { data: admin, error } = await supabase.from('admins').select('*').eq('admin_id', adminId).single();
        if (error || !admin) return res.status(401).json({ message: 'Invalid Admin ID or Password' });

        if (password === admin.password) {
            res.json({ _id: admin.id, adminId: admin.admin_id, token: generateToken(admin.id) });
        } else {
            res.status(401).json({ message: 'Invalid Admin ID or Password' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 DASHBOARD STATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getDashboardStats = async (req, res) => {
    try {
        const [users, agents, listings, pendingVerif, apps, tickets, queries, bookings] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('agents').select('*', { count: 'exact', head: true }),
            supabase.from('listings').select('*', { count: 'exact', head: true }),
            supabase.from('property_verification_requests').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
            supabase.from('agent_property_documents').select('*', { count: 'exact', head: true }),
            supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
            supabase.from('contact_queries').select('*', { count: 'exact', head: true }),
            supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('payment_status', 'Paid')
        ]);

        res.json({
            total_users: users.count || 0,
            total_agents: agents.count || 0,
            total_listings: listings.count || 0,
            pending_verifications: pendingVerif.count || 0,
            total_applications: apps.count || 0,
            total_tickets: tickets.count || 0,
            total_queries: queries.count || 0,
            total_revenue: (bookings.count || 0) * 10 // €10 per booking
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟣 1. ADMIN MUST VERIFY AGENTS (KYC)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getPendingAgentsKYC = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('agents')
            .select('*')
            .eq('verification_status', 'Pending');

        if (error) throw new Error(error.message);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.approveAgentKYC = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('agents')
            .update({ verification_status: 'Verified', verified_badge: true })
            .eq('id', id);

        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, 'Approved Agent KYC', 'agent', id);
        res.json({ message: 'Agent KYC Approved' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.rejectAgentKYC = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: agent, error: fetchErr } = await supabase.from('agents').select('*').eq('id', id).single();
        if (fetchErr || !agent) return res.status(404).json({ message: 'Agent not found' });

        const pathsToDelete = [agent.selfie, agent.id_front, agent.id_back, agent.student_certificate, agent.student_id_photo].filter(Boolean);
        if (pathsToDelete.length > 0) {
            await supabase.storage.from('documents').remove(pathsToDelete);
        }

        const { error: delErr } = await supabase.from('agents').delete().eq('id', id);
        if (delErr) throw new Error(delErr.message);

        await logAdminAction(req.admin?.id, 'Rejected Agent KYC', 'agent', id);
        res.json({ message: 'Agent KYC Rejected. Data purged.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟣 2. TENANT LISTINGS MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getAllListings = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('listings')
            .select(`*, users!tenant_id(email, name, user_code)`)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Also get verification status for each listing
        const enriched = await Promise.all((data || []).map(async (l) => {
            const { data: verif } = await supabase
                .from('property_verification_requests')
                .select('verification_status')
                .eq('property_id', l.id)
                .eq('verification_status', 'completed')
                .limit(1);

            const { data: agentVerif } = await supabase
                .from('agent_property_documents')
                .select('verification_status')
                .eq('listing_id', l.id)
                .eq('verification_status', 'approved')
                .limit(1);

            return {
                ...l,
                is_verified: (verif && verif.length > 0) || (agentVerif && agentVerif.length > 0)
            };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateListingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { error } = await supabase.from('listings').update({ status }).eq('id', id);
        if (error) {
            if (error.message.includes('violates check constraint')) {
                return res.status(400).json({ message: `Database constraint error: '${status}' is not an allowed status value.` });
            }
            throw new Error(error.message);
        }
        await logAdminAction(req.admin?.id, `Changed listing status to ${status}`, 'listing', id);
        res.json({ message: `Listing marked as ${status}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('listings').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, 'Deleted listing', 'listing', id);
        res.json({ message: 'Listing permanently deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateListingAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.id; // prevent overwriting PK
        const { error } = await supabase.from('listings').update(updates).eq('id', id);
        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, 'Edited listing', 'listing', id);
        res.json({ message: 'Listing updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.featureListing = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('listings').update({ status: 'Featured' }).eq('id', id);
        if (error) {
            if (error.message.includes('violates check constraint')) {
                return res.status(400).json({ message: `Cannot feature: The listings table status check constraint does not allow the value 'Featured'. Please update the constraint in Supabase.` });
            }
            throw new Error(error.message);
        }
        await logAdminAction(req.admin?.id, 'Featured listing', 'listing', id);
        res.json({ message: 'Listing featured' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.hideListing = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('listings').update({ status: 'Hidden' }).eq('id', id);
        if (error) {
            if (error.message.includes('violates check constraint')) {
                return res.status(400).json({ message: `Cannot hide: The listings table status check constraint does not allow the value 'Hidden'. Please update the constraint in Supabase.` });
            }
            throw new Error(error.message);
        }
        await logAdminAction(req.admin?.id, 'Hid listing', 'listing', id);
        res.json({ message: 'Listing hidden' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.verifyListing = async (req, res) => {
    try {
        const { id } = req.params;
        // Mark any pending verification requests as completed
        await supabase
            .from('property_verification_requests')
            .update({ verification_status: 'completed', reviewed_at: new Date().toISOString() })
            .eq('property_id', id)
            .eq('verification_status', 'pending');

        await logAdminAction(req.admin?.id, 'Verified listing', 'listing', id);
        res.json({ message: 'Listing marked as verified' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.unverifyListing = async (req, res) => {
    try {
        const { id } = req.params;
        await supabase
            .from('property_verification_requests')
            .update({ verification_status: 'pending', reviewed_at: null })
            .eq('property_id', id);

        await logAdminAction(req.admin?.id, 'Unverified listing', 'listing', id);
        res.json({ message: 'Listing verification removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟣 3. AGENT BOOKING + PROPERTY VERIFICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getPropertyApplications = async (req, res) => {
    try {
        const { data: docs, error } = await supabase
            .from('agent_property_documents')
            .select(`
                *,
                agents!inner(id, name, email, phone, user_id),
                listings!inner(id, title, address1, city)
            `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        const enriched = await Promise.all((docs || []).map(async (doc) => {
            let agent_user_code = null;
            if (doc.agents?.user_id) {
                const { data: agentUser } = await supabase
                    .from('users')
                    .select('user_code')
                    .eq('id', doc.agents.user_id)
                    .single();
                agent_user_code = agentUser?.user_code;
            }

            const { data: booking } = await supabase
                .from('bookings')
                .select(`
                    id, payment_status,
                    users!inner(email, user_code)
                `)
                .eq('id', doc.booking_id)
                .single();

            return {
                ...doc,
                agents: { ...doc.agents, user_code: agent_user_code },
                tenant_email: booking?.users?.email || null,
                tenant_user_code: booking?.users?.user_code || null,
                payment_status: booking?.payment_status || null
            };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.approvePropertyApp = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin?.id;

        const { data: doc, error: docError } = await supabase
            .from('agent_property_documents')
            .select('id, booking_id, listing_id')
            .eq('id', id)
            .maybeSingle();

        if (docError) throw new Error(docError.message);
        if (!doc) return res.status(404).json({ message: 'Property application not found' });

        const { error } = await supabase
            .from('agent_property_documents')
            .update({
                verification_status: 'approved',
                verified_by_admin_id: adminId,
                verified_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw new Error(error.message);

        if (doc.booking_id) {
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .select('id, user_id, listing_id')
                .eq('id', doc.booking_id)
                .maybeSingle();

            if (bookingError) throw new Error(bookingError.message);

            if (booking) {
                const { error: updateBookingError } = await supabase
                    .from('bookings')
                    .update({ verification_status: 'verified' })
                    .eq('id', booking.id);

                if (updateBookingError) throw new Error(updateBookingError.message);

                const { data: tenantNotification, error: tenantNotificationError } = await supabase
                    .from('notifications')
                    .insert([{
                        user_id: booking.user_id,
                        type: 'VERIFICATION_VERIFIED',
                        booking_id: booking.id,
                        listing_id: booking.listing_id,
                        message: 'Your property verification is completed and marked as verified.',
                        is_read: false
                    }])
                    .select('*')
                    .maybeSingle();

                if (tenantNotificationError) throw new Error(tenantNotificationError.message);

                if (tenantNotification) {
                    emitToUser(booking.user_id, 'notification:new', { notification: tenantNotification });
                }

                const { data: listing } = await supabase
                    .from('listings')
                    .select('title, city, address1')
                    .eq('id', booking.listing_id)
                    .maybeSingle();

                const { data: user } = await supabase
                    .from('users')
                    .select('email, name')
                    .eq('id', booking.user_id)
                    .maybeSingle();

                if (user?.email) {
                    await sendEmail({
                        to: user.email,
                        subject: 'Your FindH verification documents are approved',
                        text: `Your verification documents for ${listing?.title || 'your property'} are approved and available in Profile > Agent Docs.`,
                        html: `
                            <p>Your verification documents for <strong>${listing?.title || 'your property'}</strong> are approved.</p>
                            <p>The uploaded agent documents are now available in <strong>Profile -> Agent Docs</strong>.</p>
                            <p>${listing?.address1 || ''} ${listing?.city || ''}</p>
                        `
                    });
                }

                emitToUser(booking.user_id, 'verification_request:status-updated', {
                    bookingId: booking.id,
                    listingId: booking.listing_id,
                    verificationStatus: 'verified',
                    message: 'Property verification is now completed.'
                });
            }
        }

        await logAdminAction(adminId, 'Approved property application', 'application', id);
        res.json({ message: 'Property application approved for Agent' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.rejectPropertyApp = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const { data: docs } = await supabase.from('agent_property_documents').select('*').eq('id', id).single();
        if (!docs) return res.status(404).json({ message: 'Record not found' });

        const paths = [docs.ownership_proof, docs.rental_agreement, docs.electricity_bill, docs.property_registration, ...(docs.property_images || [])].filter(Boolean);
        if (paths.length > 0) await supabase.storage.from('documents').remove(paths);

        const { error } = await supabase.from('agent_property_documents').update({
            verification_status: 'rejected',
            rejection_reason: reason || 'Documents invalid',
            ownership_proof: null, rental_agreement: null, electricity_bill: null, property_registration: null, property_images: []
        }).eq('id', id);

        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, 'Rejected property application', 'application', id);
        res.json({ message: 'Property application rejected and documents wiped.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.requestReuploadPropertyApp = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const { data: docs, error: docsError } = await supabase
            .from('agent_property_documents')
            .select('*')
            .eq('id', id)
            .single();
        if (docsError) throw new Error(docsError.message);
        if (!docs) return res.status(404).json({ message: 'Record not found' });

        const paths = [docs.ownership_proof, docs.rental_agreement, docs.electricity_bill, docs.property_registration, ...(docs.property_images || [])].filter(Boolean);
        if (paths.length > 0) {
            const { error: storageError } = await supabase.storage.from('documents').remove(paths);
            if (storageError) {
                console.warn('Reupload storage cleanup warning:', storageError.message);
            }
        }

        if (docs.booking_id) {
            const { error: bookingError } = await supabase
                .from('bookings')
                .update({ verification_status: 'accepted', accepted_at: null })
                .eq('id', docs.booking_id);
            if (bookingError) throw new Error(bookingError.message);
        }

        const { error } = await supabase
            .from('agent_property_documents')
            .update({
                verification_status: 'pending',
                rejection_reason: reason || 'Documents require re-upload',
                ownership_proof: null,
                rental_agreement: null,
                electricity_bill: null,
                property_registration: null,
                property_images: [],
                verified_by_admin_id: null,
                verified_at: null
            })
            .eq('id', id);
        if (error) throw new Error(error.message);

        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('user_id, email, name')
            .eq('id', docs.agent_id)
            .maybeSingle();
        if (agentError) throw new Error(agentError.message);
        if (agent) {
            const { data: insertedNotification, error: notificationError } = await supabase.from('notifications').insert([{
                user_id: agent.user_id,
                type: 'VERIFICATION_REUPLOAD',
                booking_id: docs.booking_id,
                listing_id: docs.listing_id,
                message: 'Admin requested you to re-upload documents. Reason: ' + (reason || 'Invalid documents'),
                is_read: false
            }]).select('*').maybeSingle();
            if (notificationError) throw new Error(notificationError.message);
            if (insertedNotification) {
                emitToUser(agent.user_id, 'notification:new', { notification: insertedNotification });
            }
            
            if (agent.email) {
                sendEmail({
                    to: agent.email,
                    subject: 'Action Required: Re-upload Verification Documents',
                    text: `Please re-upload verification documents. Reason: ${reason || 'Invalid documents'}`,
                    html: `<p>Please re-upload verification documents.</p><p>Reason: <strong>${reason || 'Invalid documents'}</strong></p>`
                }).catch(console.error);
            }
        }

        await logAdminAction(req.admin?.id, 'Requested reupload for property application', 'application', id);
        res.json({ message: 'Requested agent to reupload.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟣 4. BOOKING STATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getBookingStats = async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });

        const { data: bookingsList } = await supabase
            .from('bookings')
            .select(`
                id, created_at, payment_status,
                users!inner(email),
                agents!bookings_agent_id_fkey(name),
                listings!inner(title, city, cold_rent)
            `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        res.json({
            totalBookings: count,
            bookings: bookingsList || []
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 5. USERS MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getAllUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;

        let query = supabase
            .from('users')
            .select('id, name, email, phone, user_code, city, country, is_verified, created_at')
            .order('created_at', { ascending: false });

        if (search) {
            query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,user_code.ilike.%${search}%`);
        }

        const { data: users, error } = await query;
        if (error) throw new Error(error.message);

        // Enrich with agent info
        const enriched = await Promise.all((users || []).map(async (u) => {
            const { data: agent } = await supabase
                .from('agents')
                .select('id, verification_status')
                .eq('user_id', u.id)
                .maybeSingle();

            let userRole = 'user';
            if (agent) userRole = 'agent';

            // Check admin table too
            const { data: adminCheck } = await supabase
                .from('admins')
                .select('id')
                .eq('id', u.id)
                .maybeSingle();
            if (adminCheck) userRole = 'admin';

            return {
                ...u,
                role: userRole,
                agent_id: agent?.id || null,
                agent_status: agent?.verification_status || null
            };
        }));

        // Filter by role if specified
        let result = enriched;
        if (role) {
            result = result.filter(u => u.role === role);
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !user) return res.status(404).json({ message: 'User not found' });

        const { data: agent } = await supabase
            .from('agents')
            .select('*')
            .eq('user_id', id)
            .maybeSingle();

        res.json({ ...user, agent: agent || null });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.id;
        delete updates.password; // Don't allow password changes this way

        const { error } = await supabase.from('users').update(updates).eq('id', id);
        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, 'Updated user', 'user', id);
        res.json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.suspendUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('users').update({ is_verified: false }).eq('id', id);
        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, 'Suspended user', 'user', id);
        res.json({ message: 'User suspended' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Delete agent profile first if exists
        await supabase.from('agents').delete().eq('user_id', id);
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, 'Deleted user', 'user', id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 6. PROPERTY VERIFICATION REQUESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getVerificationRequests = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('property_verification_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateVerificationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'completed' or 'rejected'

        const { error } = await supabase
            .from('property_verification_requests')
            .update({
                verification_status: status,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, `Verification ${status}`, 'verification', id);
        res.json({ message: `Verification marked as ${status}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 7. PAYMENTS & REVENUE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getPayments = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                id, payment_status, created_at,
                users!inner(id, email, user_code),
                listings!inner(id, title, city),
                agents!inner(name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        const mapped = (data || []).map(b => ({
            id: b.id,
            user_id: b.users?.id,
            user_email: b.users?.email,
            user_code: b.users?.user_code,
            listing_id: b.listings?.id,
            listing_title: b.listings?.title,
            agent_name: b.agents?.name,
            amount: 10, // €10 per booking
            payment_method: 'Mock Payment',
            payment_status: b.payment_status,
            created_at: b.created_at
        }));

        const totalRevenue = mapped.filter(p => p.payment_status === 'Paid').reduce((acc, p) => acc + p.amount, 0);

        res.json({ payments: mapped, totalRevenue });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.refundPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('bookings')
            .update({ payment_status: 'Refunded' })
            .eq('id', id);

        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, 'Refunded payment', 'booking', id);
        res.json({ message: 'Payment refunded' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 8. ACTIVITY LOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getActivityLog = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('admin_activity_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error && error.message.includes('Could not find the table')) {
            return res.json([]);
        } else if (error) {
            throw new Error(error.message);
        }
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 9. GLOBAL SEARCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ users: [], listings: [], tickets: [] });

        const [usersRes, listingsRes, ticketsRes] = await Promise.all([
            supabase.from('users').select('id, name, email, user_code').or(`email.ilike.%${q}%,name.ilike.%${q}%,user_code.ilike.%${q}%`).limit(10),
            supabase.from('listings').select('id, title, city, status').or(`title.ilike.%${q}%,city.ilike.%${q}%`).limit(10),
            supabase.from('support_tickets').select('id, subject, status').or(`subject.ilike.%${q}%`).limit(10)
        ]);

        res.json({
            users: usersRes.data || [],
            listings: listingsRes.data || [],
            tickets: ticketsRes.data || []
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 10. DATABASE MANAGER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ALLOWED_TABLES = ['users', 'agents', 'listings', 'property_verification_requests', 'agent_property_documents', 'bookings', 'support_tickets', 'contact_queries', 'admin_activity_log', 'platform_settings'];

exports.getDbTable = async (req, res) => {
    try {
        const { table } = req.params;
        if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ message: 'Table not allowed' });

        const { search } = req.query;
        let query = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(100);

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateDbRecord = async (req, res) => {
    try {
        const { table, id } = req.params;
        if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ message: 'Table not allowed' });

        const updates = req.body;
        delete updates.id;

        const { error } = await supabase.from(table).update(updates).eq('id', id);
        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, `Updated record in ${table}`, table, id);
        res.json({ message: 'Record updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteDbRecord = async (req, res) => {
    try {
        const { table, id } = req.params;
        if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ message: 'Table not allowed' });

        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw new Error(error.message);
        await logAdminAction(req.admin?.id, `Deleted record from ${table}`, table, id);
        res.json({ message: 'Record deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.exportTableCSV = async (req, res) => {
    try {
        const { table } = req.params;
        if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ message: 'Table not allowed' });

        const { data, error } = await supabase.from(table).select('*').limit(5000);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) return res.status(200).send('');

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                let val = row[h];
                if (val === null || val === undefined) return '';
                val = String(val).replace(/"/g, '""');
                return `"${val}"`;
            }).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${table}_export.csv`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 11. PLATFORM SETTINGS / EMERGENCY MODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getPlatformSettings = async (req, res) => {
    try {
        const { data, error } = await supabase.from('platform_settings').select('*');
        if (error && error.message.includes('Could not find the table')) {
            return res.json({ platform_enabled: 'true', registrations_enabled: 'true', listings_enabled: 'true', announcement: '' });
        } else if (error) {
            throw new Error(error.message);
        }

        // Convert to key-value object
        const settings = {};
        (data || []).forEach(s => { settings[s.key] = s.value; });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updatePlatformSettings = async (req, res) => {
    try {
        const updates = req.body; // { key: value, key: value }

        for (const [key, value] of Object.entries(updates)) {
            const { error } = await supabase
                .from('platform_settings')
                .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (error && error.message.includes('Could not find the table')) {
                return res.status(400).json({ message: 'platform_settings table does not exist. Please run the SQL in Supabase Editor.' });
            } else if (error) {
                throw new Error(error.message);
            }
        }

        await logAdminAction(req.admin?.id, 'Updated platform settings', 'settings', null, JSON.stringify(updates));
        res.json({ message: 'Settings updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟢 12. VERIFICATION REQUEST CREATION (User-facing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.createVerificationRequest = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { propertyId } = req.body;

        if (!propertyId) return res.status(400).json({ message: 'propertyId is required' });

        // Get listing
        const { data: listing, error: lErr } = await supabase
            .from('listings')
            .select('id, title')
            .eq('id', propertyId)
            .single();

        if (lErr || !listing) return res.status(404).json({ message: 'Property not found' });

        // Get user
        const { data: user, error: uErr } = await supabase
            .from('users')
            .select('id, name, email, phone')
            .eq('id', userId)
            .single();

        if (uErr || !user) return res.status(404).json({ message: 'User not found' });

        // Check if already requested
        const { data: existing } = await supabase
            .from('property_verification_requests')
            .select('id')
            .eq('property_id', propertyId)
            .eq('user_id', userId)
            .in('verification_status', ['pending', 'completed'])
            .maybeSingle();

        if (existing) return res.status(400).json({ message: 'Verification request already exists for this property' });

        // Insert
        const { data: request, error: insertErr } = await supabase
            .from('property_verification_requests')
            .insert([{
                property_id: propertyId,
                property_name: listing.title,
                user_id: userId,
                user_name: user.name || '',
                user_email: user.email,
                user_phone: user.phone || '',
                payment_status: 'paid',
                verification_status: 'pending'
            }])
            .select()
            .single();

        if (insertErr) throw new Error(insertErr.message);
        res.status(201).json({ message: 'Verification request created', id: request.id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
