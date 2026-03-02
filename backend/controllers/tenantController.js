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

        let propertyImagesUrls = [];
        let ownershipUrl = null;
        let rentalAgreementUrl = null;
        let electricityBillUrl = null;

        // ================= ROOM IMAGES =================
        if (req.files?.images) {
            propertyImagesUrls = await Promise.all(
                req.files.images.map((file, i) =>
                    compressAndUpload(file.buffer, 'room-images', folderPath, `room_image_${i}.webp`, 1024)
                )
            );
        }

        // ================= DOCUMENT UPLOADS =================
        if (req.files?.ownershipProof) {
            ownershipUrl = await compressAndUpload(req.files.ownershipProof[0].buffer, 'documents', folderPath, 'ownership_proof.webp', 1024);
        }
        if (req.files?.rentalAgreement) {
            rentalAgreementUrl = await compressAndUpload(req.files.rentalAgreement[0].buffer, 'documents', folderPath, 'rental_agreement.webp', 1024);
        }
        if (req.files?.electricityBill) {
            electricityBillUrl = await compressAndUpload(req.files.electricityBill[0].buffer, 'documents', folderPath, 'electricity_bill.webp', 1024);
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
            email: data.email, // Reusing email from body as old model required it
            country: data.country,
            city: data.city,
            state: data.state,
            address1: data.address1,
            address2: data.address2,
            postal_code: data.zipCode || '00000', // Mocking if missing
            lat: lat,
            lng: lng,
            cold_rent: parseFloat(data.coldRent) || 0,
            warm_rent: parseFloat(data.warmRent) || 0,
            persons_sharing: parseInt(data.personsSharing) || 0,
            rental_date: data.availabilityDate || data.rentalDate || new Date().toISOString(),
            parking: data.parking === 'true' || data.parking === true,
            rules: data.rules,
            status: 'Pending',
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
        const mappedListings = listings.map(l => ({
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
            images: (l.property_images || []).map(toPublicUrl).filter(Boolean),
            status: l.status,
            tenantId: l.tenant_id,
            createdAt: l.created_at
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
        const { data: verifications } = await supabase
            .from('agent_property_documents')
            .select('verification_status')
            .eq('listing_id', id)
            .eq('verification_status', 'approved')
            .limit(1);

        const isVerified = verifications && verifications.length > 0;

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
            images: (l.property_images || []).map(toPublicUrl).filter(Boolean),
            status: l.status,
            tenantId: l.tenant_id,
            isVerified
        };

        res.json(mappedListing);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};