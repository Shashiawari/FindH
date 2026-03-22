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

    // Input validation
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

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

    // Input validation
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    try {
        const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error && error.code !== 'PGRST116') throw new Error(error.message);

        if (user && (await bcrypt.compare(password, user.password))) {
            const { data: agent } = await supabase.from('agents').select('verification_status').eq('user_id', user.id).maybeSingle();

            res.json({
                _id: user.id,
                name: user.name || '',
                email: user.email,
                user_code: user.user_code,
                city: user.city,
                country: user.country,
                agentVerificationStatus: agent?.verification_status || null,
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

// @route   POST /api/auth/agent-login
exports.authAgent = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (userError) throw new Error(userError.message);
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) return res.status(401).json({ message: 'Invalid email or password' });

        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('id, name, email, city, country, verification_status')
            .eq('user_id', user.id)
            .maybeSingle();

        if (agentError) throw new Error(agentError.message);
        if (!agent) return res.status(403).json({ message: 'No agent profile found for this account.' });

        res.json({
            _id: user.id,
            agentId: agent.id,
            name: user.name || agent.name || '',
            email: user.email,
            city: user.city || agent.city || '',
            country: user.country || agent.country || '',
            verificationStatus: agent.verification_status || 'Pending',
            token: generateToken(user.id, 'agent'),
            role: 'agent'
        });
    } catch (error) {
        console.log("AGENT LOGIN ERROR ======>", error);
        res.status(500).json({ message: error.message });
    }
};
