const { body, param } = require('express-validator');

const objectId = (field, where = body) =>
  where(field).isMongoId().withMessage(`${field} must be a valid id`);

exports.idParam = [param('id').isMongoId().withMessage('Invalid id')];

exports.register = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('age').isInt({ min: 0, max: 130 }).withMessage('Age must be between 0 and 130'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female or other'),
  body('contact')
    .trim()
    .matches(/^\+?[\d\s-]{10,16}$/)
    .withMessage('Contact must be a valid WhatsApp number (e.g. 03001234567 or +923001234567)'),
];

exports.verifyOtp = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
];

exports.resendOtp = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

exports.login = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.createStaff = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['doctor', 'receptionist']).withMessage('Role must be doctor or receptionist'),
  body('specialization').optional().trim(),
];

exports.updateUser = [
  body('name').optional().trim().notEmpty(),
  body('isActive').optional().isBoolean(),
  body('subscriptionPlan').optional().isIn(['free', 'pro']),
  body('specialization').optional().trim(),
];

exports.createPatient = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('age').isInt({ min: 0, max: 130 }).withMessage('Age must be between 0 and 130'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female or other'),
  body('contact').trim().notEmpty().withMessage('Contact is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

exports.updatePatient = [
  body('name').optional().trim().notEmpty(),
  body('age').optional().isInt({ min: 0, max: 130 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('contact').optional().trim().notEmpty(),
  body('email').optional({ checkFalsy: true }).isEmail(),
];

exports.bookAppointment = [
  body('patientId').optional().isMongoId().withMessage('patientId must be a valid id'),
  objectId('doctorId'),
  body('date').isISO8601().withMessage('date must be a valid ISO date').toDate(),
  body('reason').optional().trim(),
];

exports.updateStatus = [
  body('status')
    .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('diagnosis').optional().trim(),
];

exports.createPrescription = [
  objectId('patientId'),
  body('appointmentId').optional().isMongoId(),
  body('diagnosis').optional().trim(),
  body('medicines').isArray({ min: 1 }).withMessage('At least one medicine is required'),
  body('medicines.*.name').trim().notEmpty().withMessage('Medicine name is required'),
  body('medicines.*.dosage').trim().notEmpty().withMessage('Medicine dosage is required'),
  body('instructions').optional().trim(),
];
