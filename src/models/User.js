const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'doctor', 'receptionist', 'patient'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, required: true },
    subscriptionPlan: { type: String, enum: ['free', 'pro'], default: 'free' },
    specialization: { type: String, trim: true }, // doctors
    isActive: { type: Boolean, default: true },
    // false only for self-registered patients until they verify the WhatsApp OTP
    isVerified: { type: Boolean, default: true },
    // For patient-role users: link to their Patient record
    patientProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
