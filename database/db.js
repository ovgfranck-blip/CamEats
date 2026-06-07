// ============================================
// CamEats — database/db.js
// Connexion à la base de données MySQL
// ============================================

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'cameats'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Erreur connexion MySQL :', err.message);
    return;
  }
  console.log('✅ Connecté à la base de données MySQL');
});

module.exports = connection;