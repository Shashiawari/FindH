const supabase = require('../utils/supabaseClient');

// ==========================
// PUBLIC: Submit a contact query (no login required)
// ==========================
exports.submitContactQuery = async (req, res) => {
    try {
        const { email, message } = req.body;

        // Validation
        if (!email || !message) {
            return res.status(400).json({ message: 'Email and message are required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        if (message.trim().length < 10) {
            return res.status(400).json({ message: 'Message must be at least 10 characters' });
        }

        const { error } = await supabase
            .from('contact_queries')
            .insert([{ email: email.trim().toLowerCase(), message: message.trim() }]);

        if (error) throw new Error(error.message);

        res.status(201).json({ message: 'Your query has been submitted successfully. We will get back to you soon!' });
    } catch (err) {
        console.error('Contact query error:', err);
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// ADMIN: Get all contact queries
// ==========================
exports.getAllContactQueries = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contact_queries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
