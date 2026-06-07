/* =============================================
   livreur.js — Espace Livreur CamEats
   Auteur : Aubin
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
const formatFCFA = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`;
const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});
const el = (id) => document.getElementById(id);
const setText = (id, val) => { if (el(id)) el(id).textContent = val; };

/* Salutation selon l'heure */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

/* -----------------------------------------------
   STATUT LIVREUR
   ----------------------------------------------- */
const initStatusPill = () => {
  const btns = document.querySelectorAll('.s-btn');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      livreurStatus = btn.dataset.status;
      /* TODO: PUT /api/livreur/status — route Nadia */
    });
  });
};

/* -----------------------------------------------
   DASHBOARD
   ----------------------------------------------- */
const createCourseCard = (course) => `
  <div class="course-card highlight">
    <div class="course-top">
      <div>
        <div class="course-resto">${course.restaurantName}</div>
        <div class="course-adresse">${course.restaurantAddress} → ${course.clientAddress}</div>
      </div>
      <span class="badge badge-orange">${formatFCFA(course.amount)}</span>
    </div>
    <div class="course-meta">
      📍 ${course.distance} km · <span>~${course.estimatedTime} min</span><br>
      🍽 ${course.itemsCount || 1} article(s) · ⏰ il y a <span>${course.minutesAgo || 1} min</span>
    </div>
    <div class="timer-wrap">
      <div class="timer-track">
        <div class="timer-fill" id="timer_${course.id}" style="width:100%;"></div>
      </div>
      <div class="timer-row">
        <span>Expire dans</span>
        <span id="timerText_${course.id}">${NOTIFICATION_TIMEOUT}s</span>
      </div>
    </div>
    <div class="course-actions">
      <button class="btn-refuse" onclick="refuserCourse(${course.id})">✕ Refuser</button>
      <button class="btn-accept" onclick="accepterCourse(${course.id})">✓ Accepter la course</button>
    </div>
  </div>
`;

const loadAvailableCourses = async () => {
  const list = el('coursesList');
  if (!list) return;
  try {
    /* TODO: GET /api/deliveries/available — route Nadia */
    const courses = [];
    if (courses.length === 0) {
      list.innerHTML = '<p class="empty-state">🛵 Aucune course disponible pour le moment.</p>';
      return;
    }
    list.innerHTML = courses.map(createCourseCard).join('');
    courses.forEach((c) => startCourseTimer(c.id));
  } catch (e) {
    console.error('Erreur chargement courses :', e);
  }
};

const loadDashboardStats = async () => {
  try {
    /* TODO: GET /api/livreur/stats/today — route Nadia */
    const greeting = el('greetingText');
    if (greeting) greeting.textContent = `${getGreeting()}, Aubin 👋`;
  } catch (e) {
    console.error('Erreur stats :', e);
  }
};

/* Timer individuel par course */
const startCourseTimer = (courseId) => {
  let left = NOTIFICATION_TIMEOUT;
  const fill = el(`timer_${courseId}`);
  const txt = el(`timerText_${courseId}`);
  const interval = setInterval(() => {
    left -= 1;
    if (fill) fill.style.width = `${(left / NOTIFICATION_TIMEOUT) * 100}%`;
    if (txt) txt.textContent = `${left}s`;
    if (left <= 0) {
      clearInterval(interval);
      const card = fill?.closest('.course-card');
      if (card) card.remove();
    }
  }, 1000);
};

/* -----------------------------------------------
   ACCEPTER / REFUSER
   ----------------------------------------------- */
const accepterCourse = async (courseId) => {
  try {
    /* TODO: PUT /api/deliveries/:id/accept — route Nadia */
    currentDeliveryId = courseId;
    livreurStatus = 'en-course';
    window.location.href = 'livreur-map.html';
  } catch (e) {
    console.error('Erreur acceptation :', e);
  }
};

const refuserCourse = async (courseId) => {
  try {
    /* TODO: PUT /api/deliveries/:id/decline — route Nadia */
    const card = document.querySelector(`#timer_${courseId}`)?.closest('.course-card');
    if (card) card.remove();
  } catch (e) {
    console.error('Erreur refus :', e);
  }
};

/* -----------------------------------------------
   NOTIFICATION OVERLAY
   ----------------------------------------------- */
const showCourseNotification = (course) => {
  const overlay = el('notificationOverlay');
  if (!overlay) return;
  setText('notifRestaurant', course.restaurantName);
  setText('notifAdresseClient', course.clientAddress);
  setText('notifDistance', `${course.distance} km`);
  setText('notifMontant', formatFCFA(course.amount));
  overlay.style.display = 'flex';
  startNotificationTimer(course.id);
};

