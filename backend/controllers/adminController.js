const supabase = require('../utils/supabaseClient');
const jwt = require('jsonwebtoken');

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
        res.json({ message: 'Agent KYC Approved' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.rejectAgentKYC = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch agent to get document paths
        const { data: agent, error: fetchErr } = await supabase.from('agents').select('*').eq('id', id).single();
        if (fetchErr || !agent) return res.status(404).json({ message: 'Agent not found' });

        // 2. Remove docs from storage
        const pathsToDelete = [agent.selfie, agent.id_front, agent.id_back, agent.student_certificate, agent.student_id_photo].filter(Boolean);
        if (pathsToDelete.length > 0) {
            await supabase.storage.from('documents').remove(pathsToDelete);
        }

        // 3. Delete agent so they can re-register KYC
        const { error: delErr } = await supabase.from('agents').delete().eq('id', id);
        if (delErr) throw new Error(delErr.message);

        res.json({ message: 'Agent KYC Rejected. Data purged.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟣 2. TENANT LISTINGS VISIBILITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getAllListings = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('listings')
            .select(`*, users!tenant_id(email)`)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateListingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Active' or 'Rejected'
        const { error } = await supabase.from('listings').update({ status }).eq('id', id);
        if (error) throw new Error(error.message);
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
        res.json({ message: 'Listing permanently deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟣 3. AGENT BOOKING + PROPERTY VERIFICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getPropertyApplications = async (req, res) => {
    try {
        // Get all property docs with agent and listing details
        const { data: docs, error } = await supabase
            .from('agent_property_documents')
            .select(`
                *,
                agents!inner(id, name, email, phone, user_id),
                listings!inner(id, title, address1, city)
            `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Enrich with tenant and agent user_code
        const enriched = await Promise.all((docs || []).map(async (doc) => {
            // Get the agent's user_code from users table
            let agent_user_code = null;
            if (doc.agents?.user_id) {
                const { data: agentUser } = await supabase
                    .from('users')
                    .select('user_code')
                    .eq('id', doc.agents.user_id)
                    .single();
                agent_user_code = agentUser?.user_code;
            }

            // Find the booking for this agent+listing to get tenant info
            const { data: booking } = await supabase
                .from('bookings')
                .select(`
                    id, payment_status,
                    users!inner(email, user_code)
                `)
                .eq('agent_id', doc.agent_id)
                .eq('listing_id', doc.listing_id)
                .order('created_at', { ascending: false })
                .limit(1)
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
        const { error } = await supabase
            .from('agent_property_documents')
            .update({
                verification_status: 'approved',
                verified_by_admin_id: adminId,
                verified_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw new Error(error.message);
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
        res.json({ message: 'Property application rejected and documents wiped.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🟣 4. BOOKING STATS (Tenant -> Agent -> Listing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getBookingStats = async (req, res) => {
    try {
        // Find how many total bookings exist overall
        const { count, error } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });

        // Complex joined stats
        const { data: bookingsList } = await supabase
            .from('bookings')
            .select(`
                id, created_at, payment_status,
                users!inner(email),
                agents!inner(name),
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
