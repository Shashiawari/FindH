const supabase = require('../utils/supabaseClient');
const sharp = require('sharp');
const crypto = require('crypto');

// Helper: compress and upload directly to Supabase Storage path
const compressAndUpload = async (buffer, folderPath, filename, width) => {
    try {
        const webpBuffer = await sharp(buffer).resize(width).webp({ quality: 60 }).toBuffer();
        const fullPath = `${folderPath}/${crypto.randomUUID()}_${filename}`;

        const { error } = await supabase.storage
            .from('documents')
            .upload(fullPath, webpBuffer, {
                contentType: 'image/webp',
                upsert: false
            });

        if (error) throw error;
        return fullPath;
    } catch (err) {
        console.error("Supabase Upload Error:", err);
        throw err;
    }
};

// ==========================
// AGENT DASHBOARD STATS
// ==========================
exports.getAgentStats = async (req, res) => {
    try {
        const agentId = req.user?.agentId; // Auth middleware must attach agentId after linking
        if (!agentId) return res.status(403).json({ message: 'Not identified as an Agent' });

        // 1. Get assigned listings (where agent_property_documents exists)
        const { data: assigned, error: aErr } = await supabase
            .from('agent_property_documents')
            .select(`
                listing_id, 
                verification_status,
                rejection_reason,
                listings ( id, title, city, status )
            `)
            .eq('agent_id', agentId);

        if (aErr) throw new Error(aErr.message);

        // 2. Count requests
        const { data: requests, error: rErr } = await supabase
            .from('requests')
            .select('id, listing_id')
            .eq('agent_id', agentId);

        if (rErr) throw new Error(rErr.message);

        const stats = {
            totalTenants: requests.length,
            assignedListings: assigned,
            bookingsPerListing: requests.reduce((acc, r) => {
                acc[r.listing_id] = (acc[r.listing_id] || 0) + 1;
                return acc;
            }, {})
        };

        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// UPLOAD DOCUMENTS FOR A LISTING
// ==========================
exports.uploadListingDocuments = async (req, res) => {
    try {
        const agentId = req.user?.agentId;
        const { listingId } = req.body;

        if (!agentId) return res.status(403).json({ message: 'Not identified as an Agent' });
        if (!listingId) return res.status(400).json({ message: 'Listing ID required' });

        const folderPath = `agents/${agentId}/${listingId}`;
        const payload = {
            agent_id: agentId,
            listing_id: listingId,
            verification_status: 'pending' // Reset to pending automatically
        };

        // Arrays
        if (req.files?.propertyImages) {
            payload.property_images = await Promise.all(
                req.files.propertyImages.map((file, i) =>
                    compressAndUpload(file.buffer, folderPath, `property_img_${i}.webp`, 1024)
                )
            );
        }

        // Single files
        const singleDocs = [
            { field: 'idFront', w: 800, file: 'id_front' },
            { field: 'idBack', w: 800, file: 'id_back' },
            { field: 'selfie', w: 600, file: 'selfie' },
            { field: 'ownershipProof', w: 1024, file: 'ownership_proof' },
            { field: 'rentalAgreement', w: 1024, file: 'rental_agreement' },
            { field: 'electricityBill', w: 1024, file: 'electricity_bill' },
            { field: 'propertyRegistration', w: 1024, file: 'property_registration' }
        ];

        for (const doc of singleDocs) {
            if (req.files?.[doc.field]) {
                payload[doc.file] = await compressAndUpload(
                    req.files[doc.field][0].buffer, folderPath, `${doc.file}.webp`, doc.w
                );
            }
        }

        // Upsert into agent_property_documents
        // We use UPSERT in case this is a "resubmission" after rejection
        const { error: upsertError } = await supabase
            .from('agent_property_documents')
            .upsert(payload, { onConflict: 'agent_id,listing_id' });

        if (upsertError) throw new Error(upsertError.message);

        res.status(200).json({ message: 'Documents uploaded successfully. Pending verification.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};
