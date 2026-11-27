const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const asyncHandler = require('../utils/asyncHandler');

const monthStart = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; };

exports.admin = asyncHandler(async (req, res) => {
  const [totalPatients, totalDoctors, totalReceptionists, monthlyAppointments, completed, topDiagnosis] = await Promise.all([
    Patient.countDocuments(),
    User.countDocuments({ role: 'doctor' }),
    User.countDocuments({ role: 'receptionist' }),
    Appointment.countDocuments({ date: { $gte: monthStart() } }),
    Appointment.countDocuments({ date: { $gte: monthStart() }, status: 'completed' }),
    Prescription.aggregate([
      { $match: { diagnosis: { $nin: [null, ''] } } },
      { $group: { _id: { $toLower: '$diagnosis' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);
  res.json({
    success: true,
    stats: {
      totalPatients, totalDoctors, totalReceptionists, monthlyAppointments,
      simulatedRevenue: completed * 1500, // simulated: 1500 PKR per completed visit
      mostCommonDiagnosis: topDiagnosis.map((d) => ({ diagnosis: d._id, count: d.count })),
    },
  });
});

exports.doctor = asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const [dailyAppointments, monthlyAppointments, monthlyCompleted, prescriptionCount] = await Promise.all([
    Appointment.countDocuments({ doctorId: req.user._id, date: { $gte: today, $lt: tomorrow } }),
    Appointment.countDocuments({ doctorId: req.user._id, date: { $gte: monthStart() } }),
    Appointment.countDocuments({ doctorId: req.user._id, date: { $gte: monthStart() }, status: 'completed' }),
    Prescription.countDocuments({ doctorId: req.user._id }),
  ]);
  res.json({ success: true, stats: { dailyAppointments, monthlyAppointments, monthlyCompleted, prescriptionCount } });
});
