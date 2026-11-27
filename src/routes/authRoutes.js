const router = require('express').Router();
const c = require('../controllers/authController');
const v = require('../validators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.post('/register', v.register, validate, c.register); // patient self-registration + WhatsApp OTP
router.post('/verify-otp', v.verifyOtp, validate, c.verifyOtp);
router.post('/resend-otp', v.resendOtp, validate, c.resendOtp);
router.post('/login', v.login, validate, c.login);
router.get('/me', protect, c.me);

module.exports = router;
