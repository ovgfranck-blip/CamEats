/* =============================================
   global.js — Fonctions communes CamEats
   À ne modifier qu'après accord de toute l'équipe
   ============================================= */

'use strict';

/* Récupère le token d'authentification stocké localement */
const getAuthToken = () => localStorage.getItem('cameats_token');

/* Vérifie si l'utilisateur est connecté, sinon redirige vers login */
const requireAuth = () => {
  if (!getAuthToken()) {
    window.location.href = '/pages/login.html';
  }
};
