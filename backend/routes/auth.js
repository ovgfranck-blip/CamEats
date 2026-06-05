// ==============================================
//  routes/auth.js
//  Définition des routes d'authentification
//
//  Une route = une URL + une méthode HTTP + un contrôleur
//  Ici on dit juste "quelle fonction appeler"
//  La logique est dans authController.js
// ==============================================

const express = require('express');
const router  = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register — Créer un compte
router.post('/register', register);

// POST /api/auth/login — Se connecter
router.post('/login', login);

module.exports = router;
