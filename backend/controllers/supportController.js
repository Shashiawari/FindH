const supabase = require('../utils/supabaseClient');

// ==========================
// USER: Submit a support ticket
// ==========================
exports.submitTicket = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Must be logged in to submit a ticket' });

        const { category, subject, message } = req.body;

        // Validation
        if (!category || !subject || !message) {
            return res.status(400).json({ message: 'Category, subject, and message are required' });
        }
        const validCategories = ['Payment', 'Booking', 'Account', 'Other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ message: `Category must be one of: ${validCategories.join(', ')}` });
        }
        if (subject.trim().length < 5) {
            return res.status(400).json({ message: 'Subject must be at least 5 characters' });
        }
        if (message.trim().length < 10) {
            return res.status(400).json({ message: 'Message must be at least 10 characters' });
        }

        const { error } = await supabase
            .from('support_tickets')
            .insert([{
                user_id: userId,
                category: category.trim(),
                subject: subject.trim(),
                message: message.trim(),
                status: 'open'
            }]);

        if (error) throw new Error(error.message);

        res.status(201).json({ message: 'Support ticket submitted successfully. Our team will review it shortly.' });
    } catch (err) {
        console.error('Support ticket error:', err);
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// USER: Get my tickets
// ==========================
exports.getMyTickets = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Must be logged in' });

        const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================
// ADMIN: Get all tickets
// ==========================
exports.getAllTickets = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, users!user_id(email, user_code)')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
