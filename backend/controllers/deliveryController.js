// ==============================================
//  controllers/deliveryController.js
//  Gestion des livraisons — pour Aubin (espace livreur)
//
//  GET /api/deliveries/available  → courses disponibles
//  PUT /api/deliveries/:id/accept → accepter une course
// ==============================================

const { pool } = require('../config/database');

// ----------------------------------------------
//  GET /api/deliveries/available
//  Retourner les commandes prêtes sans livreur
//  Utilisé par : Aubin (notifications de course)
// ----------------------------------------------
async function getCoursesDisponibles(req, res) {
  try {
    const [courses] = await pool.query(`
      SELECT
        o.id              AS commande_id,
        o.adresse_livraison,
        o.latitude        AS lat_client,
        o.longitude       AS lng_client,
        o.total_final,
        o.frais_livraison AS montant_course,
        o.created_at,
        r.nom             AS restaurant_nom,
        r.adresse         AS restaurant_adresse,
        r.latitude        AS lat_restaurant,
        r.longitude       AS lng_restaurant
      FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      WHERE o.statut = 'prete'        -- commande prête à être récupérée
        AND o.livreur_id IS NULL       -- pas encore assignée à un livreur
      ORDER BY o.created_at ASC       -- les plus anciennes en premier
    `);

    return res.status(200).json({
      succes : true,
      total  : courses.length,
      courses: courses
    });

  } catch (error) {
    console.error('Erreur getCoursesDisponibles:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
}

// ----------------------------------------------
//  PUT /api/deliveries/:id/accept
//  Le livreur accepte une course
//  :id = commande_id
//  Utilisé par : Aubin
// ----------------------------------------------
async function accepterCourse(req, res) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params; // id de la commande

    // Vérifier que la commande est toujours disponible
    // (un autre livreur n'a pas déjà accepté)
    const [commandes] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND statut = "prete" AND livreur_id IS NULL',
      [id]
    );

    if (commandes.length === 0) {
      return res.status(409).json({
        succes: false,
        message: 'Cette course n\'est plus disponible.'
      });
    }

    const commande = commandes[0];

    // Assigner le livreur à la commande
    await connection.query(
      'UPDATE orders SET livreur_id = ?, statut = "en_livraison" WHERE id = ?',
      [req.utilisateur.id, id]
    );

    // Créer l'entrée dans la table deliveries
    const [deliveryResult] = await connection.query(`
      INSERT INTO deliveries (order_id, livreur_id, statut, temps_estime)
      VALUES (?, ?, 'acceptee', 30)
    `, [id, req.utilisateur.id]);

    // Notifier le client que son livreur est en route (Socket.io)
    const io = req.app.get('io');
    io.to(`user_${commande.client_id}`).emit('livreur_assigne', {
      commande_id: id,
      livreur_id : req.utilisateur.id,
      statut     : 'en_livraison'
    });

    // Notification en base pour le client
    await connection.query(`
      INSERT INTO notifications (user_id, titre, message)
      VALUES (?, 'Livreur assigné', 'Un livreur a accepté votre commande et arrive bientôt !')
    `, [commande.client_id]);

    await connection.commit();

    return res.status(200).json({
      succes    : true,
      message   : 'Course acceptée avec succès.',
      delivery_id: deliveryResult.insertId,
      commande  : {
        id                : id,
        adresse_livraison : commande.adresse_livraison,
        restaurant_id     : commande.restaurant_id
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur accepterCourse:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  } finally {
    connection.release();
  }
}

module.exports = { getCoursesDisponibles, accepterCourse };
