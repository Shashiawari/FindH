require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');   // 🔥 ADD THIS

const app = express();

// ==============================
// GLOBAL ERROR HANDLERS
// ==============================
process.on('uncaughtException', (err) => {
    console.error("UNCAUGHT EXCEPTION 💥");
    console.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error("UNHANDLED PROMISE REJECTION 💥");
    console.error(err);
    process.exit(1);
});

// ==============================
// STRIPE WEBHOOK
// ==============================
app.use('/api/bookings/webhook', express.raw({ type: 'application/json' }));

// ==============================
// MIDDLEWARE
// ==============================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static('uploads'));

// ==============================
// ROUTES
// ==============================
app.use('/api/files', require('./routes/files'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/tenants', require('./routes/tenant'));
app.use('/api', require('./routes/api'));

app.get('/', (req, res) => {
    res.send("FindH Backend Running 🚀");
});

// ==============================
// 🔥 CREATE REAL SERVER
// ==============================
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ==============================
// START SERVER
// ==============================
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});