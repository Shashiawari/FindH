const supabase = require('../utils/supabaseClient');
const { geocodeAddress } = require('../utils/geocoder');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper to upload a buffer to Supabase
const uploadFile = async (file, agentId, docType) => {
    if (!file) return null;
    const ext = file.originalname.split('.').pop();
    const filePath = `agents/${agentId}/${docType}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });

    if (error) throw new Error(`Upload Failed for ${docType}: ${error.message}`);
    return filePath;
};

// ==========================
// CREATE AGENT (Base Profile Only)
// ==========================
exports.createAgent = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Authentication required to become an agent' });
        }

        // Check if this user already has an agent profile
        const { data: existingAgent } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (existingAgent) {
            return res.status(400).json({ message: 'You already have an agent profile. Check your profile for KYC status.' });
        }

        // ================= FETCH USER DETAILS FROM PROFILE =================
        const { data: userProfile, error: userErr } = await supabase
            .from('users')
            .select('name, email, phone, address1, city, state, country, postal_code')
            .eq('id', userId)
            .single();

        if (userErr || !userProfile) {
            console.error(userErr);
            return res.status(400).json({ message: 'Could not load your profile details. Please update your profile settings first.' });
        }

        const agentId = crypto.randomUUID();

        // ================= GEO LOCATION (using user profile address) =================
        const addressString = [
            userProfile.address1, userProfile.city, userProfile.state, userProfile.country
        ].filter(Boolean).join(', ');

        let lat = null, lng = null;
        try {
            const coords = await geocodeAddress(addressString);
            lat = coords.lat;
            lng = coords.lng;
        } catch (geoError) {
            console.warn("Geocoding failed, continuing without coords: ", geoError.message);
        }

        // ================= FILE UPLOADS =================
        const files = req.files || {};

        const selfiePath = await uploadFile(files['selfie']?.[0], agentId, 'selfie');
        const idFrontPath = await uploadFile(files['idFront']?.[0], agentId, 'id_front');
        const idBackPath = await uploadFile(files['idBack']?.[0], agentId, 'id_back');
        const studentCertPath = await uploadFile(files['studentCertificate']?.[0], agentId, 'student_cert');
        const studentIdPhotoPath = await uploadFile(files['studentIDPhoto']?.[0], agentId, 'student_id');

        // ================= SAVE TO SUPABASE =================
        const { data: newAgent, error: insertError } = await supabase
            .from('agents')
            .insert([{
                id: agentId,
                user_id: userId,
                name: userProfile.name || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
                agent_type: data.agentType,
                country: userProfile.country || '',
                state: userProfile.state || '',
                city: userProfile.city || '',
                address1: userProfile.address1 || '',
                postal_code: userProfile.postal_code || '00000',
                lat,
                lng,
                id_type: data.idType,
                id_number: data.idNumber,
                university: data.university,
                matric_number: data.matricNumber,
                selfie: selfiePath,
                id_front: idFrontPath,
                id_back: idBackPath,
                student_certificate: studentCertPath,
                student_id_photo: studentIdPhotoPath,
                verification_status: 'Pending'
            }])
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        res.status(201).json({
            message: 'Agent profile created. You can now build property portfolios.',
            agentId: newAgent.id,
            _id: newAgent.id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// ==========================
// PUBLIC API (GUEST)
// ==========================
// Fetch agents who have at least ONE approved property nearby.
exports.getPublicNearbyAgents = async (req, res) => {
    try {
        const { data: tenantListing, error: tErr } = await supabase
            .from('listings')
            .select('city, lat, lng')
            .eq('id', req.params.tenantId)
            .single();

        if (tErr || !tenantListing) return res.status(404).json({ message: 'Tenant listing not found' });

        // Step 1: Find agents who are fully KYC Verified in the same city as the listing
        const { data: agents, error: aErr } = await supabase
            .from('agents')
            .select('id, name, agent_type, city, country, verified_badge, selfie')
            .eq('verification_status', 'Verified')
            .eq('city', tenantListing.city);

        if (aErr) throw new Error(aErr.message);

        // Map for frontend
        const mapped = agents.map(a => ({
            _id: a.id,
            name: a.name,
            agentType: a.agent_type,
            city: a.city,
            country: a.country,
            verifiedBadge: a.verified_badge,
            selfie: a.selfie
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================
// PRIVATE API (LOGGED IN)
// ==========================
// Exact same logic as public for now, as docs are no longer stored on the agent profile.
exports.getPrivateNearbyAgents = exports.getPublicNearbyAgents;

// ==========================
// GET SINGLE AGENT 
// ==========================
exports.getAgentById = async (req, res) => {
    try {
        const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !agent) return res.status(404).json({ message: 'Agent not found' });

        // Map for legacy frontend
        const mapped = {
            _id: agent.id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            agentType: agent.agent_type,
            city: agent.city,
            state: agent.state,
            country: agent.country,
            address1: agent.address1,
            address2: agent.address2,
            verifiedBadge: agent.verified_badge
        };

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};