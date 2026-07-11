import '../css/main.css';
import './player.js';

// Initial dark/light apply is inlined in default.hbs to avoid FOUC.
// This module binds the header toggle + the mobile drawer.

const STORAGE_KEY = 'pod-color-scheme';

function applyScheme(scheme) {
  document.documentElement.setAttribute('data-color-scheme', scheme);
  document.querySelectorAll('[data-pod-toggle-scheme]').forEach((btn) => {
    btn.setAttribute('aria-pressed', scheme === 'dark' ? 'true' : 'false');
    const sun = btn.querySelector('[data-icon-sun]');
    const moon = btn.querySelector('[data-icon-moon]');
    if (sun) sun.style.display = scheme === 'dark' ? '' : 'none';
    if (moon) moon.style.display = scheme === 'dark' ? 'none' : '';
  });
}

function bindSchemeToggle() {
  document.querySelectorAll('[data-pod-toggle-scheme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-color-scheme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* ignore quota / private mode */
      }
      applyScheme(next);
    });
  });
}

function bindMobileMenu() {
  const button = document.querySelector('[data-pod-toggle-menu]');
  const menu = document.querySelector('[data-pod-mobile-menu]');
  if (!button || !menu) return;

  const setOpen = (open) => {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('hidden', !open);
    const iconMenu = button.querySelector('[data-icon-menu]');
    const iconClose = button.querySelector('[data-icon-close]');
    if (iconMenu) iconMenu.style.display = open ? 'none' : '';
    if (iconClose) iconClose.style.display = open ? '' : 'none';
    document.body.style.overflow = open ? 'hidden' : '';
  };

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    setOpen(!isOpen);
  });

  menu.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });

  // Tailwind sm: breakpoint — close the mobile drawer if we cross it.
  const mq = window.matchMedia('(min-width: 640px)');
  mq.addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

// Follow system preference only when the user hasn't picked manually.
function bindSystemPreference() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      /* ignore */
    }
    if (!stored) {
      applyScheme(e.matches ? 'dark' : 'light');
    }
  });
}

function init() {
  bindSchemeToggle();
  bindSystemPreference();
  bindMobileMenu();
  applyScheme(document.documentElement.getAttribute('data-color-scheme') || 'light');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
