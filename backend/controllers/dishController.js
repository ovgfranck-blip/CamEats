// ==============================================
//  controllers/dishController.js
//  Gestion des plats du menu
//
//  POST   /api/dishes          → ajouter un plat
//  PUT    /api/dishes/:id      → modifier un plat
//  DELETE /api/dishes/:id      → supprimer un plat
//
//  Toutes ces routes sont PRIVÉES (restaurateur connecté)
// ==============================================

const { pool } = require('../config/database');

// ----------------------------------------------
//  Fonction utilitaire
//  Vérifie que le plat appartient bien au restaurateur connecté
// ----------------------------------------------
async function verifierProprietairePlat(dishId, userId) {
  const [result] = await pool.query(`
    SELECT d.id
    FROM dishes d
    JOIN categories c    ON c.id = d.category_id
    JOIN restaurants r   ON r.id = c.restaurant_id
    WHERE d.id = ? AND r.user_id = ?
  `, [dishId, userId]);
  return result.length > 0;
}

// ----------------------------------------------
//  POST /api/dishes
//  Ajouter un nouveau plat au menu
// ----------------------------------------------
async function ajouterPlat(req, res) {
  try {
    const { category_id, nom, description, photo, prix, disponible, plat_du_jour } = req.body;

    // Validation des champs obligatoires
    if (!category_id || !nom || !prix) {
      return res.status(400).json({
        succes: false,
        message: 'category_id, nom et prix sont obligatoires.'
      });
    }

    // Vérifier que la catégorie appartient bien au restaurateur connecté
    const [categories] = await pool.query(`
      SELECT c.id FROM categories c
      JOIN restaurants r ON r.id = c.restaurant_id
      WHERE c.id = ? AND r.user_id = ?
    `, [category_id, req.utilisateur.id]);

    if (categories.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Catégorie introuvable ou non autorisée.'
      });
    }

    // Insérer le plat
    const [resultat] = await pool.query(`
      INSERT INTO dishes (category_id, nom, description, photo, prix, disponible, plat_du_jour)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id,
      nom,
      description || null,
      photo       || null,
      prix,
      disponible  !== undefined ? disponible  : true,
      plat_du_jour !== undefined ? plat_du_jour : false
    ]);

    return res.status(201).json({
      succes : true,
      message: 'Plat ajouté avec succès.',
      plat   : { id: resultat.insertId, nom, prix }
    });

  } catch (error) {
    console.error('Erreur ajouterPlat:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
}

// ----------------------------------------------
//  PUT /api/dishes/:id
//  Modifier un plat (prix, dispo, plat du jour)
// ----------------------------------------------
async function modifierPlat(req, res) {
  try {
    const { id } = req.params;

    // Vérifier que ce plat appartient au restaurateur connecté
    const estProprietaire = await verifierProprietairePlat(id, req.utilisateur.id);
    if (!estProprietaire) {
      return res.status(403).json({
        succes: false,
        message: 'Vous n\'êtes pas autorisé à modifier ce plat.'
      });
    }

    const { nom, description, photo, prix, disponible, plat_du_jour } = req.body;

    // Si on marque ce plat comme "plat_du_jour", retirer ce badge des autres plats du même restaurant
    if (plat_du_jour === true) {
      await pool.query(`
        UPDATE dishes d
        JOIN categories c  ON c.id = d.category_id
        JOIN restaurants r ON r.id = c.restaurant_id
        SET d.plat_du_jour = FALSE
        WHERE r.user_id = ?
      `, [req.utilisateur.id]);
    }

    await pool.query(`
      UPDATE dishes SET
        nom          = COALESCE(?, nom),
        description  = COALESCE(?, description),
        photo        = COALESCE(?, photo),
        prix         = COALESCE(?, prix),
        disponible   = COALESCE(?, disponible),
        plat_du_jour = COALESCE(?, plat_du_jour)
      WHERE id = ?
    `, [nom, description, photo, prix, disponible, plat_du_jour, id]);

    const [platMisAJour] = await pool.query('SELECT * FROM dishes WHERE id = ?', [id]);

    return res.status(200).json({
      succes : true,
      message: 'Plat mis à jour avec succès.',
      plat   : platMisAJour[0]
    });

  } catch (error) {
    console.error('Erreur modifierPlat:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
}

// ----------------------------------------------
//  DELETE /api/dishes/:id
//  Supprimer un plat du menu
// ----------------------------------------------
async function supprimerPlat(req, res) {
  try {
    const { id } = req.params;

    // Vérifier que ce plat appartient au restaurateur connecté
    const estProprietaire = await verifierProprietairePlat(id, req.utilisateur.id);
    if (!estProprietaire) {
      return res.status(403).json({
        succes: false,
        message: 'Vous n\'êtes pas autorisé à supprimer ce plat.'
      });
    }

    await pool.query('DELETE FROM dishes WHERE id = ?', [id]);

    return res.status(200).json({
      succes : true,
      message: 'Plat supprimé avec succès.'
    });

  } catch (error) {
    console.error('Erreur supprimerPlat:', error);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
}

module.exports = { ajouterPlat, modifierPlat, supprimerPlat };
