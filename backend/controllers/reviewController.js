// ==============================================
//  controllers/reviewController.js
//  Gestion des avis clients
//
//  POST /api/reviews → soumettre un avis après livraison
// ==============================================

const { pool } = require('../config/database');

async function soumettreAvis(req, res) {
  try {
    const {
      order_id,
      note_plat,
      note_livraison,
      commentaire
    } = req.body;

    if (!order_id || !note_plat) {
      return res.status(400).json({
        succes: false,
        message: 'order_id et note_plat sont obligatoires.'
      });
    }

    // Vérifier que la commande appartient au client connecté et est livrée
    const [commandes] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND client_id = ? AND statut = "livree"',
      [order_id, req.utilisateur.id]
    );

    if (commandes.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Commande introuvable ou non encore livrée.'
      });
    }

    const commande = commandes[0];

    // Insérer l'avis
    const [resultat] = await pool.query(`
      INSERT INTO reviews
        (client_id, order_id, restaurant_id, livreur_id, note_plat, note_livraison, commentaire)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.utilisateur.id,
      order_id,
      commande.restaurant_id,
      commande.livreur_id || null,
      note_plat,
      note_livraison || null,
      commentaire    || null
    ]);

    return res.status(201).json({
      succes : true,
      message: 'Avis soumis avec succès. Merci !',
      avis_id: resultat.insertId
    });

  } catch (error) {
    // Erreur duplicate key = avis déjà soumis pour cette commande
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        succes: false,
        message: 'Vous avez déjà noté cette commande.'
      });
    }
    console.error('Erreur soumettreAvis:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
}

module.exports = { soumettreAvis };
