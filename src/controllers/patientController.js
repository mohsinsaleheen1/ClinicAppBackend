const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { assertPatientAccess, getOwnPatient } = require('../utils/access');

// Receptionist/Admin: register patient (optionally with a login account)
exports.createPatient = asyncHandler(async (req, res) => {
  const { name, age, gender, contact, email, address, medicalHistory, password } = req.body;
  const patient = await Patient.create({
    name, age, gender, contact, email, address, medicalHistory, createdBy: req.user._id,
  });

  if (email && password) {
    if (await User.findOne({ email })) {
      await patient.deleteOne();
      throw new AppError('Email already registered', 409);
    }
    const account = await User.create({ name, email, password, role: 'patient', patientProfile: patient._id });
    patient.userAccount = account._id;
    await patient.save();
  }
  res.status(201).json({ success: true, patient });
});

exports.listPatients = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { contact: rx }];
  }
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const [patients, total] = await Promise.all([
    Patient.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Patient.countDocuments(filter),
  ]);
  res.json({ success: true, total, page, count: patients.length, patients });
});

exports.getMyProfile = asyncHandler(async (req, res) => {
  const patient = await getOwnPatient(req.user);
  res.json({ success: true, patient });
});

exports.getPatient = asyncHandler(async (req, res) => {
  assertPatientAccess(req.user, req.params.id);
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new AppError('Patient not found', 404);
  res.json({ success: true, patient });
});

exports.updatePatient = asyncHandler(async (req, res) => {
  const allowed = ['name', 'age', 'gender', 'contact', 'email', 'address', 'medicalHistory'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const patient = await Patient.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!patient) throw new AppError('Patient not found', 404);
  res.json({ success: true, patient });
});

exports.deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new AppError('Patient not found', 404);
  await patient.deleteOne();
  res.json({ success: true, message: 'Patient deleted' });
});

// Medical history timeline: appointments + diagnoses + prescriptions, newest first
exports.getTimeline = asyncHandler(async (req, res) => {
  const patientId = req.params.id;
  assertPatientAccess(req.user, patientId);
  const patient = await Patient.findById(patientId);
  if (!patient) throw new AppError('Patient not found', 404);

  const [appointments, prescriptions] = await Promise.all([
    Appointment.find({ patientId }).populate('doctorId', 'name specialization'),
    Prescription.find({ patientId }).populate('doctorId', 'name specialization'),
  ]);

  const timeline = [
    ...appointments.map((a) => ({
      type: 'appointment', timestamp: a.date, id: a._id,
      data: { status: a.status, reason: a.reason, doctor: a.doctorId },
    })),
    ...appointments.filter((a) => a.diagnosis).map((a) => ({
      type: 'diagnosis', timestamp: a.updatedAt, id: a._id,
      data: { diagnosis: a.diagnosis, doctor: a.doctorId },
    })),
    ...prescriptions.map((p) => ({
      type: 'prescription', timestamp: p.createdAt, id: p._id,
      data: { diagnosis: p.diagnosis, medicines: p.medicines, instructions: p.instructions, doctor: p.doctorId },
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ success: true, patient, count: timeline.length, timeline });
});
