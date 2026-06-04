// ==============================================
//  controllers/orderController.js
//  Gestion des commandes
//
//  POST /api/orders              → créer une commande (client)
//  GET  /api/orders/:id          → détails d'une commande
//  PUT  /api/orders/:id/status   → mettre à jour le statut
// ==============================================

const { pool } = require('../config/database');

// ----------------------------------------------
//  Fonction utilitaire
//  Calcule les frais de livraison automatiquement
//  Formule : tarif_base + (distance_km * prix_par_km)
//  Si pas de coordonnées GPS → tarif de base uniquement
// ----------------------------------------------
function calculerFraisLivraison(restaurant, latClient, lngClient) {
  if (!latClient || !lngClient || !restaurant.latitude || !restaurant.longitude) {
    return restaurant.tarif_base; // pas de GPS → tarif fixe
  }

  // Formule Haversine simplifiée pour calculer la distance en km
  const R = 6371; // rayon de la Terre en km
  const dLat = (latClient - restaurant.latitude) * Math.PI / 180;
  const dLng = (lngClient - restaurant.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(restaurant.latitude * Math.PI / 180) *
    Math.cos(latClient * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Vérifier que le client est dans la zone de livraison
  if (distance > restaurant.zone_livraison_km) {
    return null; // hors zone — commande impossible
  }

  const frais = restaurant.tarif_base + (distance * restaurant.prix_par_km);
  return Math.round(frais); // arrondi en FCFA
}

// ----------------------------------------------
//  POST /api/orders
//  Créer une nouvelle commande
//  Utilisé par : Astou (espace client)
// ----------------------------------------------
async function creerCommande(req, res) {
  // On utilise une transaction : si une étape échoue,
  // TOUT est annulé — pas de commande à moitié créée
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      restaurant_id,
      plats,            // tableau : [{dish_id, quantite}]
      adresse_livraison,
      latitude,
      longitude,
      mode_paiement
    } = req.body;

    // 1. Validation des champs obligatoires
    if (!restaurant_id || !plats || !plats.length || !adresse_livraison || !mode_paiement) {
      return res.status(400).json({
        succes: false,
        message: 'restaurant_id, plats, adresse_livraison et mode_paiement sont obligatoires.'
      });
    }

    // 2. Récupérer les infos du restaurant (pour calcul livraison)
    const [restaurants] = await connection.query(
      'SELECT * FROM restaurants WHERE id = ? AND statut = "actif"',
      [restaurant_id]
    );
    if (restaurants.length === 0) {
      return res.status(404).json({ succes: false, message: 'Restaurant introuvable.' });
    }
    const restaurant = restaurants[0];

    // 3. Calculer les frais de livraison
    const fraisLivraison = calculerFraisLivraison(restaurant, latitude, longitude);
    if (fraisLivraison === null) {
      return res.status(400).json({
        succes: false,
        message: `Adresse hors zone de livraison. Zone maximale : ${restaurant.zone_livraison_km} km.`
      });
    }

    // 4. Vérifier chaque plat et calculer le total
    let totalPlats = 0;
    const platsVerifies = [];

    for (const item of plats) {
      const [dishes] = await connection.query(
        'SELECT * FROM dishes WHERE id = ? AND disponible = TRUE',
        [item.dish_id]
      );

      if (dishes.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          succes: false,
          message: `Plat ID ${item.dish_id} introuvable ou épuisé.`
        });
      }

      const plat = dishes[0];
      const quantite = item.quantite || 1;
      totalPlats += plat.prix * quantite;
      platsVerifies.push({ plat, quantite });
    }

    const totalFinal = totalPlats + fraisLivraison;

    // 5. Créer la commande principale
    const [commandeResult] = await connection.query(`
      INSERT INTO orders
        (client_id, restaurant_id, adresse_livraison, latitude, longitude,
         total_plats, frais_livraison, total_final, mode_paiement)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.utilisateur.id,
      restaurant_id,
      adresse_livraison,
      latitude  || null,
      longitude || null,
      totalPlats,
      fraisLivraison,
      totalFinal,
      mode_paiement
    ]);

    const commandeId = commandeResult.insertId;

    // 6. Insérer les détails de la commande (order_items)
    for (const { plat, quantite } of platsVerifies) {
      await connection.query(`
        INSERT INTO order_items (order_id, dish_id, quantite, prix_unitaire)
        VALUES (?, ?, ?, ?)
      `, [commandeId, plat.id, quantite, plat.prix]);
    }

    // 7. Créer l'entrée de paiement
    await connection.query(`
      INSERT INTO payments (order_id, montant, mode, statut)
      VALUES (?, ?, ?, ?)
    `, [
      commandeId,
      totalFinal,
      mode_paiement,
      mode_paiement === 'livraison' ? 'en_attente' : 'en_attente'
    ]);

    // 8. Notifier le restaurant (Socket.io)
    const io = req.app.get('io');
    io.to(`user_${restaurant.user_id}`).emit('nouvelle_commande', {
      commande_id  : commandeId,
      total        : totalFinal,
      client_id    : req.utilisateur.id
    });

    // 9. Créer une notification en base pour le restaurant
    await connection.query(`
      INSERT INTO notifications (user_id, titre, message)
      VALUES (?, ?, ?)
    `, [
      restaurant.user_id,
      'Nouvelle commande !',
      `Vous avez reçu une nouvelle commande de ${totalFinal} FCFA.`
    ]);

    // Tout s'est bien passé → on valide la transaction
    await connection.commit();

    return res.status(201).json({
      succes   : true,
      message  : 'Commande créée avec succès.',
      commande : {
        id             : commandeId,
        statut         : 'en_attente',
        total_plats    : totalPlats,
        frais_livraison: fraisLivraison,
        total_final    : totalFinal,
        mode_paiement  : mode_paiement
      }
    });

  } catch (error) {
    await connection.rollback(); // annuler tout en cas d'erreur
    console.error('Erreur creerCommande:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  } finally {
    connection.release();
  }
}

// ----------------------------------------------
//  GET /api/orders/:id
//  Détails d'une commande avec statut en temps réel
//  Utilisé par : Astou (suivi commande)
// ----------------------------------------------
async function getCommandeParId(req, res) {
  try {
    const { id } = req.params;

    // Récupérer la commande
    const [commandes] = await pool.query(`
      SELECT
        o.*,
        r.nom        AS restaurant_nom,
        r.adresse    AS restaurant_adresse,
        r.telephone  AS restaurant_telephone,
        u.nom        AS livreur_nom,
        u.telephone  AS livreur_telephone
      FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      LEFT JOIN users u  ON u.id = o.livreur_id
      WHERE o.id = ?
    `, [id]);

    if (commandes.length === 0) {
      return res.status(404).json({ succes: false, message: 'Commande introuvable.' });
    }

    const commande = commandes[0];

    // Vérifier que l'utilisateur a le droit de voir cette commande
    const estClient      = commande.client_id      === req.utilisateur.id;
    const estLivreur     = commande.livreur_id     === req.utilisateur.id;
    const estAdmin       = req.utilisateur.role    === 'admin';

    // Le restaurateur peut aussi voir ses propres commandes
    const [resto] = await pool.query(
      'SELECT user_id FROM restaurants WHERE id = ?',
      [commande.restaurant_id]
    );
    const estRestaurateur = resto[0]?.user_id === req.utilisateur.id;

    if (!estClient && !estLivreur && !estAdmin && !estRestaurateur) {
      return res.status(403).json({ succes: false, message: 'Accès interdit.' });
    }

    // Récupérer les plats de la commande
    const [items] = await pool.query(`
      SELECT
        oi.quantite,
        oi.prix_unitaire,
        d.nom         AS plat_nom,
        d.photo       AS plat_photo,
        (oi.quantite * oi.prix_unitaire) AS sous_total
      FROM order_items oi
      JOIN dishes d ON d.id = oi.dish_id
      WHERE oi.order_id = ?
    `, [id]);

    commande.plats = items;

    return res.status(200).json({ succes: true, commande });

  } catch (error) {
    console.error('Erreur getCommandeParId:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
}

// ----------------------------------------------
//  PUT /api/orders/:id/status
//  Mettre à jour le statut d'une commande
//  + déclencher les notifications Socket.io
//  Utilisé par : Franck (confirmer), Aubin (livraison)
// ----------------------------------------------
async function mettreAJourStatut(req, res) {
  try {
    const { id }     = req.params;
    const { statut } = req.body;

    const statutsValides = [
      'confirmee', 'en_preparation', 'prete',
      'en_livraison', 'livree', 'annulee'
    ];

    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        succes: false,
        message: `Statut invalide. Valeurs acceptées : ${statutsValides.join(', ')}`
      });
    }

    // Récupérer la commande
    const [commandes] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (commandes.length === 0) {
      return res.status(404).json({ succes: false, message: 'Commande introuvable.' });
    }
    const commande = commandes[0];

    // Mettre à jour le statut
    await pool.query('UPDATE orders SET statut = ? WHERE id = ?', [statut, id]);

    // Notifier le client en temps réel (Socket.io)
    const io = req.app.get('io');
    io.to(`user_${commande.client_id}`).emit('statut_commande', {
      commande_id: id,
      statut     : statut
    });

    // Enregistrer la notification en base pour le client
    const messages = {
      confirmee      : 'Votre commande a été confirmée par le restaurant !',
      en_preparation : 'Votre commande est en cours de préparation.',
      prete          : 'Votre commande est prête ! Un livreur va la récupérer.',
      en_livraison   : 'Votre livreur est en route vers vous !',
      livree         : 'Commande livrée ! Bon appétit 🍽️',
      annulee        : 'Votre commande a été annulée.'
    };

    await pool.query(`
      INSERT INTO notifications (user_id, titre, message)
      VALUES (?, 'Mise à jour commande', ?)
    `, [commande.client_id, messages[statut]]);

    // Si commande livrée → mettre à jour le paiement
    if (statut === 'livree' && commande.mode_paiement === 'livraison') {
      await pool.query(
        'UPDATE payments SET statut = "paye" WHERE order_id = ?',
        [id]
      );
    }

    return res.status(200).json({
      succes : true,
      message: `Statut mis à jour : ${statut}`,
      commande_id: id,
      nouveau_statut: statut
    });

  } catch (error) {
    console.error('Erreur mettreAJourStatut:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
}

module.exports = { creerCommande, getCommandeParId, mettreAJourStatut };
