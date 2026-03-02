const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabaseClient');

// ================= USER =================
const protect = async (req, res, next) => {

    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            message: 'Not authorized, no token'
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'secretkey'
        );

        // V3 Role Checks
        if (decoded.role !== 'user' && decoded.role !== 'agent') {
            return res.status(403).json({ message: 'Unauthorized role.' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('id,email,is_verified')
            .eq('id', decoded.id)
            .maybeSingle();   // 🔥 FIXED

        if (error || !user) {
            return res.status(401).json({
                message: 'User not found'
            });
        }

        // Inject user and role back into request
        req.user = user;
        if (decoded.role === 'agent') {
            const { data: agentData } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
            if (agentData) req.user.agentId = agentData.id;
        }

        return next();

    } catch (err) {

        console.error("Auth Error:", err.message);
        return res.status(401).json({
            message: 'Token invalid'
        });
    }
};


// ================= ADMIN =================
const protectAdmin = async (req, res, next) => {

    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            message: 'Admin token missing'
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'secretkey'
        );

        // V3 Role Requirement
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied: Admin role required' });
        }

        const { data: admin, error } = await supabase
            .from('admins')
            .select('id,admin_id')
            .eq('id', decoded.id)
            .maybeSingle();  // 🔥 FIXED

        if (error || !admin) {
            return res.status(403).json({
                message: 'Admin not authorized'
            });
        }

        req.admin = admin;
        return next();

    } catch (err) {

        console.error("Admin Auth Error:", err.message);
        return res.status(401).json({
            message: 'Invalid admin token'
        });
    }
};

module.exports = { protect, protectAdmin };