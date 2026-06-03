-- =============================================================
--  CamEats — Schéma complet de la base de données MySQL
--  Auteur   : Nadia
--  Branche  : feature/backend-bdd
--  Version  : 1.0 — 2025
-- =============================================================
-- Ce fichier crée TOUTES les tables dans le bon ordre.
-- L'ordre est important à cause des clés étrangères (FK) :
-- une table ne peut pas référencer une table qui n'existe pas encore.
-- Ordre : users → restaurants → categories → dishes
--        → orders → order_items → deliveries → payments → reviews → notifications
-- =============================================================

-- Bonne pratique : on supprime la BDD si elle existe déjà
-- (utile pour repartir propre en développement)
DROP DATABASE IF EXISTS cameats_db;
CREATE DATABASE cameats_db
  CHARACTER SET utf8mb4        -- supporte tous les caractères, emojis inclus
  COLLATE utf8mb4_unicode_ci;  -- comparaisons insensibles à la casse, accents OK

USE cameats_db;

-- =============================================================
-- TABLE 1 : users
-- Tous les utilisateurs de la plateforme (clients, restaurants,
-- livreurs, admins) sont dans cette seule table.
-- Le champ `role` distingue qui est qui.
-- =============================================================
CREATE TABLE users (
  id             INT           NOT NULL AUTO_INCREMENT,
  nom            VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL,
  mot_de_passe   VARCHAR(255)  NOT NULL,  -- TOUJOURS stocké hashé (bcrypt)
  telephone      VARCHAR(20)   NULL,
  role           ENUM('client','restaurant','livreur','admin') NOT NULL DEFAULT 'client',
  actif          BOOLEAN       NOT NULL DEFAULT TRUE,  -- pour suspendre un compte
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)          -- deux comptes avec le même email : interdit
);

-- =============================================================
-- TABLE 2 : restaurants
-- Chaque restaurant est lié à un user (son propriétaire).
-- Contient toutes les infos nécessaires pour la page vitrine
-- et le calcul des frais de livraison.
-- =============================================================
CREATE TABLE restaurants (
  id                  INT           NOT NULL AUTO_INCREMENT,
  user_id             INT           NOT NULL,              -- le propriétaire (role='restaurant')
  nom                 VARCHAR(150)  NOT NULL,
  description         TEXT          NULL,
  logo                VARCHAR(255)  NULL,                  -- chemin vers l'image du logo
  banniere            VARCHAR(255)  NULL,                  -- chemin vers l'image de bannière
  adresse             VARCHAR(255)  NOT NULL,
  latitude            DECIMAL(10,8) NULL,                  -- coordonnées GPS (ex: 3.86667)
  longitude           DECIMAL(11,8) NULL,                  -- coordonnées GPS (ex: 11.51667)
  horaires            VARCHAR(255)  NULL,                  -- ex: "Lun-Sam 08h-22h"
  zone_livraison_km   DECIMAL(5,2)  NOT NULL DEFAULT 5.00, -- rayon max en km
  tarif_base          DECIMAL(10,2) NOT NULL DEFAULT 500,  -- frais fixes en FCFA
  prix_par_km         DECIMAL(10,2) NOT NULL DEFAULT 200,  -- FCFA par km supplémentaire
  statut              ENUM('en_attente','actif','suspendu') NOT NULL DEFAULT 'en_attente',
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_restaurants_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE   -- si le user est supprimé, son restaurant aussi
);

-- =============================================================
-- TABLE 3 : categories
-- Les catégories du menu d'un restaurant (Entrées, Plats, etc.)
-- ordre_affichage permet de trier les onglets dans l'interface.
-- =============================================================
CREATE TABLE categories (
  id                INT           NOT NULL AUTO_INCREMENT,
  restaurant_id     INT           NOT NULL,
  nom               VARCHAR(100)  NOT NULL,    -- ex: "Plats locaux", "Boissons"
  ordre_affichage   INT           NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  CONSTRAINT fk_categories_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE CASCADE
);

-- =============================================================
-- TABLE 4 : dishes (plats)
-- Chaque plat appartient à une catégorie (et donc à un restaurant).
-- `disponible` et `plat_du_jour` sont des booléens simples
-- que le restaurateur peut changer en un clic.
-- =============================================================
CREATE TABLE dishes (
  id            INT             NOT NULL AUTO_INCREMENT,
  category_id   INT             NOT NULL,
  nom           VARCHAR(150)    NOT NULL,
  description   TEXT            NULL,
  photo         VARCHAR(255)    NULL,
  prix          DECIMAL(10,2)   NOT NULL,          -- en FCFA
  disponible    BOOLEAN         NOT NULL DEFAULT TRUE,
  plat_du_jour  BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_dishes_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE CASCADE
);

