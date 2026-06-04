// ==============================================
//  routes/orders.js
//  Routes des commandes
// ==============================================

const express    = require('express');
const router     = express.Router();
const { verifierToken, verifierRole } = require('../middleware/auth');
const { creerCommande, getCommandeParId, mettreAJourStatut } = require('../controllers/orderController');

// Créer une commande — client connecté uniquement
router.post('/',
  verifierToken,
  verifierRole('client'),
  creerCommande
);

// Voir les détails d'une commande — tout utilisateur connecté
router.get('/:id',
  verifierToken,
  getCommandeParId
);

// Mettre à jour le statut — restaurant, livreur ou admin
router.put('/:id/status',
  verifierToken,
  verifierRole('restaurant', 'livreur', 'admin'),
  mettreAJourStatut
);

module.exports = router;
