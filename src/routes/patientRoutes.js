const router = require('express').Router();
const c = require('../controllers/patientController');
const v = require('../validators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Patient: own profile (must be declared before '/:id')
router.get('/me', authorize('patient'), c.getMyProfile);

router
  .route('/')
  .get(authorize('admin', 'doctor', 'receptionist'), c.listPatients)
  .post(authorize('admin', 'receptionist'), v.createPatient, validate, c.createPatient);

router
  .route('/:id')
  .get(v.idParam, validate, c.getPatient) // patients restricted to own id in controller
  .patch(authorize('admin', 'receptionist'), v.idParam, v.updatePatient, validate, c.updatePatient)
  .delete(authorize('admin'), v.idParam, validate, c.deletePatient);

router.get('/:id/timeline', v.idParam, validate, c.getTimeline);

module.exports = router;
