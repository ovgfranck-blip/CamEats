// ============================================
// CamEats — server.js
// Serveur principal de l'API backend
// Auteur : Nadia
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ---- MIDDLEWARES ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- ROUTES ----
const restaurantsRouter = require('./routes/restaurants');
const ordersRouter = require('./routes/orders');
const restaurantRouter = require('./routes/restaurant');

app.use('/api/restaurants', restaurantsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/restaurant', restaurantRouter);

// ---- ROUTE PAR DÉFAUT ----
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/client/search.html'));
});

// ---- DÉMARRAGE DU SERVEUR ----
app.listen(PORT, () => {
  console.log('✅ Serveur CamEats démarré sur http://localhost:' + PORT);
});