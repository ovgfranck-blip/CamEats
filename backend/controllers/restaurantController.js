// ==============================================
//  controllers/restaurantController.js
//  Gestion des restaurants
//
//  3 routes publiques (sans token) :
//    - GET /api/restaurants        → liste tous les restaurants
//    - GET /api/restaurants/:id    → détails + menu complet
//
//  1 route privée (token requis, rôle restaurant) :
//    - PUT /api/restaurants/:id    → modifier son restaurant
// ==============================================

const { pool } = require('../config/database');

// ----------------------------------------------
//  GET /api/restaurants
//  Retourner tous les restaurants actifs
//  Utilisé par : Astou (page liste), Yohann (accueil)
// ----------------------------------------------
async function getTousLesRestaurants(req, res) {
  try {
    // Récupérer les restaurants actifs avec leur note moyenne
    const [restaurants] = await pool.query(`
      SELECT
        r.id,
        r.nom,
        r.description,
        r.logo,
        r.banniere,
        r.adresse,
        r.latitude,
        r.longitude,
        r.horaires,
        r.zone_livraison_km,
        r.tarif_base,
        r.prix_par_km,
        ROUND(AVG(rv.note_plat), 1) AS note_moyenne,
        COUNT(rv.id)                AS nombre_avis
      FROM restaurants r
      LEFT JOIN orders o   ON o.restaurant_id = r.id
      LEFT JOIN reviews rv ON rv.restaurant_id = r.id
      WHERE r.statut = 'actif'
      GROUP BY r.id
      ORDER BY note_moyenne DESC
    `);

    return res.status(200).json({
      succes: true,
      total: restaurants.length,
      restaurants: restaurants
    });

  } catch (error) {
    console.error('Erreur getTousLesRestaurants:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur serveur.'
    });
  }
}

// ----------------------------------------------
//  GET /api/restaurants/:id
//  Retourner UN restaurant avec son menu complet
//  Utilisé par : Franck (page vitrine), Astou (commande)
// ----------------------------------------------
async function getRestaurantParId(req, res) {
  try {
    const { id } = req.params;

    // 1. Récupérer les infos du restaurant
    const [restaurants] = await pool.query(`
      SELECT
        r.*,
        ROUND(AVG(rv.note_plat), 1) AS note_moyenne,
        COUNT(DISTINCT rv.id)        AS nombre_avis
      FROM restaurants r
      LEFT JOIN reviews rv ON rv.restaurant_id = r.id
      WHERE r.id = ? AND r.statut = 'actif'
      GROUP BY r.id
    `, [id]);

    if (restaurants.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Restaurant introuvable.'
      });
    }

    const restaurant = restaurants[0];

    // 2. Récupérer les catégories du restaurant
    const [categories] = await pool.query(`
      SELECT * FROM categories
      WHERE restaurant_id = ?
      ORDER BY ordre_affichage ASC
    `, [id]);

    // 3. Pour chaque catégorie, récupérer ses plats
    for (const categorie of categories) {
      const [plats] = await pool.query(`
        SELECT * FROM dishes
        WHERE category_id = ?
        ORDER BY plat_du_jour DESC, nom ASC
      `, [categorie.id]);

      categorie.plats = plats; // on attache les plats à leur catégorie
    }

    // 4. Récupérer les derniers avis (max 10)
    const [avis] = await pool.query(`
      SELECT
        rv.note_plat,
        rv.note_livraison,
        rv.commentaire,
        rv.created_at,
        u.nom AS nom_client
      FROM reviews rv
      JOIN users u ON u.id = rv.client_id
      WHERE rv.restaurant_id = ?
      ORDER BY rv.created_at DESC
      LIMIT 10
    `, [id]);

    // 5. Assembler la réponse complète
    restaurant.categories = categories;
    restaurant.avis_recents = avis;

    return res.status(200).json({
      succes: true,
      restaurant: restaurant
    });

  } catch (error) {
    console.error('Erreur getRestaurantParId:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur serveur.'
    });
  }
}

// ----------------------------------------------
//  PUT /api/restaurants/:id
//  Modifier les infos de son restaurant
//  Réservé au restaurateur connecté (token requis)
//  Utilisé par : Franck (tableau de bord)
// ----------------------------------------------
async function modifierRestaurant(req, res) {
  try {
    const { id } = req.params;

    // Vérifier que le restaurant appartient bien à l'utilisateur connecté
    const [restaurants] = await pool.query(
      'SELECT * FROM restaurants WHERE id = ? AND user_id = ?',
      [id, req.utilisateur.id]
    );

    if (restaurants.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Vous n\'êtes pas autorisé à modifier ce restaurant.'
      });
    }

    // Récupérer les champs à modifier (on ne modifie que ce qui est envoyé)
    const {
      nom,
      description,
      logo,
      banniere,
      adresse,
      latitude,
      longitude,
      horaires,
      zone_livraison_km,
      tarif_base,
      prix_par_km
    } = req.body;

    await pool.query(`
      UPDATE restaurants SET
        nom               = COALESCE(?, nom),
        description       = COALESCE(?, description),
        logo              = COALESCE(?, logo),
        banniere          = COALESCE(?, banniere),
        adresse           = COALESCE(?, adresse),
        latitude          = COALESCE(?, latitude),
        longitude         = COALESCE(?, longitude),
        horaires          = COALESCE(?, horaires),
        zone_livraison_km = COALESCE(?, zone_livraison_km),
        tarif_base        = COALESCE(?, tarif_base),
        prix_par_km       = COALESCE(?, prix_par_km)
      WHERE id = ?
    `, [
      nom, description, logo, banniere, adresse,
      latitude, longitude, horaires,
      zone_livraison_km, tarif_base, prix_par_km,
      id
    ]);

    // Retourner le restaurant mis à jour
    const [restaurantMisAJour] = await pool.query(
      'SELECT * FROM restaurants WHERE id = ?', [id]
    );

    return res.status(200).json({
      succes: true,
      message: 'Restaurant mis à jour avec succès.',
      restaurant: restaurantMisAJour[0]
    });

  } catch (error) {
    console.error('Erreur modifierRestaurant:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur serveur.'
    });
  }
}

module.exports = {
  getTousLesRestaurants,
  getRestaurantParId,
  modifierRestaurant
};
