const User = require('../models/User');
const Patient = require('../models/Patient');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { issueOtp, checkOtp } = require('../utils/otp');

const userPayload = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  subscriptionPlan: u.subscriptionPlan,
  patientProfile: u.patientProfile,
});

// Public self-registration: creates an UNVERIFIED patient account and sends an OTP on WhatsApp.
// No token is issued until the OTP is verified.
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, age, gender, contact } = req.body;
  if (await User.findOne({ email })) {
    throw new AppError('Email already registered. If you have not verified yet, use /auth/resend-otp.', 409);
  }

  const user = await User.create({ name, email, password, role: 'patient', isVerified: false });
  const patient = await Patient.create({
    name, age, gender, contact, email, createdBy: user._id, userAccount: user._id,
  });
  user.patientProfile = patient._id;
  await user.save();

  let otpSent = true;
  try {
    await issueOtp(user, contact);
  } catch (err) {
    // Account exists; user can retry through /auth/resend-otp
    console.error('Register: OTP send failed:', err.message);
    otpSent = false;
  }

  res.status(201).json({
    success: true,
    message: otpSent
      ? 'Account created. A 6-digit OTP was sent to your WhatsApp. Verify it to activate your account.'
      : 'Account created, but the OTP could not be sent. Use /auth/resend-otp to try again.',
    otpSent,
    email: user.email,
  });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Account not found', 404);
  if (user.isVerified) throw new AppError('Account is already verified', 400);

  await checkOtp(user, otp);
  user.isVerified = true;
  await user.save();

  res.json({ success: true, message: 'WhatsApp number verified', token: signToken(user), user: userPayload(user) });
});

exports.resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).populate('patientProfile');
  // Same response whether or not the account exists, to avoid leaking registered emails
  const generic = { success: true, message: 'If the account exists and is unverified, a new OTP was sent to WhatsApp.' };
  if (!user || user.isVerified || !user.patientProfile) return res.json(generic);

  await issueOtp(user, user.patientProfile.contact);
  res.json(generic);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('Account is deactivated', 403);
  if (!user.isVerified) throw new AppError('Please verify your WhatsApp number with the OTP first', 403);

  res.json({ success: true, token: signToken(user), user: userPayload(user) });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('patientProfile');
  res.json({ success: true, user });
});
