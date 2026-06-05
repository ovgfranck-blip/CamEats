// ==============================================
//  routes/deliveries.js
//  Routes des livraisons — espace livreur (Aubin)
// ==============================================

const express    = require('express');
const router     = express.Router();
const { verifierToken, verifierRole } = require('../middleware/auth');
const { getCoursesDisponibles, accepterCourse } = require('../controllers/deliveryController');

// Voir les courses disponibles — livreur connecté
router.get('/available',
  verifierToken,
  verifierRole('livreur'),
  getCoursesDisponibles
);

// Accepter une course — livreur connecté
router.put('/:id/accept',
  verifierToken,
  verifierRole('livreur'),
  accepterCourse
);

module.exports = router;
