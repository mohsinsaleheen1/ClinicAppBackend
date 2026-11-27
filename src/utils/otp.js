const crypto = require('crypto');
const Otp = require('../models/Otp');
const AppError = require('./AppError');
const { sendWhatsApp } = require('./whatsapp');

const OTP_TTL_MIN = parseInt(process.env.OTP_TTL_MINUTES) || 5;
const RESEND_COOLDOWN_SEC = parseInt(process.env.OTP_RESEND_SECONDS) || 60;
const MAX_ATTEMPTS = 5;

const hash = (code) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(String(code)).digest('hex');

/** Creates (or replaces) an OTP for the user and sends it on WhatsApp. */
exports.issueOtp = async (user, phone) => {
  const existing = await Otp.findOne({ userId: user._id });
  if (existing) {
    const wait = RESEND_COOLDOWN_SEC - (Date.now() - existing.lastSentAt.getTime()) / 1000;
    if (wait > 0) throw new AppError(`Please wait ${Math.ceil(wait)}s before requesting a new OTP`, 429);
  }

  const code = String(crypto.randomInt(100000, 1000000)); // 6 digits
  await Otp.findOneAndUpdate(
    { userId: user._id },
    {
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true }
  );

  await sendWhatsApp(
    phone,
    `Your Clinic verification code is ${code}. It expires in ${OTP_TTL_MIN} minutes. Do not share it with anyone.`
  );
};

/** Verifies the code; throws on any problem. Deletes the OTP on success. */
exports.checkOtp = async (user, code) => {
  const record = await Otp.findOne({ userId: user._id });
  if (!record || record.expiresAt < new Date()) throw new AppError('OTP expired. Please request a new one.', 400);
  if (record.attempts >= MAX_ATTEMPTS) {
    await record.deleteOne();
    throw new AppError('Too many wrong attempts. Please request a new OTP.', 429);
  }

  const a = Buffer.from(hash(code));
  const b = Buffer.from(record.codeHash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    record.attempts += 1;
    await record.save();
    throw new AppError('Invalid OTP', 400);
  }
  await record.deleteOne();
};
