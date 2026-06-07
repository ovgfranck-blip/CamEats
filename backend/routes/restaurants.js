// ============================================
// CamEats — routes/restaurants.js
// Routes API pour la recherche de restaurants
// Auteur : Nadia
// ============================================

const express = require('express');
const router = express.Router();
const db = require('../../database/db');

// ---------------------------------------------------
// GET /api/restaurants
// Recherche des restaurants par plat et filtres
// ---------------------------------------------------
router.get('/', (req, res) => {
  const { search, dish, category, min_rating } = req.query;

  let query = `
    SELECT DISTINCT r.* FROM restaurants r
    LEFT JOIN dishes d ON d.restaurant_id = r.id
    WHERE r.available = 1
  `;
  const params = [];

  if (search) {
    query += ` AND (r.name LIKE ? OR d.name LIKE ?)`;
    params.push('%' + search + '%', '%' + search + '%');
  }

  if (dish) {
    query += ` AND d.name LIKE ?`;
    params.push('%' + dish + '%');
  }

  if (category) {
    query += ` AND r.category = ?`;
    params.push(category);
  }

  if (min_rating) {
    query += ` AND r.rating >= ?`;
    params.push(parseFloat(min_rating));
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Erreur requête restaurants :', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
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

  const query = `SELECT * FROM restaurants WHERE available = 1`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur requête nearby :', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
});

module.exports = router;