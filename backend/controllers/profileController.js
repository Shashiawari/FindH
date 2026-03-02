const supabase = require('../utils/supabaseClient');

// ==========================
// GET PROFILE OVERVIEW
// ==========================
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user
        const { data: user, error: uErr } = await supabase
            .from('users')
            .select('id, email, user_code, city, state, country, address1, phone, created_at')
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
// INCOMING VERIFICATION REQUESTS (Agent Inbox)
// ==========================
exports.getAgentRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        // First find this user's agent profile
        const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!agent) return res.json([]);

        // Find all bookings where this agent is assigned
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                id, payment_status, verification_status, created_at,
                listing_id,
                listings!inner(id, title, address1, city),
                users!inner(email, user_code)
            `)
            .eq('agent_id', agent.id)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Fetch docs for each booking
        const enriched = await Promise.all(bookings.map(async (b) => {
            const { data: docs } = await supabase
                .from('agent_property_documents')
                .select('id, verification_status, ownership_proof, rental_agreement, electricity_bill, property_registration')
                .eq('agent_id', agent.id)
                .eq('listing_id', b.listing_id)
                .single();

            return {
                bookingId: b.id,
                paymentStatus: b.payment_status,
                verificationStatus: b.verification_status,
                createdAt: b.created_at,
                listing: b.listings,
                tenant: b.users,
                docs: docs || null,
                agentId: agent.id
            };
        }));

        res.json(enriched);
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
// EARNINGS (Completed verifications count)
// ==========================
exports.getEarnings = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!agent) return res.json({ total: 0, verifications: [] });

        const { data: docs, error } = await supabase
            .from('agent_property_documents')
            .select('id, verification_status, created_at, listings!inner(title, city)')
            .eq('agent_id', agent.id)
            .eq('verification_status', 'approved')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        res.json({
            total: docs?.length || 0,
            verifications: docs || []
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// UPDATE SETTINGS
// ==========================
exports.updateSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { address1, city, state, country, phone } = req.body;

        const { error } = await supabase
            .from('users')
            .update({ address1, city, state, country, phone })
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

        // Verify agent
        const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!agent) return res.status(403).json({ message: 'You are not registered as an agent' });

        // Get booking
        const { data: booking } = await supabase
            .from('bookings')
            .select('agent_id, listing_id')
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

        // Upsert agent_property_documents
        const { error: upsertErr } = await supabase
            .from('agent_property_documents')
            .upsert([{
                agent_id: agent.id,
                listing_id: booking.listing_id,
                ownership_proof: ownershipProof,
                rental_agreement: rentalAgreement,
                electricity_bill: electricityBill,
                property_registration: propertyRegistration,
                property_images: propertyImages.filter(Boolean),
                verification_status: 'pending'
            }], { onConflict: 'agent_id, listing_id' });

        if (upsertErr) throw new Error(upsertErr.message);
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
                listings!inner(title, city, address1),
                agents!inner(id, name, user_id, users!inner(user_code, email))
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // For each booking, get docs only if approved
        const withDocs = await Promise.all((bookings || []).map(async (b) => {
            const { data: docs } = await supabase
                .from('agent_property_documents')
                .select('verification_status, ownership_proof, rental_agreement, electricity_bill, property_registration, property_images')
                .eq('agent_id', b.agents?.id)
                .eq('listing_id', b.listings?.id)
                .eq('verification_status', 'approved')
                .single();

            return {
                bookingId: b.id,
                listing: b.listings,
                agent: b.agents,
                approvedDocs: docs || null
            };
        }));

        res.json(withDocs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