const startNotificationTimer = (courseId) => {
  let left = NOTIFICATION_TIMEOUT;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    left -= 1;
    const fill = el('timerFill');
    const count = el('timerCount');
    if (fill) fill.style.width = `${(left / NOTIFICATION_TIMEOUT) * 100}%`;
    if (count) count.textContent = left;
    if (left <= 0) { clearInterval(timerInterval); closeNotification(); }
  }, 1000);
};

const closeNotification = () => {
  const overlay = el('notificationOverlay');
  if (overlay) overlay.style.display = 'none';
  if (timerInterval) clearInterval(timerInterval);
};

/* -----------------------------------------------
   CARTE GPS — STATUTS DE LIVRAISON
   ----------------------------------------------- */
const updateDeliveryStatus = async (newStatus) => {
  const messages = {
    'en_route_restaurant': '🚗 En route vers le restaurant',
    'commande_recuperee': '📦 Commande récupérée — En route vers le client',
    'en_route_client': '🚗 En route vers le client',
    'livre': '✅ Commande livrée !',
  };
  try {
    /* TODO: PUT /api/deliveries/:id/status — route Nadia */
    setText('statusText', messages[newStatus] || newStatus);
    setText('statusBanner', messages[newStatus] || newStatus);
  } catch (e) {
    console.error('Erreur statut livraison :', e);
  }
};

/* -----------------------------------------------
   HISTORIQUE
   ----------------------------------------------- */
const createHistItem = (c) => `
  <div class="hist-item">
    <div class="hist-icon">🍽</div>
    <div class="hist-info">
      <div class="hist-name">${c.restaurantName}</div>
      <div class="hist-meta">${formatDate(c.date)} · ${c.distance} km · ⭐ ${c.rating || '—'}</div>
    </div>
    <div class="hist-right">
      <div class="hist-amount">${Number(c.amount).toLocaleString('fr-FR')}</div>
      <span class="badge ${c.status === 'livre' ? 'badge-green' : 'badge-gray'}" style="margin-top:4px;">
        ${c.status === 'livre' ? 'Livré' : 'Annulé'}
      </span>
    </div>
  </div>
`;

const loadHistorique = async (period = 'today') => {
  const list = el('historiqueList');
  if (!list) return;
  try {
    /* TODO: GET /api/livreur/history?period=today — route Nadia */
    const courses = [];
    list.innerHTML = courses.length
      ? courses.map(createHistItem).join('')
      : '<p class="empty-state">Aucune course pour cette période.</p>';
  } catch (e) {
    console.error('Erreur historique :', e);
  }
};

/* -----------------------------------------------
   REVENUS
   ----------------------------------------------- */
const loadRevenus = async (period = 'today') => {
  try {
    /* TODO: GET /api/livreur/earnings?period=today — route Nadia */
    const data = { total: 0, nbCourses: 0, distanceTotale: 0, moyenneCourse: 0, courses: [] };
    setText('totalRevenus', formatFCFA(data.total));
    setText('nbCourses', data.nbCourses);
    setText('distanceTotale', `${data.distanceTotale} km`);
    setText('moyenneCourse', data.moyenneCourse.toLocaleString('fr-FR'));
    const list = el('revenusList');
    if (list) {
      list.innerHTML = data.courses.length
        ? data.courses.map(createHistItem).join('')
        : '<p class="empty-state">Aucun revenu pour cette période.</p>';
    }
  } catch (e) {
    console.error('Erreur revenus :', e);
  }
};

/* -----------------------------------------------
   FILTRES PÉRIODE (réutilisable)
   ----------------------------------------------- */
const initPeriodFilters = (loadFn, selector = '.btn-filter, .ptab') => {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(selector).forEach((b) => b.classList.remove('active'));
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
    loadDashboardStats();
    loadAvailableCourses();
    initStatusPill();
  }

  if (page.includes('livreur-notification')) {
    el('btnAccepter')?.addEventListener('click', () => accepterCourse(currentDeliveryId));
    el('btnRefuser')?.addEventListener('click', () => refuserCourse(currentDeliveryId));
  }

  if (page.includes('livreur-map')) {
    const btnRec = el('btnRecuperer');
    const btnLiv = el('btnLivrer');
    if (btnRec) {
      btnRec.style.display = 'flex';
      btnRec.addEventListener('click', () => {
        updateDeliveryStatus('commande_recuperee');
        btnRec.style.display = 'none';
        if (btnLiv) btnLiv.style.display = 'flex';
      });
    }
    if (btnLiv) {
      btnLiv.addEventListener('click', () => {
        updateDeliveryStatus('livre');
        setTimeout(() => { window.location.href = 'livreur-dashboard.html'; }, 1500);
      });
    }
  }

  if (page.includes('livreur-historique')) {
    loadHistorique('today');
    initPeriodFilters(loadHistorique, '.btn-filter');
  }

  if (page.includes('livreur-revenus')) {
    loadRevenus('today');
    initPeriodFilters(loadRevenus, '.ptab');
  }
});