const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const connectDB = require('./config/db');

const app = express();

// Behind Vercel's proxy: needed for correct client IPs (rate limiting)
app.set('trust proxy', 1);

app.use(helmet());
// CLIENT_URL may hold several origins, comma separated (no trailing slash)
const origins = (process.env.CLIENT_URL || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Brute-force protection on auth endpoints
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.get('/', (req, res) => res.json({ success: true, message: 'AI Clinic Management API is running' }));
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

// Ensure MongoDB is connected before any API route runs (works with any entry point, incl. Vercel).
// The connection is cached, so this is a no-op after the first request.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(503).json({ success: false, message: 'Database unavailable. Please try again shortly.' });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
