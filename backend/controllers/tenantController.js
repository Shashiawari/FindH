const supabase = require('../utils/supabaseClient');
const { geocodeAddress } = require('../utils/geocoder');
const sharp = require('sharp');
const crypto = require('crypto');

// Convert a raw storage path → full public Supabase URL for room-images bucket
// Uses the native Supabase SDK method — guaranteed accurate regardless of env formatting
const toPublicUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('room-images').getPublicUrl(path);
    return data?.publicUrl || null;
};

// Helper: compress to webp buffer and upload to Supabase Storage
const compressAndUpload = async (buffer, bucketName, folderPath, filename, width) => {
    try {
        const webpBuffer = await sharp(buffer).resize(width).webp({ quality: 60 }).toBuffer();
        const fullPath = `${folderPath}/${crypto.randomUUID()}_${filename}`;

        const { error } = await supabase.storage
            .from(bucketName)
            .upload(fullPath, webpBuffer, {
                contentType: 'image/webp',
                upsert: false
            });

        if (error) throw error;

        // Return the storage path for the DB (not the public URL)
        return fullPath;
    } catch (err) {
        console.error("Supabase Upload Error:", err);
        throw err;
    }
};

exports.createTenant = async (req, res) => {
    try {
        const data = req.body;
        const tenantIdStr = req.user?.id; // Attached by auth middleware if logged in

        // Supabase listings require a UUID for listing_id. We'll generate one early so we have a folder path.
        const listingId = crypto.randomUUID();
        const folderPath = `listings/${listingId}`;

        // ================= ROOM IMAGES =================
        let propertyImagesUrls = [];
        if (req.files?.images) {
            propertyImagesUrls = await Promise.all(
                req.files.images.map((file, i) =>
                    compressAndUpload(file.buffer, 'room-images', folderPath, `room_image_${i}.webp`, 1024)
                )
            );
        }

        // ================= GEOLOCATION =================
        const addressString = [
            data.address1, data.address2, data.city, data.state, data.country
        ].filter(Boolean).join(', ');

        const { lat, lng } = await geocodeAddress(addressString);

        // ================= INSERT SQL =================
        const insertPayload = {
            id: listingId,
            tenant_id: tenantIdStr || null,
            title: data.title,
            email: data.email,
            country: data.country,
            city: data.city,
            state: data.state,
            address1: data.address1,
            address2: data.address2,
            postal_code: data.postalCode || data.zipCode || '00000',
            lat: lat,
            lng: lng,
            cold_rent: parseFloat(data.coldRent) || 0,
            warm_rent: parseFloat(data.warmRent) || 0,
            persons_sharing: parseInt(data.personsSharing) || 0,
            parking: data.parking === 'true' || data.parking === true,
            rules: data.rules,
            rental_date: data.rentalDate || null,
            status: 'Pending',
            property_images: propertyImagesUrls,
        };

        const { error: insertError } = await supabase
            .from('listings')
            .insert([insertPayload]);

        if (insertError) throw new Error(insertError.message);

        // Map _id for easy backwards validation
        res.status(201).json({ message: 'Room listing created successfully', tenantId: listingId, _id: listingId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.getAllTenants = async (req, res) => {
    try {
        const { data: listings, error } = await supabase
            .from('listings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Convert Postgres fields to camelCase to prevent massive React rewrites if possible
        const mappedListings = await Promise.all(listings.map(async (l) => {
            // Check verification from property_verification_requests
            const { data: pvr } = await supabase
                .from('property_verification_requests')
                .select('id')
                .eq('property_id', l.id)
                .eq('verification_status', 'completed')
                .limit(1);

            // Check verification from agent_property_documents
            const { data: apd } = await supabase
                .from('agent_property_documents')
                .select('id')
                .eq('listing_id', l.id)
                .eq('verification_status', 'approved')
                .limit(1);

            const isVerified = (pvr && pvr.length > 0) || (apd && apd.length > 0);

            return {
                _id: l.id,
                title: l.title,
                email: l.email,
                address1: l.address1,
                address2: l.address2,
                city: l.city,
                state: l.state,
                country: l.country,
                location: { coordinates: [l.lng, l.lat] },
                coldRent: l.cold_rent,
                warmRent: l.warm_rent,
                personsSharing: l.persons_sharing,
                images: l.property_images || [],
                status: l.status,
                tenantId: l.tenant_id,
                createdAt: l.created_at,
                isVerified
            };
        }));

        res.json(mappedListings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTenantById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: l, error } = await supabase
            .from('listings')
            .select(`*`)
            .eq('id', id)
            .single();

        if (error || !l) return res.status(404).json({ message: 'Listing not found' });

        // Check if ANY agent has successfully verified this property
        const { data: agentVerif } = await supabase
            .from('agent_property_documents')
            .select('verification_status')
            .eq('listing_id', id)
            .eq('verification_status', 'approved')
            .limit(1);

        // Also check property_verification_requests
        const { data: propVerif } = await supabase
            .from('property_verification_requests')
            .select('verification_status')
            .eq('property_id', id)
            .eq('verification_status', 'completed')
            .limit(1);

        const isVerified = (agentVerif && agentVerif.length > 0) || (propVerif && propVerif.length > 0);

        const mappedListing = {
            _id: l.id,
            title: l.title,
            email: l.email,
            address1: l.address1,
            address2: l.address2,
            city: l.city,
            state: l.state,
            country: l.country,
            location: { coordinates: [l.lng, l.lat] },
            coldRent: l.cold_rent,
            warmRent: l.warm_rent,
            personsSharing: l.persons_sharing,
            images: l.property_images || [],
            status: l.status,
            tenantId: l.tenant_id,
            createdAt: l.created_at,
            isVerified
        };

        res.json(mappedListing);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};