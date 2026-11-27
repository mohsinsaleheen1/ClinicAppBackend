const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Admin: create doctor or receptionist
exports.createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, role, specialization } = req.body;
  if (await User.findOne({ email })) throw new AppError('Email already registered', 409);
  const user = await User.create({ name, email, password, role, specialization });
  res.status(201).json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, specialization: user.specialization },
  });
});

// Admin: list users (?role=doctor)
exports.listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort('-createdAt');
  res.json({ success: true, count: users.length, users });
});

// Doctors list (admin, receptionist, patient need this to book)
exports.listDoctors = asyncHandler(async (req, res) => {
  const doctors = await User.find({ role: 'doctor', isActive: true }).select('name email specialization');
  res.json({ success: true, count: doctors.length, doctors });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const allowed = ['name', 'isActive', 'subscriptionPlan', 'specialization'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, user });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new AppError('You cannot delete yourself', 400);
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'admin') throw new AppError('Admin accounts cannot be deleted here', 403);
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted' });
});
