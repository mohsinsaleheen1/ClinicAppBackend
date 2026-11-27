const router = require('express').Router();
const c = require('../controllers/prescriptionController');
const v = require('../validators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(authorize('admin', 'doctor', 'patient'), c.list)
  .post(authorize('doctor'), v.createPrescription, validate, c.create);

router.get('/:id', authorize('admin', 'doctor', 'patient'), v.idParam, validate, c.getOne);
router.get('/:id/pdf', authorize('admin', 'doctor', 'patient'), v.idParam, validate, c.downloadPdf);

module.exports = router;
