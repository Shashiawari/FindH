const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabaseClient');

// Middleware that accepts BOTH user tokens AND admin tokens
const protectAny = (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) return res.status(401).json({ message: 'Not authorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        // Accept user, agent, OR admin roles - anyone authenticated can fetch signed URLs
        if (!decoded.role) return res.status(403).json({ message: 'Invalid token' });
        req.decoded = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Token invalid or expired' });
    }
};

// GET /api/files/:path* — generate signed URL for private documents bucket
router.use(protectAny, async (req, res) => {
    try {
        // Remove '/api/files/' prefix
        const filePath = decodeURIComponent(req.originalUrl.replace(/^\/api\/files\//, '').split('?')[0]);

        if (!filePath) {
            return res.status(400).json({ message: 'File path is required' });
        }

        const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(filePath, 1800); // 30 minutes

        if (error) {
            console.error('Supabase Signed URL Error:', error.message, '| Path:', filePath);
            return res.status(404).json({ message: 'File not found or access denied', path: filePath });
        }

        return res.json({ signedUrl: data.signedUrl });

    } catch (err) {
        console.error('Signed URL Error:', err.message);
        return res.status(500).json({ message: 'Server error generating signed URL' });
    }
});

module.exports = router;