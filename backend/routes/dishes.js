// ==============================================
//  routes/dishes.js
//  Routes des plats — toutes privées (restaurateur)
// ==============================================

const express    = require('express');
const router     = express.Router();
const { verifierToken, verifierRole } = require('../middleware/auth');
const { ajouterPlat, modifierPlat, supprimerPlat } = require('../controllers/dishController');

// Toutes ces routes nécessitent d'être connecté en tant que restaurateur
router.post('/',    verifierToken, verifierRole('restaurant', 'admin'), ajouterPlat);
router.put('/:id',  verifierToken, verifierRole('restaurant', 'admin'), modifierPlat);
router.delete('/:id', verifierToken, verifierRole('restaurant', 'admin'), supprimerPlat);

module.exports = router;
