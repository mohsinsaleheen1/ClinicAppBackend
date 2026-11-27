const router = require('express').Router();
const c = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/admin', authorize('admin'), c.admin);
router.get('/doctor', authorize('doctor'), c.doctor);

module.exports = router;
