// ==============================================
//  server.js
//  Point d'entrée principal du backend CamEats
//  C'est ce fichier qu'on lance avec : npm run dev
// ==============================================

const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import des routes
const authRoutes        = require('./routes/auth');
const restaurantRoutes  = require('./routes/restaurants');
const dishRoutes        = require('./routes/dishes');
const orderRoutes       = require('./routes/orders');
const deliveryRoutes    = require('./routes/deliveries');
const reviewRoutes      = require('./routes/reviews');
const adminRoutes       = require('./routes/admin');

// ----------------------------------------------
//  Initialisation d'Express
// ----------------------------------------------
const app    = express();
const server = http.createServer(app); // on crée un serveur HTTP à partir d'Express

// ----------------------------------------------
//  Configuration Socket.io (temps réel)
//  Utilisé pour : statuts commandes, position GPS livreur
// ----------------------------------------------
const io = new Server(server, {
  cors: {
    origin: '*', // en développement on accepte tout
    methods: ['GET', 'POST']
  }
});

// Rendre io accessible dans tous les contrôleurs
app.set('io', io);

// Événements Socket.io
io.on('connection', (socket) => {
  console.log('🔌 Nouveau client connecté:', socket.id);

  // Le client rejoint une "room" pour recevoir ses notifications
  // Ex: quand le statut d'une commande change, on notifie la room de ce client
  socket.on('rejoindre_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} a rejoint sa room`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client déconnecté:', socket.id);
  });
});

// ----------------------------------------------
//  Middlewares globaux
// ----------------------------------------------

// CORS : permet au frontend (autre port/domaine) d'appeler l'API
app.use(cors());

// Lire le JSON envoyé dans le body des requêtes
app.use(express.json());

// Lire les données de formulaires HTML
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------
//  Routes
// ----------------------------------------------

// Route de test — pour vérifier que le serveur tourne
app.get('/', (req, res) => {
  res.json({
    succes : true,
    message: '🍽️  API CamEats est en ligne !',
    version: '1.0.0'
  });
});

// Routes d'authentification
app.use('/api/auth',        authRoutes);

// Routes restaurants et plats
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/dishes',      dishRoutes);

// Routes commandes, livraisons, avis
app.use('/api/orders',      orderRoutes);
app.use('/api/deliveries',  deliveryRoutes);
app.use('/api/reviews',     reviewRoutes);

// Routes admin
app.use('/api/admin',       adminRoutes);

// Route 404 — si aucune route ne correspond
app.use((req, res) => {
  res.status(404).json({
    succes : false,
    message: `Route introuvable : ${req.method} ${req.url}`
  });
});

// ----------------------------------------------
//  Démarrage du serveur
// ----------------------------------------------
const PORT = process.env.PORT || 3000;

async function demarrerServeur() {
  // 1. Tester la connexion à la base de données
  await testConnection();

  // 2. Lancer le serveur HTTP
  server.listen(PORT, () => {
    console.log('');
    console.log('🚀 Serveur CamEats démarré !');
    console.log(`📡 URL : http://localhost:${PORT}`);
    console.log(`🔑 Auth : http://localhost:${PORT}/api/auth`);
    console.log('');
    console.log('Appuie sur CTRL+C pour arrêter le serveur');
  });
}

demarrerServeur();
