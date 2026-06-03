// ==============================================
//  controllers/authController.js
//  Inscription et Connexion des utilisateurs
// ==============================================

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/database');
require('dotenv').config();

// ----------------------------------------------
//  POST /api/auth/register
//  Inscrire un nouvel utilisateur
// ----------------------------------------------
async function register(req, res) {
  try {
    // 1. Récupérer les données envoyées par le client
    const { nom, email, mot_de_passe, telephone, role } = req.body;

    // 2. Vérifier que les champs obligatoires sont présents
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Nom, email et mot de passe sont obligatoires.'
      });
    }

    // 3. Vérifier que le rôle est valide (pas admin via cette route)
    const rolesAutorises = ['client', 'restaurant', 'livreur'];
    const roleUtilisateur = role || 'client';
    if (!rolesAutorises.includes(roleUtilisateur)) {
      return res.status(400).json({
        succes: false,
        message: 'Rôle invalide.'
      });
    }

    // 4. Vérifier si l'email existe déjà
    const [utilisateursExistants] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (utilisateursExistants.length > 0) {
      return res.status(409).json({
        succes: false,
        message: 'Cet email est déjà utilisé.'
      });
    }

    // 5. Hasher le mot de passe (jamais stocker en clair !)
    // Le chiffre 10 = "salt rounds" : plus c'est élevé, plus c'est sécurisé mais lent
    const motDePasseHashe = await bcrypt.hash(mot_de_passe, 10);

    // 6. Insérer l'utilisateur dans la base
    const [resultat] = await pool.query(
      'INSERT INTO users (nom, email, mot_de_passe, telephone, role) VALUES (?, ?, ?, ?, ?)',
      [nom, email, motDePasseHashe, telephone || null, roleUtilisateur]
    );

    // 7. Générer le token JWT
    const token = jwt.sign(
      {
        id   : resultat.insertId,
        email: email,
        role : roleUtilisateur
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 8. Répondre avec succès
    return res.status(201).json({
      succes : true,
      message: 'Compte créé avec succès.',
      token  : token,
      utilisateur: {
        id   : resultat.insertId,
        nom  : nom,
        email: email,
        role : roleUtilisateur
      }
    });

  } catch (error) {
    console.error('Erreur register:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur serveur. Réessayez plus tard.'
    });
  }
}

// ----------------------------------------------
//  POST /api/auth/login
//  Connecter un utilisateur existant
// ----------------------------------------------
async function login(req, res) {
  try {
    // 1. Récupérer email et mot de passe
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Email et mot de passe obligatoires.'
      });
    }

    // 2. Chercher l'utilisateur par email
    const [utilisateurs] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (utilisateurs.length === 0) {
      return res.status(401).json({
        succes: false,
        message: 'Email ou mot de passe incorrect.'
        // Note : on ne dit pas "email introuvable" pour des raisons de sécurité
      });
    }

    const utilisateur = utilisateurs[0];

    // 3. Vérifier que le compte n'est pas suspendu
    if (!utilisateur.actif) {
      return res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu. Contactez l\'administrateur.'
      });
    }

    // 4. Comparer le mot de passe avec le hash stocké
    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({
        succes: false,
        message: 'Email ou mot de passe incorrect.'
      });
    }

    // 5. Générer le token JWT
    const token = jwt.sign(
      {
        id   : utilisateur.id,
        email: utilisateur.email,
        role : utilisateur.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 6. Répondre avec le token et les infos du user
    return res.status(200).json({
      succes: true,
      message: 'Connexion réussie.',
      token  : token,
      utilisateur: {
        id       : utilisateur.id,
        nom      : utilisateur.nom,
        email    : utilisateur.email,
        role     : utilisateur.role,
        telephone: utilisateur.telephone
      }
    });

  } catch (error) {
    console.error('Erreur login:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur serveur. Réessayez plus tard.'
    });
  }
}

module.exports = { register, login };
