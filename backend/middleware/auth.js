// ==============================================
//  middleware/auth.js
//  Vérification du token JWT
//
//  Un middleware c'est une fonction qui s'exécute
//  AVANT le contrôleur. Si le token est invalide,
//  on bloque la requête ici et on ne va jamais
//  jusqu'au contrôleur.
//
//  Utilisation sur une route :
//  router.get('/profil', verifierToken, controller)
//                         ↑ ce middleware s'exécute en premier
// ==============================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware : vérifie que l'utilisateur est connecté
function verifierToken(req, res, next) {
  // Le token est envoyé dans le header : Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // extraire le token après "Bearer "

  if (!token) {
    return res.status(401).json({
      succes: false,
      message: 'Accès refusé — Token manquant. Connectez-vous d\'abord.'
    });
  }

  try {
    // Vérifier et décoder le token
    const utilisateurDecoded = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = utilisateurDecoded; // on attache les infos du user à la requête
    next(); // tout est bon, on passe au contrôleur
  } catch (error) {
    return res.status(403).json({
      succes: false,
      message: 'Token invalide ou expiré. Reconnectez-vous.'
    });
  }
}

// Middleware : vérifie le rôle de l'utilisateur
// Utilisation : verifierRole('admin') ou verifierRole('restaurant', 'admin')
function verifierRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.utilisateur) {
      return res.status(401).json({ succes: false, message: 'Non authentifié.' });
    }

    if (!rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({
        succes: false,
        message: `Accès interdit — Rôle requis : ${rolesAutorises.join(' ou ')}`
      });
    }

    next();
  };
}

module.exports = { verifierToken, verifierRole };
