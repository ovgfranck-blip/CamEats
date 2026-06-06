/* =============================================
   livreur.js — Logique de l'espace livreur
   Auteur : Aubin
   Coordonne-toi avec Nadia pour les routes API
   ============================================= */

'use strict';

const API_BASE_URL = 'http://localhost:3000/api';
const NOTIFICATION_TIMEOUT = 30;

let livreurStatus = 'disponible';
let currentDeliveryId = null;
let timerInterval = null;

/* -----------------------------------------------
   UTILITAIRES
   ----------------------------------------------- */

const formatFCFA = (amount) => `${amount.toLocaleString('fr-FR')} FCFA`;

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const showEmptyState = (containerId, message) => {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = `<p class="empty-state">${message}</p>`;
};

/* -----------------------------------------------
   STATUT LIVREUR
   ----------------------------------------------- */

const updateStatusButton = (status) => {
  const btn = document.getElementById('toggleStatus');
  if (!btn) return;
  btn.textContent = status === 'disponible' ? 'Disponible' : 'En course';
  btn.className = `btn-status ${status}`;
};

const toggleLivreurStatus = async () => {
  const newStatus = livreurStatus === 'disponible' ? 'en-course' : 'disponible';
  try {
    /* TODO: PUT /api/livreur/status — route Nadia */
    livreurStatus = newStatus;
    updateStatusButton(livreurStatus);
  } catch (error) {
    console.error('Erreur mise à jour statut :', error);
  }
};

/* -----------------------------------------------
   DASHBOARD
   ----------------------------------------------- */

const createCourseCard = (course) => `
  <div class="course-item">
    <p class="course-restaurant">🍽 ${course.restaurantName}</p>
    <p class="course-meta">📍 ${course.clientAddress} · ${course.distance} km</p>
    <p class="course-montant">${formatFCFA(course.amount)}</p>
  </div>
`;

const loadAvailableCourses = async () => {
  const list = document.getElementById('coursesList');
  const badge = document.getElementById('coursesCount');
  if (!list) return;
  try {
    /* TODO: GET /api/deliveries/available — route Nadia */
    const courses = [];
    if (courses.length === 0) {
      list.innerHTML = '<p class="empty-state">Aucune course disponible pour le moment.</p>';
      if (badge) badge.textContent = '0';
      return;
    }
    list.innerHTML = courses.map(createCourseCard).join('');
    if (badge) badge.textContent = courses.length;
  } catch (error) {
    console.error('Erreur chargement courses :', error);
    showEmptyState('coursesList', 'Impossible de charger les courses.');
  }
};

const loadSoldeJour = async () => {
  const soldeEl = document.getElementById('soldeJour');
  if (!soldeEl) return;
  try {
    /* TODO: GET /api/livreur/earnings/today — route Nadia */
    soldeEl.textContent = formatFCFA(0);
  } catch (error) {
    console.error('Erreur chargement solde :', error);
  }
};

/* -----------------------------------------------
   NOTIFICATION
   ----------------------------------------------- */

const showCourseNotification = (course) => {
  const overlay = document.getElementById('notificationOverlay');
  if (!overlay) return;
  document.getElementById('notifRestaurant').textContent = course.restaurantName;
  document.getElementById('notifAdresseClient').textContent = course.clientAddress;
  document.getElementById('notifDistance').textContent = `${course.distance} km`;
  document.getElementById('notifMontant').textContent = formatFCFA(course.amount);
  overlay.style.display = 'flex';
  startNotificationTimer(course.id);
};

const startNotificationTimer = (courseId) => {
  let secondsLeft = NOTIFICATION_TIMEOUT;
  const timerFill = document.getElementById('timerFill');
  const timerCount = document.getElementById('timerCount');
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsLeft -= 1;
    if (timerCount) timerCount.textContent = secondsLeft;
    if (timerFill) timerFill.style.width = `${(secondsLeft / NOTIFICATION_TIMEOUT) * 100}%`;
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      closeCourseNotification();
    }
  }, 1000);
};

const closeCourseNotification = () => {
  const overlay = document.getElementById('notificationOverlay');
  if (overlay) overlay.style.display = 'none';
  if (timerInterval) clearInterval(timerInterval);
};

const accepterCourse = async (courseId) => {
  try {
    /* TODO: PUT /api/deliveries/:id/accept — route Nadia */
    currentDeliveryId = courseId;
    livreurStatus = 'en-course';
    updateStatusButton(livreurStatus);
    closeCourseNotification();
    window.location.href = 'livreur-map.html';
  } catch (error) {
    console.error('Erreur acceptation course :', error);
  }
};

const refuserCourse = async (courseId) => {
  try {
    /* TODO: PUT /api/deliveries/:id/decline — route Nadia */
    closeCourseNotification();
  } catch (error) {
    console.error('Erreur refus course :', error);
  }
};

