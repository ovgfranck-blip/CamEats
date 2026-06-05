// ==============================================
//  routes/reviews.js
// ==============================================
const express  = require('express');
const router   = express.Router();
const { verifierToken, verifierRole } = require('../middleware/auth');
const { soumettreAvis } = require('../controllers/reviewController');

router.post('/', verifierToken, verifierRole('client'), soumettreAvis);

module.exports = router;
