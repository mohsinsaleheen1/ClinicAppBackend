const router = require('express').Router();
const c = require('../controllers/userController');
const v = require('../validators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Any logged-in user may list active doctors (needed for booking)
router.get('/doctors', c.listDoctors);

// Admin only
router.use(authorize('admin'));
router.route('/').get(c.listUsers).post(v.createStaff, validate, c.createStaff);
router.route('/:id').patch(v.idParam, v.updateUser, validate, c.updateUser).delete(v.idParam, validate, c.deleteUser);

module.exports = router;
