const supabase = require('../utils/supabaseClient');

exports.createBooking = async (req, res) => {
    try {
        const { agentId, listingId } = req.body;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: 'Must be logged in to book' });

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