-- =============================================================
-- TABLE 5 : orders (commandes)
-- La commande principale. Elle lie le client, le restaurant
-- et le livreur. `livreur_id` peut être NULL au départ
-- (aucun livreur assigné avant l'acceptation).
-- =============================================================
CREATE TABLE orders (
  id                  INT             NOT NULL AUTO_INCREMENT,
  client_id           INT             NOT NULL,
  restaurant_id       INT             NOT NULL,
  livreur_id          INT             NULL,     -- NULL jusqu'à assignation
  adresse_livraison   VARCHAR(255)    NOT NULL,
  latitude            DECIMAL(10,8)   NULL,
  longitude           DECIMAL(11,8)   NULL,
  statut              ENUM(
                        'en_attente',       -- commande reçue, pas encore confirmée
                        'confirmee',        -- restaurant a confirmé
                        'en_preparation',   -- cuisine en cours
                        'prete',            -- prête, attend le livreur
                        'en_livraison',     -- livreur en route
                        'livree',           -- livraison confirmée
                        'annulee'           -- annulée (client ou restaurant)
                      ) NOT NULL DEFAULT 'en_attente',
  total_plats         DECIMAL(10,2)   NOT NULL,   -- somme des prix des plats
  frais_livraison     DECIMAL(10,2)   NOT NULL,   -- calculé par le backend
  total_final         DECIMAL(10,2)   NOT NULL,   -- total_plats + frais_livraison
  mode_paiement       ENUM('mobile_money','livraison') NOT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_orders_client
    FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT fk_orders_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_orders_livreur
    FOREIGN KEY (livreur_id) REFERENCES users(id)
);

-- =============================================================
-- TABLE 6 : order_items (détail d'une commande)
-- Une commande peut contenir plusieurs plats.
-- On stocke le `prix_unitaire` au moment de la commande
-- pour garder un historique (le prix peut changer après).
-- =============================================================
CREATE TABLE order_items (
  id              INT             NOT NULL AUTO_INCREMENT,
  order_id        INT             NOT NULL,
  dish_id         INT             NOT NULL,
  quantite        INT             NOT NULL DEFAULT 1,
  prix_unitaire   DECIMAL(10,2)   NOT NULL,   -- prix figé au moment de la commande

  PRIMARY KEY (id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_dish
    FOREIGN KEY (dish_id) REFERENCES dishes(id)
);

-- =============================================================
-- TABLE 7 : deliveries (livraisons)
-- Suit précisément l'état d'une livraison, séparément de la commande.
-- `temps_estime` est en minutes.
-- =============================================================
CREATE TABLE deliveries (
  id              INT       NOT NULL AUTO_INCREMENT,
  order_id        INT       NOT NULL,
  livreur_id      INT       NOT NULL,
  statut          ENUM(
                    'acceptee',
                    'vers_restaurant',
                    'commande_recuperee',
                    'vers_client',
                    'livree'
                  ) NOT NULL DEFAULT 'acceptee',
  temps_estime    INT       NULL,    -- minutes estimées
  created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at    DATETIME  NULL,    -- NULL jusqu'à la livraison effective

  PRIMARY KEY (id),
  CONSTRAINT fk_deliveries_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_deliveries_livreur
    FOREIGN KEY (livreur_id) REFERENCES users(id)
);

-- =============================================================
-- TABLE 8 : payments (paiements)
-- Trace chaque transaction. `reference_transaction` est le
-- numéro renvoyé par MTN/Orange Money.
-- =============================================================
CREATE TABLE payments (
  id                    INT             NOT NULL AUTO_INCREMENT,
  order_id              INT             NOT NULL,
  montant               DECIMAL(10,2)   NOT NULL,
  mode                  ENUM('mobile_money','livraison') NOT NULL,
  statut                ENUM('en_attente','paye','echoue') NOT NULL DEFAULT 'en_attente',
  reference_transaction VARCHAR(100)    NULL,   -- ID fourni par l'opérateur mobile
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
);

-- =============================================================
-- TABLE 9 : reviews (avis)
-- Le client donne une note au plat ET à la livraison.
-- Lié à la commande pour s'assurer qu'on ne note que ce qu'on a reçu.
-- =============================================================
CREATE TABLE reviews (
  id              INT       NOT NULL AUTO_INCREMENT,
  client_id       INT       NOT NULL,
  order_id        INT       NOT NULL,
  restaurant_id   INT       NOT NULL,
  livreur_id      INT       NULL,          -- peut être NULL (paiement à la livraison sans livreur)
  note_plat       TINYINT   NOT NULL,      -- 1 à 5 étoiles
  note_livraison  TINYINT   NULL,
  commentaire     TEXT      NULL,
  created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_order (order_id),  -- une seule review par commande
  CONSTRAINT fk_reviews_client
    FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT fk_reviews_order
    FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_reviews_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_reviews_livreur
    FOREIGN KEY (livreur_id) REFERENCES users(id),
  CONSTRAINT chk_note_plat
    CHECK (note_plat BETWEEN 1 AND 5),
  CONSTRAINT chk_note_livraison
    CHECK (note_livraison IS NULL OR note_livraison BETWEEN 1 AND 5)
);

-- =============================================================
-- TABLE 10 : notifications
-- Toutes les notifications de la plateforme (nouvelle commande,
-- statut mis à jour, etc.) passent par cette table.
-- Socket.io lira ici pour pousser les alertes en temps réel.
-- =============================================================
CREATE TABLE notifications (
  id          INT           NOT NULL AUTO_INCREMENT,
  user_id     INT           NOT NULL,
  titre       VARCHAR(150)  NOT NULL,
  message     TEXT          NOT NULL,
  lu          BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- =============================================================
-- INDEX supplémentaires pour les requêtes fréquentes
-- Un index accélère les recherches sur les colonnes très utilisées.
-- =============================================================
CREATE INDEX idx_orders_client       ON orders(client_id);
CREATE INDEX idx_orders_restaurant   ON orders(restaurant_id);
CREATE INDEX idx_orders_livreur      ON orders(livreur_id);
CREATE INDEX idx_orders_statut       ON orders(statut);
CREATE INDEX idx_dishes_disponible   ON dishes(disponible);
CREATE INDEX idx_notifications_user  ON notifications(user_id, lu);

-- =============================================================
-- DONNÉES DE TEST (seed)
-- Insère des données réalistes pour que toute l'équipe
-- puisse tester ses interfaces sans attendre.
-- Mot de passe pour tous les comptes test : "Test1234!"
-- Hash bcrypt de "Test1234!" :
-- $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.usFpxNH7q
-- =============================================================

-- Utilisateurs de test
INSERT INTO users (nom, email, mot_de_passe, telephone, role) VALUES
('Admin CamEats',    'admin@cameats.cm',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.usFpxNH7q', '699000001', 'admin'),
('Resto Chez Mama',  'mama@restaurant.cm',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.usFpxNH7q', '699000002', 'restaurant'),
('Paul Client',      'paul@client.cm',        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.usFpxNH7q', '699000003', 'client'),
('Jean Livreur',     'jean@livreur.cm',       '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.usFpxNH7q', '699000004', 'livreur');

-- Restaurant de test
INSERT INTO restaurants (user_id, nom, description, adresse, latitude, longitude, statut) VALUES
(2, 'Chez Mama Ngono', 'Cuisine camerounaise authentique', 'Bastos, Yaoundé', 3.8784, 11.5151, 'actif');

-- Catégories de test
INSERT INTO categories (restaurant_id, nom, ordre_affichage) VALUES
(1, 'Plats locaux',  1),
(1, 'Boissons',      2),
(1, 'Desserts',      3);

-- Plats de test
INSERT INTO dishes (category_id, nom, description, prix, disponible, plat_du_jour) VALUES
(1, 'Ndolé complet',   'Ndolé avec plantain et poisson fumé', 2500, TRUE, TRUE),
(1, 'Poulet DG',       'Poulet braisé sauce tomate et légumes', 3000, TRUE, FALSE),
(1, 'Eru et water fufu','Légumes eru avec water fufu', 2000, TRUE, FALSE),
(2, 'Jus de bissap',   'Jus de fleur d\'hibiscus maison', 500,  TRUE, FALSE),
(2, 'Top citron',      'Boisson gazeuse citron', 300,  TRUE, FALSE);
