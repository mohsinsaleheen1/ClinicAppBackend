# AI Clinic Management + Smart Diagnosis SaaS: Backend

## AI Hackathon Task: MERN Stack Students (Mid)

**Project Title:** AI Clinic Management + Smart Diagnosis SaaS

This repository is the **backend only** (Node.js + Express.js + MongoDB), built for the **MID HACKATHON: Intermediate Level (Batch 16 & 17)**, following **Option 1** (MERN, simple REST APIs, basic JWT).

---

## Problem Statement

Small and medium-sized clinics still rely heavily on:

- Paper-based prescriptions
- Manual patient records
- No digital appointment tracking
- No analytics or reporting
- No AI support for diagnosis

This leads to data loss, time waste, inefficient patient handling and no performance visibility.

**Mission:** build a modern AI-powered Clinic Management SaaS that digitizes the entire workflow and intelligently assists doctors.

> This is not just a hackathon submission. This can be your first real startup idea.

## Vision

A scalable SaaS platform that:

- Digitizes clinic operations
- Improves efficiency
- Provides intelligent AI assistance
- Can realistically be sold to local clinics

---

## MID HACKATHON: Intermediate Level (Batch 16 & 17)

### Required Tech Stack

**Option 1 (implemented here):**

- MERN (if you know React)
- Simple REST APIs if you know Node.js
- Basic JWT

**Option 2 (alternative):**

- HTML, CSS, JavaScript
- Firebase Auth / Supabase Auth
- Firestore / Supabase DB
- Supabase Storage / Cloudinary
- Basic CRUD
- Optional AI

---

## User Roles (Mandatory: 4 Roles)

| Role | Capabilities |
|------|--------------|
| **Admin** | Manage doctors, manage receptionists, view analytics, manage subscription plans (simulation), monitor system usage |
| **Doctor** | View appointments, access patient history, add diagnosis, write prescriptions, view personal stats |
| **Receptionist** | Register new patients, book appointments, update patient info, manage daily schedule |
| **Patient** | Login securely, view profile, view appointment history, view prescriptions, download prescription PDF |

---

## Core Features (Mandatory)

### Authentication & Authorization
- Secure login (bcrypt-hashed passwords, JWT)
- Role-based access (`authorize(...roles)` middleware)
- Protected routes (`protect` middleware)
- Input validation (`express-validator`)

