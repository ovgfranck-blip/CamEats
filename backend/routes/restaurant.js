// ============================================
// CamEats — routes/restaurant.js
// Routes API pour l'espace restaurant
// Auteur : Nadia
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configuration upload photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../frontend/public/images'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Données temporaires (à remplacer par la base de données)
let menu = [
  { id: '1', name: 'Ndolé', category: 'local', price: 2500, description: 'Plat traditionnel camerounais', photo: null, available: true },
  { id: '2', name: 'Poulet DG', category: 'local', price: 3500, description: 'Poulet avec légumes et plantains', photo: null, available: true },
  { id: '3', name: 'Okok', category: 'local', price: 2200, description: 'Feuilles d\'okok préparées', photo: null, available: false }
];

let profil = {
  name: 'Chez Mama Africa',
  category: 'local',
  phone: '+237 699 000 000',
  address: 'Bastos, Yaoundé',
  description: 'Restaurant de cuisine camerounaise traditionnelle',
  photo: null,
  hours: {
    weekday_open: '08:00',
    weekday_close: '22:00',
    saturday_open: '09:00',
    saturday_close: '23:00',
    sunday_open: '10:00',
    sunday_close: '21:00'
  }
};

let orders = [
  {
    id: 1,
    items: [{ dishName: 'Ndolé', quantity: 2, price: 2500 }],
    status: 'confirmed',
    date: '06/06/2026',
    delivery_address: 'Bastos, Yaoundé',
    total: 5000
  }
];

// ---------------------------------------------------
// GET /api/restaurant/dashboard
// Statistiques du tableau de bord
// ---------------------------------------------------
router.get('/dashboard', (req, res) => {
  const today = orders.filter(o => o.date === new Date().toLocaleDateString('fr-FR'));
  const revenue = today.reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length;

  res.json({
    total_orders: today.length,
    revenue,
    pending_orders: pending,
    rating: 4.8,
    recent_orders: orders.slice(-5).reverse()
  });
});

// ---------------------------------------------------
// GET /api/restaurant/menu
// Récupérer la liste des plats
// ---------------------------------------------------
router.get('/menu', (req, res) => {
  res.json(menu);
});

// ---------------------------------------------------
// POST /api/restaurant/menu
// Ajouter un nouveau plat
// ---------------------------------------------------
router.post('/menu', upload.single('photo'), (req, res) => {
  const { name, price, description, category } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Nom et prix obligatoires' });
  }

  const plat = {
    id: Date.now().toString(),
    name,
    price: parseInt(price),
    description,
    category,
    photo: req.file ? '/images/' + req.file.filename : null,
    available: true
  };

  menu.push(plat);
  res.status(201).json(plat);
});

// ---------------------------------------------------
// PUT /api/restaurant/menu/:id
// Modifier un plat existant
// ---------------------------------------------------
router.put('/menu/:id', upload.single('photo'), (req, res) => {
  const index = menu.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Plat introuvable' });
  }

  const { name, price, description, category } = req.body;

  menu[index] = {
    ...menu[index],
    name: name || menu[index].name,
    price: price ? parseInt(price) : menu[index].price,
    description: description || menu[index].description,
    category: category || menu[index].category,
    photo: req.file ? '/images/' + req.file.filename : menu[index].photo
  };

  res.json(menu[index]);
});

// ---------------------------------------------------
// DELETE /api/restaurant/menu/:id
// Supprimer un plat
// ---------------------------------------------------
router.delete('/menu/:id', (req, res) => {
  const index = menu.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Plat introuvable' });
  }

  menu.splice(index, 1);
  res.json({ success: true });
});

// ---------------------------------------------------
// PUT /api/restaurant/menu/:id/availability
// Changer la disponibilité d'un plat
// ---------------------------------------------------
router.put('/menu/:id/availability', (req, res) => {
  const plat = menu.find(p => p.id === req.params.id);

  if (!plat) {
    return res.status(404).json({ error: 'Plat introuvable' });
  }

  plat.available = req.body.available;
  res.json(plat);
});

// ---------------------------------------------------
// GET /api/restaurant/orders
// Récupérer les commandes du restaurant
// ---------------------------------------------------
router.get('/orders', (req, res) => {
  res.json(orders);
});

// ---------------------------------------------------
// PUT /api/restaurant/orders/:id/status
// Changer le statut d'une commande
// ---------------------------------------------------
router.put('/orders/:id/status', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));

  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  order.status = req.body.status;
  res.json(order);
});

// ---------------------------------------------------
// GET /api/restaurant/profile
// Récupérer le profil du restaurant
// ---------------------------------------------------
router.get('/profile', (req, res) => {
  res.json(profil);
});

// ---------------------------------------------------
// PUT /api/restaurant/profile
// Modifier le profil du restaurant
// ---------------------------------------------------
router.put('/profile', upload.single('photo'), (req, res) => {
  const { name, category, phone, address, description, hours } = req.body;

  profil = {
    ...profil,
    name: name || profil.name,
    category: category || profil.category,
    phone: phone || profil.phone,
    address: address || profil.address,
    description: description || profil.description,
    hours: hours ? JSON.parse(hours) : profil.hours,
    photo: req.file ? '/images/' + req.file.filename : profil.photo
  };

  res.json(profil);
});

module.exports = router;