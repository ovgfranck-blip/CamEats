// ==============================================
//  config/database.js
//  Connexion à la base de données MySQL
//  On utilise un "pool" de connexions :
//  au lieu d'ouvrir/fermer une connexion à chaque
//  requête, on garde un stock de connexions prêtes.
//  C'est plus rapide et plus stable.
// ==============================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Création du pool de connexions
const pool = mysql.createPool({
  host     : process.env.DB_HOST,      // localhost
  port     : process.env.DB_PORT,      // 3306
  user     : process.env.DB_USER,      // root
  password : process.env.DB_PASSWORD,  // vide avec XAMPP
  database : process.env.DB_NAME,      // cameats_db
  waitForConnections: true,   // attendre si toutes les connexions sont occupées
  connectionLimit   : 10,     // max 10 connexions simultanées
  queueLimit        : 0       // file d'attente illimitée
});

// Test de la connexion au démarrage du serveur
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connexion MySQL réussie — Base de données:', process.env.DB_NAME);
    connection.release(); // remettre la connexion dans le pool
  } catch (error) {
    console.error('❌ Erreur connexion MySQL:', error.message);
    process.exit(1); // arrêter le serveur si la BDD est inaccessible
  }
}

module.exports = { pool, testConnection };
