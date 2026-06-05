// ============================================
// CamEats — routes/orders.js
// Routes API pour les commandes clients
// Auteur : Nadia
// ============================================

const express = require('express');
const router = express.Router();

// Données temporaires (à remplacer par la base de données)
let orders = [];
let nextId = 1;

// ---------------------------------------------------
// POST /api/orders
// Créer une nouvelle commande
// ---------------------------------------------------
router.post('/', (req, res) => {
  const { items, delivery_address, payment_method } = req.body;

  if (!items || !delivery_address || !payment_method) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  const order = {
    id: nextId++,
    items,
    delivery_address,
    payment_method,
    status: 'confirmed',
    date: new Date().toLocaleDateString('fr-FR'),
    eta: 30,
    driver: null,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  };

  orders.push(order);
  res.status(201).json(order);
});

// ---------------------------------------------------
// GET /api/orders/:id
// Récupérer le statut d'une commande
// ---------------------------------------------------
router.get('/:id', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));

  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  res.json(order);
});

// ---------------------------------------------------
// GET /api/orders/history
// Historique des commandes du client
// ---------------------------------------------------
router.get('/history', (req, res) => {
  res.json(orders);
});

// ---------------------------------------------------
// POST /api/orders/:id/rating
// Noter une commande
// ---------------------------------------------------
router.post('/:id/rating', (req, res) => {
  const { rating, comment } = req.body;
  const order = orders.find(o => o.id === parseInt(req.params.id));

  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  order.rating = rating;
  order.comment = comment;
  res.json({ success: true });
});

// ---------------------------------------------------
// POST /api/orders/:id/reorder
// Recommander les mêmes plats
// ---------------------------------------------------
router.post('/:id/reorder', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));

  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  const newOrder = {
    id: nextId++,
    items: order.items,
    delivery_address: order.delivery_address,
    payment_method: order.payment_method,
    status: 'confirmed',
    date: new Date().toLocaleDateString('fr-FR'),
    eta: 30,
    driver: null,
    total: order.total
  };

  orders.push(newOrder);
  res.status(201).json(newOrder);
});

module.exports = router;