### WhatsApp OTP Verification (WasenderAPI)
- Patient self-registers with a WhatsApp number (`contact`); a 6-digit OTP is sent through [WasenderAPI](https://wasenderapi.com)
- Account stays inactive until `POST /auth/verify-otp` succeeds, then a JWT is returned
- OTP is stored hashed (HMAC), expires in 5 minutes, allows 5 wrong attempts, and resend has a 60s cooldown
- Numbers like `03001234567` are normalised to `923001234567` (`DEFAULT_COUNTRY_CODE`)
- Setup: create a session on WasenderAPI, connect your WhatsApp, put the API key in `WASENDER_API_KEY`
- Development: if the key is empty, the OTP is printed in the server console (disabled in production)

**Flow**
```json
POST /api/auth/register
{ "name": "Ali", "email": "ali@mail.com", "password": "secret12", "age": 30, "gender": "male", "contact": "03001234567" }

POST /api/auth/verify-otp
{ "email": "ali@mail.com", "otp": "123456" }
```

### Patient Management
- Add patient
- Edit patient
- View patient profile
- View medical history timeline

### Appointment Management
- Book appointment (by receptionist or patient)
- Cancel appointment
- Update status (`pending` / `confirmed` / `completed`)
- Doctor schedule view

### Prescription System
- Add medicines
- Add dosage
- Add notes
- Generate PDF
- Patient can download prescription

### Medical History Timeline
Each patient has:
- Appointment history
- Diagnosis history
- Prescription history
- Timestamp tracking

---

## Suggested Database Structure

**Users**: id, name, email, password, role, subscriptionPlan
**Patients**: id, name, age, gender, contact, createdBy
**Appointments**: id, patientId, doctorId, date, status
**Prescriptions**: id, patientId, doctorId, medicines[], instructions, createdAt

(Models in `src/models` add a few helpful fields such as `reason`, `diagnosis`, `specialization`.)

---

## Folder Structure

```
clinic-backend/
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── server.js              # entry: env, DB connect, listen
    ├── app.js                 # express app, middleware, routes
    ├── config/db.js           # MongoDB connection
    ├── models/                # User, Patient, Appointment, Prescription, Otp
    ├── middleware/            # auth (protect/authorize), validate, errorHandler
    ├── validators/index.js    # express-validator rule sets
    ├── controllers/           # auth, user, patient, appointment, prescription, stats
    ├── routes/                # one router per resource
    ├── utils/                 # AppError, asyncHandler, token, otp, whatsapp, prescriptionPdf, access
    └── seed/seed.js           # demo accounts for all 4 roles
```

---

## Getting Started

```bash
npm install
cp .env.example .env     # fill MONGO_URI, JWT_SECRET and WASENDER_API_KEY
npm run seed             # creates demo users
npm run dev              # or: npm start
```

**Demo accounts (after `npm run seed`):**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinic.com | Admin@123 |
| Doctor | doctor@clinic.com | Doctor@123 |
| Receptionist | reception@clinic.com | Reception@123 |
| Patient | patient@clinic.com | Patient@123 |

Send the token as `Authorization: Bearer <token>`.

---

## API Reference

Base URL: `/api`

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/auth/register` | Public (creates an **unverified patient** account + profile, sends OTP on WhatsApp) |
| POST | `/auth/verify-otp` | Public (`{ email, otp }`, returns JWT on success) |
| POST | `/auth/resend-otp` | Public (`{ email }`, 60s cooldown) |
| POST | `/auth/login` | Public (unverified accounts are rejected) |
| GET | `/auth/me` | Any logged-in user |

### Users (staff management)
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/users/doctors` | Any logged-in user |
| GET | `/users?role=doctor` | Admin |
| POST | `/users` (role: doctor/receptionist) | Admin |
| PATCH | `/users/:id` (activate, plan, name) | Admin |
| DELETE | `/users/:id` | Admin |

### Patients
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/patients` | Admin, Receptionist |
| GET | `/patients?search=&page=&limit=` | Admin, Doctor, Receptionist |
| GET | `/patients/me` | Patient |
| GET | `/patients/:id` | Staff; patient only own |
| PATCH | `/patients/:id` | Admin, Receptionist |
| DELETE | `/patients/:id` | Admin |
| GET | `/patients/:id/timeline` | Staff; patient only own |

### Appointments
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/appointments` | Admin, Receptionist, Patient |
| GET | `/appointments?status=&date=` | Role-scoped (doctor: own, patient: own) |
| GET | `/appointments/schedule?date=&doctorId=` | Admin, Doctor, Receptionist |
| PATCH | `/appointments/:id/status` | Doctor, Receptionist, Admin (patient: cancel only) |
| PATCH | `/appointments/:id/cancel` | Owner roles |

### Prescriptions
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/prescriptions` | Doctor |
| GET | `/prescriptions` | Admin, Doctor, Patient (scoped) |
| GET | `/prescriptions/:id` | Admin, Doctor, Patient (own) |
| GET | `/prescriptions/:id/pdf` | Admin, Doctor, Patient (own) |

### Stats
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/stats/admin` | Admin |
| GET | `/stats/doctor` | Doctor |

**Example: book an appointment (receptionist)**
```json
POST /api/appointments
{ "patientId": "<id>", "doctorId": "<id>", "date": "2026-12-01T10:00:00Z", "reason": "Fever" }
```

**Example: write a prescription (doctor)**
```json
POST /api/prescriptions
{
  "patientId": "<id>",
  "diagnosis": "Viral fever",
  "medicines": [{ "name": "Paracetamol", "dosage": "500mg", "frequency": "twice daily", "duration": "3 days", "notes": "After meals" }],
  "instructions": "Rest and drink fluids"
}
```

---

## Security Notes
- Passwords hashed with bcrypt; never returned in responses
- JWT verification on every protected route; deactivated users are rejected
- Role checks on routes, plus record-level checks (patients can only read their own data, doctors only their own appointments)
- `helmet`, CORS restriction, rate limiting on `/api/auth`
- Public registration can only create **patient** accounts; staff are created by an admin

---

## Startup Opportunity

This project is highly commercial. You are encouraged to approach nearby clinics, offer a live demo, customize features, add SMS reminders, WhatsApp integration, a billing module, and convert it into a real SaaS. If you launch this as a startup, we would be extremely proud of you.

---

## Submission Requirements (Mandatory)

1. **Deployed URL (Live App)**: optional but encouraged for Mid (e.g. Render / Railway for the backend, Vercel / Netlify for the frontend).
2. **GitHub Repository URL**: public repo preferred, with clean commit history (do not upload a zip as 1 commit).
3. **Project Demo Video URL (LinkedIn or YouTube)**: 3-7 minutes showing:
   - Login + role dashboards
   - Patient management
   - Appointment booking
   - Prescription generation (PDF)
   - Medical history timeline
