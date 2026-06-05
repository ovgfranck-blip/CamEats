// ============================================
// CamEats — routes/restaurants.js
// Routes API pour la recherche de restaurants
// Auteur : Nadia
// ============================================

const express = require('express');
const router = express.Router();

// Données temporaires (à remplacer par la base de données)
const restaurants = [
  {
    id: '1',
    name: 'Chez Mama Africa',
    category: 'local',
    rating: 4.8,
    delivery_time: '25 min',
    delivery_fee: 500,
    lat: 3.8480,
    lng: 11.5021,
    available: true,
    dishes: ['Ndolé', 'Poulet DG', 'Okok']
  },
  {
    id: '2',
    name: 'Le Camerounais',
    category: 'local',
    rating: 4.5,
    delivery_time: '35 min',
    delivery_fee: 300,
    lat: 3.8520,
    lng: 11.5100,
    available: true,
    dishes: ['Ndolé', 'Koki', 'Eru']
  },
  {
    id: '3',
    name: 'Saveurs du Pays',
    category: 'grillade',
    rating: 4.9,
    delivery_time: '20 min',
    delivery_fee: 700,
    lat: 3.8440,
    lng: 11.4980,
    available: true,
    dishes: ['Poulet DG', 'Okok', 'Beignets']
  },
  {
    id: '4',
    name: 'Food Express',
    category: 'fastfood',
    rating: 4.1,
    delivery_time: '40 min',
    delivery_fee: 200,
    lat: 3.8500,
    lng: 11.5050,
    available: true,
    dishes: ['Ndolé', 'Sandwich', 'Jus']
  }
];

// ---------------------------------------------------
// GET /api/restaurants
// Recherche des restaurants par plat et filtres
// ---------------------------------------------------
router.get('/', (req, res) => {
  const { search, dish, max_price, max_distance, category, min_rating } = req.query;

  let resultats = [...restaurants];

  // Filtrer par nom de plat ou de restaurant
  if (search) {
    resultats = resultats.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.dishes.some(d => d.toLowerCase().includes(search.toLowerCase()))
    );
  }

  // Filtrer par plat (comparateur)
  if (dish) {
    resultats = resultats.filter(r =>
      r.dishes.some(d => d.toLowerCase().includes(dish.toLowerCase()))
    );
  }

  // Filtrer par catégorie
  if (category) {
    resultats = resultats.filter(r => r.category === category);
  }

  // Filtrer par note minimum
  if (min_rating) {
    resultats = resultats.filter(r => r.rating >= parseFloat(min_rating));
  }

  res.json(resultats);
});

// ---------------------------------------------------
// GET /api/restaurants/nearby
// Restaurants proches d'une position GPS
// ---------------------------------------------------
router.get('/nearby', (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude et longitude requises' });
  }

  // Retourner tous les restaurants (le calcul de distance sera amélioré plus tard)
  res.json(restaurants);
});

module.exports = router;