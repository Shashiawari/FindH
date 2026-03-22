const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const supabase = require('../utils/supabaseClient');
const otpGenerator = require('otp-generator');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// ================= SEND RESET OTP =================
exports.sendResetOTP = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) return res.status(400).json({ message: 'Email is required' });

        // Check user exists
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(404).json({ message: 'No account found with this email' });
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

        await transporter.sendMail({
            from: `"FindH" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'FindH Password Reset Code',
            html: `<h2>Your password reset code: ${otp}</h2>
                   <p>This code will expire in 5 minutes. If you didn't request this, please ignore.</p>`
        });

        res.json({ message: 'Reset code sent successfully' });
    } catch (err) {
        console.error('RESET OTP ERROR:', err);
        res.status(500).json({ message: err.message });
    }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Verify OTP
        const { data: otpRecord, error } = await supabase
            .from('otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .single();

        if (error || !otpRecord) {
            return res.status(400).json({ message: 'Invalid reset code' });
        }

        if (new Date(otpRecord.expires_at) < new Date()) {
            return res.status(400).json({ message: 'Reset code expired' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('email', email);

        if (updateError) throw new Error(updateError.message);

        // Remove OTP
        await supabase.from('otps').delete().eq('email', email);

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('RESET PASSWORD ERROR:', err);
        res.status(500).json({ message: err.message });
    }
};
