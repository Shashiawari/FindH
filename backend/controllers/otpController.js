const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../utils/supabaseClient');

// JWT TOKEN
const generateToken = (id) => {
    return jwt.sign({ id, role: 'user' }, process.env.JWT_SECRET, {
        expiresIn: '30m',
    });
};

// Generate unique user code like FHX9282
const generateUserCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FH';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
};

// SMTP TRANSPORTER
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// ================= SEND OTP =================

exports.sendOTP = async (req, res) => {
    const { email } = req.body;

    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(500).json({
                message: "SMTP not configured. Cannot send OTP email."
            });
        }

        const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false,
        });

        // Remove old OTP
        await supabase.from('otps').delete().eq('email', email);

        // Save OTP with expiry (5 mins)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const { error: insertError } = await supabase
            .from('otps')
            .insert([{ email, otp, expires_at: expiresAt }]);

        if (insertError) throw new Error(insertError.message);

        const mailOptions = {
            from: `"FindH" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'FindH Verification Code',
            html: `<h2>Your OTP is: ${otp}</h2>
                   <p>This OTP will expire in 5 minutes.</p>`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent successfully' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ================= VERIFY OTP =================

exports.verifyOTP = async (req, res) => {
    const { email, password, otp, address1, city, state, country } = req.body;

    try {
        const { data: otpRecord, error } = await supabase
            .from('otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .single();

        if (error || !otpRecord) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date(otpRecord.expires_at) < new Date()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 🔐 HASH PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique user_code
        let user_code, attempts = 0;
        while (attempts < 10) {
            user_code = generateUserCode();
            const { data: existing } = await supabase.from('users').select('id').eq('user_code', user_code).single();
            if (!existing) break;
            attempts++;
        }

        const { data: user, error: insertError } = await supabase
            .from('users')
            .insert([{ email, password: hashedPassword, is_verified: true, user_code, address1, city, state, country }])
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        // Remove OTP
        await supabase.from('otps').delete().eq('email', email);

        res.status(201).json({
            _id: user.id,
            email: user.email,
            user_code: user.user_code,
            city: user.city,
            country: user.country,
            token: generateToken(user.id),
            role: 'user'
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};