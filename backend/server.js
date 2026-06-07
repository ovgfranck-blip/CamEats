// ============================================
// CamEats — server.js
// Serveur principal de l'API backend
// Auteur : Nadia
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('../database/db');

const app = express();
const PORT = 3000;

// ---- MIDDLEWARES ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir tous les fichiers statiques
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/images', express.static(path.join(__dirname, '../frontend/public/images')));

// ---- ROUTES API ----
const restaurantsRouter = require('./routes/restaurants');
const ordersRouter = require('./routes/orders');
const restaurantRouter = require('./routes/restaurant');

app.use('/api/restaurants', restaurantsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/restaurant', restaurantRouter);

// ---- ROUTE ACCUEIL ----
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ---- ROUTES ESPACE CLIENT ----
app.get('/client/:page', (req, res) => {
  const filePath = path.join(__dirname, '../frontend/pages/client/' + req.params.page);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('Page introuvable : ' + req.params.page);
  });
});

// ---- ROUTES ESPACE RESTAURANT ----
app.get('/restaurant/:page', (req, res) => {
  const filePath = path.join(__dirname, '../frontend/pages/restaurant/' + req.params.page);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('Page introuvable : ' + req.params.page);
  });
});

// ---- DÉMARRAGE DU SERVEUR ----
app.listen(PORT, () => {
  console.log('✅ Serveur CamEats démarré sur http://localhost:' + PORT);
});