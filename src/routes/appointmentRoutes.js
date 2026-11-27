const router = require('express').Router();
const c = require('../controllers/appointmentController');
const v = require('../validators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(c.list)
  .post(authorize('admin', 'receptionist', 'patient'), v.bookAppointment, validate, c.book);

router.get('/schedule', authorize('admin', 'doctor', 'receptionist'), c.schedule);

router.patch('/:id/status', v.idParam, v.updateStatus, validate, c.updateStatus);
router.patch('/:id/cancel', v.idParam, validate, c.cancel);

module.exports = router;
