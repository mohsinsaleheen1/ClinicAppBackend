const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getOwnPatient } = require('../utils/access');

const populate = [
  { path: 'patientId', select: 'name age gender contact' },
  { path: 'doctorId', select: 'name specialization' },
];

const dayRange = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

// Receptionist/Admin pass patientId; patient books for themselves
exports.book = asyncHandler(async (req, res) => {
  const { doctorId, date, reason } = req.body;
  let patientId = req.body.patientId;

  if (req.user.role === 'patient') {
    patientId = (await getOwnPatient(req.user))._id;
  } else if (!patientId) {
    throw new AppError('patientId is required', 400);
  }

  const [patient, doctor] = await Promise.all([
    Patient.findById(patientId),
    User.findOne({ _id: doctorId, role: 'doctor', isActive: true }),
  ]);
  if (!patient) throw new AppError('Patient not found', 404);
  if (!doctor) throw new AppError('Doctor not found', 404);
  if (new Date(date) < new Date()) throw new AppError('Appointment date must be in the future', 400);

  // Prevent double-booking the same doctor at the exact same time
  const clash = await Appointment.findOne({ doctorId, date, status: { $ne: 'cancelled' } });
  if (clash) throw new AppError('Doctor already has an appointment at this time', 409);

  const appt = await Appointment.create({
    patientId, doctorId, date, reason, bookedBy: req.user._id,
    status: req.user.role === 'patient' ? 'pending' : 'confirmed',
  });
  await appt.populate(populate);
  res.status(201).json({ success: true, appointment: appt });
});

// Role-scoped list. ?status=&date=YYYY-MM-DD
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'doctor') filter.doctorId = req.user._id;
  if (req.user.role === 'patient') filter.patientId = (await getOwnPatient(req.user))._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.date) filter.date = dayRange(req.query.date);
  if (req.query.doctorId && ['admin', 'receptionist'].includes(req.user.role)) filter.doctorId = req.query.doctorId;
  if (req.query.patientId && req.user.role !== 'patient') filter.patientId = req.query.patientId;

  const appointments = await Appointment.find(filter).populate(populate).sort('date');
  res.json({ success: true, count: appointments.length, appointments });
});

// Doctor schedule view (today by default, ?date=)
exports.schedule = asyncHandler(async (req, res) => {
  const filter = { date: dayRange(req.query.date), status: { $ne: 'cancelled' } };
  if (req.user.role === 'doctor') filter.doctorId = req.user._id;
  else if (req.query.doctorId) filter.doctorId = req.query.doctorId;
  else throw new AppError('doctorId query param is required', 400);

  const appointments = await Appointment.find(filter).populate(populate).sort('date');
  res.json({ success: true, count: appointments.length, appointments });
});

const loadAndAuthorize = async (req) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) throw new AppError('Appointment not found', 404);
  if (req.user.role === 'doctor' && String(appt.doctorId) !== String(req.user._id)) {
    throw new AppError('This appointment belongs to another doctor', 403);
  }
  if (req.user.role === 'patient' && String(appt.patientId) !== String(req.user.patientProfile)) {
    throw new AppError('This is not your appointment', 403);
  }
  return appt;
};

// Update status (doctor/receptionist/admin). Patients may only cancel.
exports.updateStatus = asyncHandler(async (req, res) => {
  const appt = await loadAndAuthorize(req);
  const { status, diagnosis } = req.body;
  if (req.user.role === 'patient' && status !== 'cancelled') {
    throw new AppError('Patients can only cancel appointments', 403);
  }
  if (appt.status === 'completed' && status !== 'completed') {
    throw new AppError('Completed appointments cannot be changed', 400);
  }
  appt.status = status;
  if (diagnosis !== undefined && req.user.role === 'doctor') appt.diagnosis = diagnosis;
  await appt.save();
  await appt.populate(populate);
  res.json({ success: true, appointment: appt });
});

// Cancel (patient/receptionist/admin/doctor)
exports.cancel = asyncHandler(async (req, res) => {
  const appt = await loadAndAuthorize(req);
  if (appt.status === 'completed') throw new AppError('Completed appointments cannot be cancelled', 400);
  appt.status = 'cancelled';
  await appt.save();
  res.json({ success: true, message: 'Appointment cancelled', appointment: appt });
});
