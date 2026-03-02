const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../utils/supabaseClient');

const generateToken = (id, role = 'user') => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secretkey', {
        expiresIn: '30m',
    });
};

// Generate a unique user code like FHX9282
const generateUserCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FH';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// @route   POST /api/auth/signup
exports.registerUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: userExists } = await supabase.from('users').select('id').eq('email', email).single();
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate unique user_code (retry on collision)
        let user_code, attempts = 0;
        while (attempts < 10) {
            user_code = generateUserCode();
            const { data: existing } = await supabase.from('users').select('id').eq('user_code', user_code).single();
            if (!existing) break;
            attempts++;
        }

        const { data: user, error: insertError } = await supabase
            .from('users')
            .insert([{ email, password: hashedPassword, user_code }])
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        res.status(201).json({
            _id: user.id,
            email: user.email,
            user_code: user.user_code,
            token: generateToken(user.id, 'user'),
            role: 'user'
        });
    } catch (error) {
        console.log("SIGNUP ERROR ======>", error);
        res.status(500).json({ message: error.message });
    }
};

// @route   POST /api/auth/login
exports.authUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error && error.code !== 'PGRST116') throw new Error(error.message);

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user.id,
                email: user.email,
                user_code: user.user_code,
                city: user.city,
                country: user.country,
                token: generateToken(user.id, 'user'),
                role: 'user'
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.log("LOGIN ERROR ======>", error);
        res.status(500).json({ message: error.message });
    }
};
