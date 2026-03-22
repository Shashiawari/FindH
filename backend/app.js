require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/booking');
const contactRoutes = require('./routes/contact');
const filesRoutes = require('./routes/files');
const otpRoutes = require('./routes/otp');
const profileRoutes = require('./routes/profile');
const reviewRoutes = require('./routes/review');
const supportRoutes = require('./routes/support');
const tenantRoutes = require('./routes/tenant');
const verificationRoutes = require('./routes/verification');
const apiRoutes = require('./routes/api');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://findh.vercel.app',
  'https://findhfrontend.vercel.app',
  'https://findh-frontend.vercel.app'
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'FindH backend'
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled app error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

module.exports = app;
