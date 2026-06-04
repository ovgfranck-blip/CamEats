# CamEats — Documentation API
**Auteur :** Nadia  
**Version :** 1.0.0  
**Base URL :** `http://localhost:3000/api`

---

## Authentification

Toutes les routes privées nécessitent un token JWT dans le header :
```
Authorization: Bearer <token>
```
Le token est obtenu après `/auth/register` ou `/auth/login`.

---

## 1. AUTH — Authentification

### POST /auth/register
Créer un nouveau compte.

**Body JSON :**
```json
{
  "nom": "Paul Dupont",
  "email": "paul@example.cm",
  "mot_de_passe": "MotDePasse123!",
  "telephone": "699123456",
  "role": "client"
}
```
> `role` accepte : `client`, `restaurant`, `livreur`

**Réponse 201 :**
```json
{
  "succes": true,
  "message": "Compte créé avec succès.",
  "token": "eyJhbGci...",
  "utilisateur": { "id": 1, "nom": "Paul Dupont", "email": "paul@example.cm", "role": "client" }
}
```

---

### POST /auth/login
Se connecter.

**Body JSON :**
```json
{
  "email": "paul@example.cm",
  "mot_de_passe": "MotDePasse123!"
}
```

**Réponse 200 :**
```json
{
  "succes": true,
  "message": "Connexion réussie.",
  "token": "eyJhbGci...",
  "utilisateur": { "id": 1, "nom": "Paul Dupont", "role": "client" }
}
```

---

## 2. RESTAURANTS

### GET /restaurants
Liste tous les restaurants actifs avec leur note moyenne.  
**Accès :** Public

**Réponse 200 :**
```json
{
  "succes": true,
  "total": 1,
  "restaurants": [
    {
      "id": 1,
      "nom": "Chez Mama Ngono",
      "adresse": "Bastos, Yaoundé",
      "note_moyenne": 4.5,
      "nombre_avis": 12
    }
  ]
}
```

---

### GET /restaurants/:id
Détails d'un restaurant + menu complet + derniers avis.  
**Accès :** Public

**Réponse 200 :**
```json
{
  "succes": true,
  "restaurant": {
    "id": 1,
    "nom": "Chez Mama Ngono",
    "categories": [
      {
        "id": 1,
        "nom": "Plats locaux",
        "plats": [
          { "id": 1, "nom": "Ndolé complet", "prix": 2500, "disponible": true }
        ]
      }
    ],
    "avis_recents": []
  }
}
```

---

### PUT /restaurants/:id
Modifier les infos de son restaurant.  
**Accès :** Restaurateur connecté (token requis)

**Body JSON (tous les champs sont optionnels) :**
```json
{
  "nom": "Nouveau nom",
  "description": "Nouvelle description",
  "horaires": "Lun-Sam 08h-22h",
  "tarif_base": 500,
  "prix_par_km": 200
}
```

---

## 3. PLATS (DISHES)

### POST /dishes
Ajouter un plat au menu.  
**Accès :** Restaurateur connecté

**Body JSON :**
```json
{
  "category_id": 1,
  "nom": "Poulet rôti",
  "description": "Poulet fermier rôti aux herbes",
  "prix": 3500,
  "disponible": true,
  "plat_du_jour": false
}
```

---

### PUT /dishes/:id
Modifier un plat.  
**Accès :** Restaurateur connecté

**Body JSON (champs optionnels) :**
```json
{
  "prix": 4000,
  "disponible": false,
  "plat_du_jour": true
}
```

---

### DELETE /dishes/:id
Supprimer un plat.  
**Accès :** Restaurateur connecté

**Réponse 200 :**
```json
{ "succes": true, "message": "Plat supprimé avec succès." }
```

---

## 4. COMMANDES (ORDERS)

### POST /orders
Créer une nouvelle commande.  
**Accès :** Client connecté

**Body JSON :**
```json
{
  "restaurant_id": 1,
  "plats": [
    { "dish_id": 1, "quantite": 2 },
    { "dish_id": 4, "quantite": 1 }
  ],
  "adresse_livraison": "Omnisport, Yaoundé",
  "latitude": 3.8667,
  "longitude": 11.5167,
  "mode_paiement": "mobile_money"
}
```
> `mode_paiement` accepte : `mobile_money`, `livraison`

