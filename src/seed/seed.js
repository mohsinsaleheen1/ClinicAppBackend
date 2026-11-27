require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const accounts = [
    { name: 'System Admin', email: 'admin@clinic.com', password: 'Admin@123', role: 'admin', subscriptionPlan: 'pro' },
    { name: 'Dr. Ayesha Khan', email: 'doctor@clinic.com', password: 'Doctor@123', role: 'doctor', specialization: 'General Physician' },
    { name: 'Sara Reception', email: 'reception@clinic.com', password: 'Reception@123', role: 'receptionist' },
  ];

  for (const a of accounts) {
    if (!(await User.findOne({ email: a.email }))) {
      await User.create(a);
      console.log(`Created ${a.role}: ${a.email} / ${a.password}`);
    }
  }

  if (!(await User.findOne({ email: 'patient@clinic.com' }))) {
    const admin = await User.findOne({ role: 'admin' });
    const patient = await Patient.create({
      name: 'Ali Raza', age: 32, gender: 'male', contact: '03001234567', email: 'patient@clinic.com', createdBy: admin._id,
    });
    const user = await User.create({
      name: 'Ali Raza', email: 'patient@clinic.com', password: 'Patient@123', role: 'patient', patientProfile: patient._id,
    });
    patient.userAccount = user._id;
    await patient.save();
    console.log('Created patient: patient@clinic.com / Patient@123');
  }

  console.log('Seeding done');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