/* -----------------------------------------------
   STATUTS DE LIVRAISON
   ----------------------------------------------- */

const updateDeliveryStatus = async (newStatus) => {
  if (!currentDeliveryId) return;
  const statusMessages = {
    'en_route_restaurant': '🚗 En route vers le restaurant',
    'commande_recuperee': '📦 Commande récupérée',
    'en_route_client': '🚗 En route vers le client',
    'livre': '✅ Commande livrée !',
  };
  try {
    /* TODO: PUT /api/deliveries/:id/status — route Nadia */
    const statusText = document.getElementById('statusText');
    if (statusText) statusText.textContent = statusMessages[newStatus] || newStatus;
  } catch (error) {
    console.error('Erreur mise à jour statut livraison :', error);
  }
};

/* -----------------------------------------------
   HISTORIQUE
   ----------------------------------------------- */

const createHistoriqueItem = (course) => `
  <div class="historique-item">
    <div class="historique-info">
      <span class="historique-date">${formatDate(course.date)}</span>
      <span class="historique-restaurant">${course.restaurantName}</span>
      <span class="historique-distance">${course.distance} km</span>
    </div>
    <span class="historique-montant">${formatFCFA(course.amount)}</span>
  </div>
`;

const loadHistorique = async (period = 'today') => {
  const list = document.getElementById('historiqueList');
  if (!list) return;
  try {
    /* TODO: GET /api/livreur/history?period=today — route Nadia */
    const courses = [];
    list.innerHTML = courses.length === 0
      ? '<p class="empty-state">Aucune course pour cette période.</p>'
      : courses.map(createHistoriqueItem).join('');
  } catch (error) {
    console.error('Erreur chargement historique :', error);
    showEmptyState('historiqueList', "Impossible de charger l'historique.");
  }
};

/* -----------------------------------------------
   REVENUS
   ----------------------------------------------- */

const loadRevenus = async (period = 'today') => {
  try {
    /* TODO: GET /api/livreur/earnings?period=today — route Nadia */
    const data = { total: 0, nbCourses: 0, distanceTotale: 0, moyenneCourse: 0, courses: [] };
    const el = (id) => document.getElementById(id);
    if (el('totalRevenus')) el('totalRevenus').textContent = formatFCFA(data.total);
    if (el('nbCourses')) el('nbCourses').textContent = data.nbCourses;
    if (el('distanceTotale')) el('distanceTotale').textContent = `${data.distanceTotale} km`;
    if (el('moyenneCourse')) el('moyenneCourse').textContent = formatFCFA(data.moyenneCourse);
    const list = el('revenusList');
    if (list) {
      list.innerHTML = data.courses.length === 0
        ? '<p class="empty-state">Aucun revenu pour cette période.</p>'
        : data.courses.map(createHistoriqueItem).join('');
    }
  } catch (error) {
    console.error('Erreur chargement revenus :', error);
  }
};

/* -----------------------------------------------
   FILTRES DE PÉRIODE
   ----------------------------------------------- */

const initPeriodFilters = (loadFn) => {
  const filters = document.querySelectorAll('.btn-filter');
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadFn(btn.dataset.period);
    });
  });
};

/* -----------------------------------------------
   INITIALISATION
   ----------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname;

  if (page.includes('livreur-dashboard')) {
    loadSoldeJour();
    loadAvailableCourses();
    const toggleBtn = document.getElementById('toggleStatus');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleLivreurStatus);
  }

  if (page.includes('livreur-notification')) {
    const btnAccepter = document.getElementById('btnAccepter');
    const btnRefuser = document.getElementById('btnRefuser');
    if (btnAccepter) btnAccepter.addEventListener('click', () => accepterCourse(currentDeliveryId));
    if (btnRefuser) btnRefuser.addEventListener('click', () => refuserCourse(currentDeliveryId));
  }

  if (page.includes('livreur-map')) {
    const btnRecuperer = document.getElementById('btnRecuperer');
    const btnLivrer = document.getElementById('btnLivrer');
    if (btnRecuperer) {
      btnRecuperer.style.display = 'flex';
      btnRecuperer.addEventListener('click', () => {
        updateDeliveryStatus('commande_recuperee');
        btnRecuperer.style.display = 'none';
        if (btnLivrer) btnLivrer.style.display = 'flex';
      });
    }
    if (btnLivrer) {
      btnLivrer.addEventListener('click', () => {
        updateDeliveryStatus('livre');
        setTimeout(() => { window.location.href = 'livreur-dashboard.html'; }, 1500);
      });
    }
  }

  if (page.includes('livreur-historique')) {
    loadHistorique('today');
    initPeriodFilters(loadHistorique);
  }

  if (page.includes('livreur-revenus')) {
    loadRevenus('today');
    initPeriodFilters(loadRevenus);
  }
});