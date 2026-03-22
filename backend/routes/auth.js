const express = require('express');
const router = express.Router();
const { registerUser, authUser, authAgent } = require('../controllers/authController');
const { sendResetOTP, resetPassword } = require('../controllers/passwordController');

router.post('/signup', registerUser);
router.post('/login', authUser);
router.post('/agent-login', authAgent);
router.post('/send-reset-otp', sendResetOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
