const supabase = require('../utils/supabaseClient');

exports.createBooking = async (req, res) => {
    try {
        const { agentId, listingId } = req.body;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: 'Must be logged in to book' });
        if (!agentId || !listingId) return res.status(400).json({ message: 'agentId and listingId are required' });

        // 0a. Prevent agent from booking themselves
        const { data: agentRecord } = await supabase
            .from('agents')
            .select('user_id')
            .eq('id', agentId)
            .single();

        if (agentRecord && agentRecord.user_id === userId) {
            return res.status(403).json({ message: 'You cannot book yourself as an agent.' });
        }

        // 0b. Prevent duplicate bookings for the same user + agent + listing
        const { data: existingBooking } = await supabase
            .from('bookings')
            .select('id, payment_status')
            .eq('user_id', userId)
            .eq('agent_id', agentId)
            .eq('listing_id', listingId)
            .in('payment_status', ['Pending', 'Paid'])
            .maybeSingle();

        if (existingBooking) {
            return res.status(400).json({ message: 'You already have an active booking for this listing with this agent.' });
        }

        // 1. Create pending booking
        const { data: booking, error: insertErr } = await supabase
            .from('bookings')
            .insert([{
                user_id: userId,
                agent_id: agentId,
                listing_id: listingId,
                payment_status: 'Pending'
            }])
            .select()
            .single();

        if (insertErr) throw new Error(insertErr.message);

        // 2. Create the Property-Level Verification mapping (agent_property_documents)
        const { error: apdErr } = await supabase
            .from('agent_property_documents')
            .upsert([{
                agent_id: agentId,
                listing_id: listingId,
                verification_status: 'pending',
                payment_status: 'pending'
            }], { onConflict: 'agent_id, listing_id' });

        if (apdErr) throw new Error(apdErr.message);

        // Return the booking ID to process the mock payment
        res.status(201).json({ id: booking.id, message: 'Booking initialized' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

exports.mockPay = async (req, res) => {
    try {
        const { bookingId } = req.params;

        // 1. Update Application Status to Paid
        const { data: booking, error: bErr } = await supabase
            .from('bookings')
            .update({ payment_status: 'Paid' })
            .eq('id', bookingId)
            .select('agent_id, listing_id')
            .single();

        if (bErr || !booking) return res.status(404).json({ message: 'Booking record missing' });

        // 2. Wake up the Agent Property mapping to flag Admin Dashboard Tab 3 that it holds a PAID booking
        const { error: pErr } = await supabase
            .from('agent_property_documents')
            .update({ verification_status: 'pending' })
            .match({ agent_id: booking.agent_id, listing_id: booking.listing_id });

        if (pErr) throw new Error(pErr.message);

        res.json({ message: 'Mock Payment successful. Documents awaiting upload.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

exports.getMyBookingForListing = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { listingId } = req.params;

        const { data: booking } = await supabase
            .from('bookings')
            .select('id, payment_status, agent_id, created_at')
            .eq('user_id', userId)
            .eq('listing_id', listingId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        res.json(booking || null);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// GET AGENT DOCS FOR TENANT
// ==========================
exports.getAgentDocsForTenant = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Must be logged in' });

        // Query approved documents directly from agent_property_documents,
        // scoped by the tenant's own bookings.
        const { data: approvedDocs, error: docsError } = await supabase
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
                bookings!inner(id, user_id, listing_id),
                agents ( name, email ),
                listings ( title, city, address1 )
            `)
            .eq('bookings.user_id', userId)
            .eq('verification_status', 'approved')
            .order('created_at', { ascending: false });

        if (docsError) throw new Error(docsError.message);
        if (!approvedDocs || approvedDocs.length === 0) return res.json([]);

        const results = [];

        for (const apd of approvedDocs) {
            const docFields = [
                { key: 'ownership_proof', label: 'Ownership Proof' },
                { key: 'rental_agreement', label: 'Rental Agreement' },
                { key: 'electricity_bill', label: 'Electricity Bill' },
                { key: 'property_registration', label: 'Property Registration' },
            ];

            for (const { key, label } of docFields) {
                if (apd[key]) {
                    results.push({
                        bookingId: apd.booking_id || apd.bookings?.id,
                        listingId: apd.listing_id || apd.bookings?.listing_id,
                        propertyTitle: apd.listings?.title || 'Unknown Property',
                        propertyCity: apd.listings?.city || '',
                        agentName: apd.agents?.name || 'Unknown Agent',
                        agentEmail: apd.agents?.email || '',
                        docName: label,
                        docPath: apd[key],
                        uploadedAt: apd.created_at,
                    });
                }
            }
        }

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};
