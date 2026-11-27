const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    contact: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    medicalHistory: { type: String, trim: true }, // known conditions / allergies
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);
