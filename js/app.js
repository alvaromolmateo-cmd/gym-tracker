// Arranque: enrutado por hash, render de vistas, tema, service worker e instalación PWA.

import { getState, subscribe, activeSession, allSessions } from './store.js';
import { refreshModal, toast } from './ui.js';
import { mountCharts } from './charts.js';
import { todayKey } from './dates.js';
import { mondayOf } from './metrics.js';
import * as train from './views/train.js';
import * as history from './views/history.js';
import * as routine from './views/routine.js';
import * as progress from './views/progress.js';
import * as exercises from './views/exercises.js';
import * as settings from './views/settings.js';

const views = { entreno: train, historial: history, rutina: routine, progreso: progress, ejercicios: exercises, ajustes: settings };
const titles = { entreno: 'Entreno', historial: 'Historial', rutina: 'Rutina', progreso: 'Progreso', ejercicios: 'Ejercicios', ajustes: 'Ajustes' };
const ALIASES = { entrenar: 'entreno' }; // enlaces viejos guardados en el móvil

const ctx = {
  openEntry: null,
  startDay: null,
  startDate: todayKey(),
  week: initialWeek(),
  range: '8',
  exercise: null,
  muscleFilter: 'all',
  installPrompt: null,
  get standalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  },
  set(key, value) {
    ctx[key] = value;
    render();
  },
  applyTheme,
  refreshShell,
  async install() {
    if (!ctx.installPrompt) return;
    ctx.installPrompt.prompt();
    const { outcome } = await ctx.installPrompt.userChoice;
    if (outcome === 'accepted') ctx.installPrompt = null;
    render();
  },
};

// La primera vez conviene abrir el historial donde hay algo que ver.
function initialWeek() {
  const thisWeek = mondayOf(todayKey());
  const sessions = allSessions();
  const last = sessions[sessions.length - 1];
  if (!last) return thisWeek;
  const hasThisWeek = sessions.some((s) => mondayOf(s.date) === thisWeek);
  return hasThisWeek ? thisWeek : mondayOf(last.date);
}

function currentRoute() {
  const raw = location.hash.replace(/^#\/?/, '').split(/[?/]/)[0] || 'entreno';
  const route = ALIASES[raw] || raw;
  return views[route] ? route : 'entreno';
}

let lastRoute = null;
let lastDay = todayKey();

function render() {
  const route = currentRoute();
  const view = views[route];
  const root = document.getElementById('view');

  const scrolls = {};
  root.querySelectorAll('[data-scroll-key]').forEach((el) => { scrolls[el.dataset.scrollKey] = { l: el.scrollLeft, t: el.scrollTop }; });

  root.innerHTML = view.render(ctx);

  root.querySelectorAll('[data-scroll-key]').forEach((el) => {
    const s = scrolls[el.dataset.scrollKey];
    if (s) { el.scrollLeft = s.l; el.scrollTop = s.t; }
  });

  view.mount(root, ctx);
  mountCharts(root);

  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === route;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = `${titles[route]} · GymTracker`;
  refreshShell();

  if (route !== lastRoute) {
    window.scrollTo(0, 0);
    lastRoute = route;
  }
}

function refreshShell() {
  const s = getState().settings;
  document.querySelectorAll('[data-motto]').forEach((el) => { el.textContent = s.motto || ''; });
  document.querySelectorAll('[data-install-shell]').forEach((el) => { el.hidden = !ctx.installPrompt || ctx.standalone; });
  // Aviso en el menú cuando hay un entreno a medias.
  const live = !!activeSession();
  document.querySelectorAll('[data-nav="entreno"]').forEach((el) => el.classList.toggle('is-live', live));
}

function applyTheme() {
  const t = getState().settings.theme;
  const html = document.documentElement;
  if (t === 'auto') html.removeAttribute('data-theme'); else html.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', dark ? '#141111' : '#fcf9f8');
}

// ---------- eventos globales ----------
window.addEventListener('hashchange', render);
subscribe(() => { render(); refreshModal(); });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && todayKey() !== lastDay) {
    lastDay = todayKey();
    ctx.startDate = todayKey();
    ctx.week = mondayOf(todayKey());
    render();
  }
});

// Instalación PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  ctx.installPrompt = e;
  refreshShell();
  if (currentRoute() === 'ajustes') render();
});
window.addEventListener('appinstalled', () => {
  ctx.installPrompt = null;
  toast('Aplicación instalada');
  render();
});
document.querySelectorAll('[data-install-shell]').forEach((b) => b.addEventListener('click', () => ctx.install()));

// Service worker (solo funciona en https o localhost)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker no registrado:', err));
  });
}

applyTheme();
render();
