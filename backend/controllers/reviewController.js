const supabase = require('../utils/supabaseClient');

// POST /api/reviews - Create a review (authenticated)
exports.createReview = async (req, res) => {
    try {
        const { agentId, rating, comment } = req.body;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: 'Must be logged in to review' });
        if (!agentId || !rating || !comment) {
            return res.status(400).json({ message: 'agentId, rating, and comment are required' });
        }

        // Check for existing review
        const { data: existing } = await supabase
            .from('reviews')
            .select('id')
            .eq('user_id', userId)
            .eq('agent_id', agentId)
            .single();

        if (existing) {
            return res.status(400).json({ message: 'You have already reviewed this agent' });
        }

        const { data: review, error } = await supabase
            .from('reviews')
            .insert([{
                user_id: userId,
                agent_id: agentId,
                rating: Number(rating),
                comment
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        res.status(201).json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/reviews/:agentId - Get all reviews for an agent
exports.getAgentReviews = async (req, res) => {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                users ( email )
            `)
            .eq('agent_id', req.params.agentId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Map for frontend compatibility
        const mappedReviews = reviews.map(r => ({
            _id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
            user: { email: r.users?.email }
        }));

        const totalReviews = mappedReviews.length;
        const averageRating = totalReviews > 0
            ? (mappedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
            : 0;

        res.json({ reviews: mappedReviews, totalReviews, averageRating: Number(averageRating) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
