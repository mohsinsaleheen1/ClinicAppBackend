const Patient = require('../models/Patient');
const AppError = require('./AppError');

/** Returns the Patient record linked to a patient-role user, or throws. */
exports.getOwnPatient = async (user) => {
  if (!user.patientProfile) throw new AppError('No patient profile linked to this account', 404);
  const patient = await Patient.findById(user.patientProfile);
  if (!patient) throw new AppError('Patient profile not found', 404);
  return patient;
};

/** Patients may only touch their own record; staff may touch any. */
exports.assertPatientAccess = (user, patientId) => {
  if (user.role === 'patient' && String(user.patientProfile) !== String(patientId)) {
    throw new AppError('You can only access your own records', 403);
  }
};
