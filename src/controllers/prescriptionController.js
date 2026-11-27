const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { assertPatientAccess, getOwnPatient } = require('../utils/access');
const generatePdf = require('../utils/prescriptionPdf');

const populate = [
  { path: 'patientId', select: 'name age gender contact' },
  { path: 'doctorId', select: 'name specialization' },
];

// Doctor: write prescription
exports.create = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, diagnosis, medicines, instructions } = req.body;
  if (!(await Patient.exists({ _id: patientId }))) throw new AppError('Patient not found', 404);

  if (appointmentId) {
    const appt = await Appointment.findById(appointmentId);
    if (!appt) throw new AppError('Appointment not found', 404);
    if (String(appt.doctorId) !== String(req.user._id)) throw new AppError('Not your appointment', 403);
  }

  const rx = await Prescription.create({
    patientId, doctorId: req.user._id, appointmentId, diagnosis, medicines, instructions,
  });
  await rx.populate(populate);
  res.status(201).json({ success: true, prescription: rx });
});

// Role-scoped list
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'doctor') filter.doctorId = req.user._id;
  if (req.user.role === 'patient') filter.patientId = (await getOwnPatient(req.user))._id;
  if (req.query.patientId && req.user.role !== 'patient') filter.patientId = req.query.patientId;

  const prescriptions = await Prescription.find(filter).populate(populate).sort('-createdAt');
  res.json({ success: true, count: prescriptions.length, prescriptions });
});

const loadAuthorized = async (req) => {
  const rx = await Prescription.findById(req.params.id).populate(populate);
  if (!rx) throw new AppError('Prescription not found', 404);
  assertPatientAccess(req.user, rx.patientId._id);
  return rx;
};

exports.getOne = asyncHandler(async (req, res) => {
  res.json({ success: true, prescription: await loadAuthorized(req) });
});

// Patient/doctor/staff: download PDF
exports.downloadPdf = asyncHandler(async (req, res) => {
  const rx = await loadAuthorized(req);
  generatePdf(rx, res);
});