**Réponse 201 :**
```json
{
  "succes": true,
  "message": "Commande créée avec succès.",
  "commande": {
    "id": 1,
    "statut": "en_attente",
    "total_plats": 5500,
    "frais_livraison": 700,
    "total_final": 6200,
    "mode_paiement": "mobile_money"
  }
}
```

---

### GET /orders/:id
Détails complets d'une commande.  
**Accès :** Client, restaurateur, livreur ou admin concerné

**Réponse 200 :**
```json
{
  "succes": true,
  "commande": {
    "id": 1,
    "statut": "en_livraison",
    "restaurant_nom": "Chez Mama Ngono",
    "livreur_nom": "Jean Livreur",
    "livreur_telephone": "699000004",
    "total_final": 6200,
    "plats": [
      { "plat_nom": "Ndolé complet", "quantite": 2, "prix_unitaire": 2500, "sous_total": 5000 }
    ]
  }
}
```

---

### PUT /orders/:id/status
Mettre à jour le statut d'une commande.  
**Accès :** Restaurateur, livreur ou admin

**Body JSON :**
```json
{ "statut": "en_preparation" }
```

**Statuts possibles et qui les change :**
| Statut | Qui ? |
|--------|-------|
| `confirmee` | Restaurant |
| `en_preparation` | Restaurant |
| `prete` | Restaurant |
| `en_livraison` | Livreur (via /deliveries/:id/accept) |
| `livree` | Livreur |
| `annulee` | Restaurant ou Admin |

---

## 5. LIVRAISONS (DELIVERIES)

### GET /deliveries/available
Liste des commandes prêtes sans livreur assigné.  
**Accès :** Livreur connecté

**Réponse 200 :**
```json
{
  "succes": true,
  "total": 2,
  "courses": [
    {
      "commande_id": 1,
      "adresse_livraison": "Omnisport, Yaoundé",
      "montant_course": 700,
      "restaurant_nom": "Chez Mama Ngono",
      "restaurant_adresse": "Bastos, Yaoundé"
    }
  ]
}
```

---

### PUT /deliveries/:id/accept
Accepter une course (`:id` = commande_id).  
**Accès :** Livreur connecté

**Réponse 200 :**
```json
{
  "succes": true,
  "message": "Course acceptée avec succès.",
  "delivery_id": 1,
  "commande": { "id": 1, "adresse_livraison": "Omnisport, Yaoundé" }
}
```

---

## 6. AVIS (REVIEWS)

### POST /reviews
Soumettre un avis après livraison.  
**Accès :** Client connecté (commande livrée uniquement)

**Body JSON :**
```json
{
  "order_id": 1,
  "note_plat": 5,
  "note_livraison": 4,
  "commentaire": "Excellent repas, livraison rapide !"
}
```
> `note_plat` et `note_livraison` : valeur entre 1 et 5

---

## 7. ADMIN

### GET /admin/stats
Statistiques globales de la plateforme.  
**Accès :** Admin uniquement

**Réponse 200 :**
```json
{
  "succes": true,
  "stats": {
    "commandes_aujourdhui": 15,
    "clients_actifs_ce_mois": 47,
    "chiffre_affaires_aujourdhui": 85000,
    "restaurants_en_attente": 3,
    "commandes_7_derniers_jours": [...],
    "top_restaurants": [...]
  }
}
```

---

## Codes d'erreur courants

| Code | Signification |
|------|---------------|
| 400 | Données invalides ou manquantes |
| 401 | Token manquant — non connecté |
| 403 | Accès interdit — rôle insuffisant |
| 404 | Ressource introuvable |
| 409 | Conflit — ressource déjà existante |
| 500 | Erreur serveur interne |

---

## Événements Socket.io (temps réel)

### Rejoindre sa room (à faire au démarrage de l'app)
```javascript
socket.emit('rejoindre_room', userId);
```

### Événements reçus par le CLIENT
| Événement | Déclenché quand |
|-----------|----------------|
| `statut_commande` | Le statut de sa commande change |
| `livreur_assigne` | Un livreur accepte sa commande |

### Événements reçus par le RESTAURANT
| Événement | Déclenché quand |
|-----------|----------------|
| `nouvelle_commande` | Un client passe une commande |

---

*Documentation générée par Nadia — CamEats v1.0.0*
