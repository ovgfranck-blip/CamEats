// ==============================================
//  routes/restaurants.js
//  Routes des restaurants
// ==============================================

const express    = require('express');
const router     = express.Router();
const { verifierToken, verifierRole } = require('../middleware/auth');
const {
  getTousLesRestaurants,
  getRestaurantParId,
  modifierRestaurant
} = require('../controllers/restaurantController');

// Routes PUBLIQUES — pas besoin d'être connecté
router.get('/',    getTousLesRestaurants);  // GET /api/restaurants
router.get('/:id', getRestaurantParId);     // GET /api/restaurants/1

// Routes PRIVÉES — token requis + rôle restaurant
router.put('/:id',
  verifierToken,
  verifierRole('restaurant', 'admin'),
  modifierRestaurant
); // PUT /api/restaurants/1

module.exports = router;
