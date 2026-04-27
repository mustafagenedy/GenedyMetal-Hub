/* ---------------------------------------------------------------------
   theme.js — shared theme + language controls for every page
   - Restores saved theme (or OS preference) before first paint
     when included with `defer` in <head>
   - Injects a floating toggle in the bottom-right of every page
   - Persists choice in localStorage('gm-theme')
   - Mirrors language switch ('en' / 'ar') across HTML/ ↔ HTML-AR/ folders
   --------------------------------------------------------------------- */
(function () {
  'use strict';

  const THEME_KEY = 'gm-theme';
  const LANG_KEY  = 'gm-lang';

  // -------- THEME --------
  function preferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById('gm-theme-toggle');
    if (btn) {
      const isLight = theme === 'light';
      btn.setAttribute('aria-pressed', String(isLight));
      btn.setAttribute('aria-label',
        isLight ? 'Switch to dark mode' : 'Switch to light mode');
      btn.innerHTML = isLight
        ? '<i class="fas fa-moon" aria-hidden="true"></i>'
        : '<i class="fas fa-sun" aria-hidden="true"></i>';
    }
  }

  // Apply ASAP to avoid a flash of dark on light-preferring users
  applyTheme(preferredTheme());

  // -------- LANG --------
  function detectLang() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/HTML-AR/')) return 'ar';
    return 'en';
  }

  // Robust to both forms of the URL:
  //   /HTML/main.html  ↔  /HTML-AR/main-ar.html  (with extension)
  //   /HTML/main       ↔  /HTML-AR/main-ar       (Vercel cleanUrls / no extension)
  function arUrlFor(currentPath) {
    let file = currentPath.split('/').pop() || 'main.html';
    if (!/-ar(\.html)?$/.test(file)) {
      file = /\.html$/.test(file)
        ? file.replace(/\.html$/, '-ar.html')
        : file + '-ar';
    }
    return currentPath.replace(/\/HTML\/[^/]+$/, `/HTML-AR/${file}`);
  }

  function enUrlFor(currentPath) {
    const file = (currentPath.split('/').pop() || 'main-ar.html')
      .replace(/-ar(\.html)?$/, '$1');
    return currentPath.replace(/\/HTML-AR\/[^/]+$/, `/HTML/${file}`);
  }

  function switchLang(target) {
    const path = window.location.pathname;
    const url = target === 'ar' ? arUrlFor(path) : enUrlFor(path);
    localStorage.setItem(LANG_KEY, target);
    window.location.href = url;
  }

  // -------- INJECT FLOATING CONTROLS --------
  function injectControls() {
    if (document.getElementById('gm-floating-controls')) return;
    document.documentElement.setAttribute('data-floating-controls', 'on');

    const wrap = document.createElement('div');
    wrap.id = 'gm-floating-controls';
    wrap.className = 'gm-floating-controls';

    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.id = 'gm-theme-toggle';
    themeBtn.className = 'gm-theme-toggle';
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });

    const langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.id = 'gm-lang-toggle';
    langBtn.className = 'gm-lang-toggle';
    const lang = detectLang();
    langBtn.textContent = lang === 'ar' ? 'EN' : 'AR';
    langBtn.setAttribute('aria-label',
      lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    langBtn.addEventListener('click', () => switchLang(lang === 'ar' ? 'en' : 'ar'));

    wrap.appendChild(themeBtn);
    wrap.appendChild(langBtn);
    document.body.appendChild(wrap);

    // Sync icon now that the button exists
    applyTheme(document.documentElement.getAttribute('data-theme') || preferredTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectControls);
  } else {
    injectControls();
  }

  // React to OS theme changes if user hasn't explicitly chosen
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener?.('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'light' : 'dark');
  });

  // Expose helpers (handy for console/debug)
  window.gmTheme = { apply: applyTheme, preferred: preferredTheme };
})();
