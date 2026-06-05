// ==============================================
//  controllers/adminController.js
//  Statistiques globales pour Yohann (dashboard admin)
//
//  GET /api/admin/stats → statistiques de la plateforme
// ==============================================

const { pool } = require('../config/database');

async function getStats(req, res) {
  try {
    // Toutes les stats en parallèle pour aller plus vite
    const [
      [commandesAujourdhui],
      [clientsActifs],
      [chiffreAffaires],
      [restaurantsEnAttente],
      [commandesParJour],
      [topRestaurants]
    ] = await Promise.all([

      // Commandes du jour
      pool.query(`
        SELECT COUNT(*) AS total
        FROM orders
        WHERE DATE(created_at) = CURDATE()
          AND statut != 'annulee'
      `),

      // Clients actifs (ont commandé ce mois-ci)
      pool.query(`
        SELECT COUNT(DISTINCT client_id) AS total
        FROM orders
        WHERE MONTH(created_at) = MONTH(CURDATE())
          AND YEAR(created_at)  = YEAR(CURDATE())
      `),

      // Chiffre d'affaires du jour
      pool.query(`
        SELECT COALESCE(SUM(total_final), 0) AS total
        FROM orders
        WHERE DATE(created_at) = CURDATE()
          AND statut = 'livree'
      `),

      // Restaurants en attente de validation
      pool.query(`
        SELECT COUNT(*) AS total
        FROM restaurants
        WHERE statut = 'en_attente'
      `),

      // Commandes des 7 derniers jours (pour le graphique)
      pool.query(`
        SELECT
          DATE(created_at)    AS jour,
          COUNT(*)            AS nombre_commandes,
          SUM(total_final)    AS chiffre_affaires
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND statut != 'annulee'
        GROUP BY DATE(created_at)
        ORDER BY jour ASC
      `),

      // Top 5 restaurants par nombre de commandes
      pool.query(`
        SELECT
          r.nom,
          COUNT(o.id)         AS nombre_commandes,
          SUM(o.total_final)  AS chiffre_affaires
        FROM restaurants r
        LEFT JOIN orders o ON o.restaurant_id = r.id AND o.statut = 'livree'
        GROUP BY r.id
        ORDER BY nombre_commandes DESC
        LIMIT 5
      `)
    ]);

    return res.status(200).json({
      succes: true,
      stats : {
        commandes_aujourdhui      : commandesAujourdhui[0].total,
        clients_actifs_ce_mois    : clientsActifs[0].total,
        chiffre_affaires_aujourdhui: chiffreAffaires[0].total,
        restaurants_en_attente    : restaurantsEnAttente[0].total,
        commandes_7_derniers_jours: commandesParJour,
        top_restaurants           : topRestaurants
      }
    });

  } catch (error) {
    console.error('Erreur getStats:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
}

module.exports = { getStats };
