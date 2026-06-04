// ============================================
// CamEats — client.js
// Fonctions JavaScript de l'espace client
// Auteur : Astou
// ============================================

// ---------------------------------------------------
// Charge les restaurants depuis l'API backend
// @param {string} dishName - Nom du plat à rechercher
// @returns {Promise<Array>} - Liste des restaurants proposant ce plat
// ---------------------------------------------------
async function fetchRestaurantsByDish(dishName) {
  try {
    const response = await fetch('/api/restaurants?dish=' + encodeURIComponent(dishName));
    const data = await response.json();
    return data;
  } catch (error) {
    // Afficher une erreur à l'utilisateur si l'API ne répond pas
    console.error('Erreur lors du chargement des restaurants :', error);
    return [];
  }
}

// ---------------------------------------------------
// Formate un prix en FCFA
// @param {number} amount - Montant à formater
// @returns {string} - Prix formaté ex: "2 500 FCFA"
// ---------------------------------------------------
function formatPrice(amount) {
  return amount.toLocaleString('fr-FR') + ' FCFA';
}