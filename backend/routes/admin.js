// ==============================================
//  routes/admin.js
// ==============================================
const express  = require('express');
const router   = express.Router();
const { verifierToken, verifierRole } = require('../middleware/auth');
const { getStats } = require('../controllers/adminController');

router.get('/stats', verifierToken, verifierRole('admin'), getStats);

module.exports = router;
