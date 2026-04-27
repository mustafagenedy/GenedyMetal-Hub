/* ---------------------------------------------------------------------
   api.js — shared fetch wrapper for the Genedy Metal backend.

   - Always sends credentials (cookies) so the HttpOnly auth cookie
     reaches the server.
   - For state-changing requests (POST/PUT/PATCH/DELETE), reads the
     `gm-csrf` cookie and adds an X-CSRF-Token header (double-submit
     CSRF pattern).
   - Auto-redirects to the welcome page on 401 (session expired).
   --------------------------------------------------------------------- */
(function (global) {
    'use strict';

    // Pick the backend origin once.
    //   - localhost / 127.0.0.1   → http://localhost:3000   (dev)
    //   - any other host          → /api                    (prod, via Vercel rewrite to Render)
    //   - explicit override       → set window.GM_API_BASE before this file loads
    const API_BASE = global.GM_API_BASE || (
        /^(localhost|127\.0\.0\.1)$/.test(global.location.hostname)
            ? 'http://localhost:3000'
            : '/api'
    );

    function readCookie(name) {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

    /**
     * apiFetch(path, options)
     *   path:    "/users/signin"  (resolved against API_BASE)
     *   options: same as fetch(), with one extra: { json: <obj> } sets
     *            Content-Type and stringifies for you.
     */
    async function apiFetch(path, options = {}) {
        const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
        const method = (options.method || 'GET').toUpperCase();
        const headers = new Headers(options.headers || {});

        let body = options.body;
        if (options.json !== undefined) {
            headers.set('Content-Type', 'application/json');
            body = JSON.stringify(options.json);
        }

        if (UNSAFE.has(method)) {
            const csrf = readCookie('gm-csrf');
            if (csrf) headers.set('X-CSRF-Token', csrf);
        }

        const res = await fetch(url, {
            ...options,
            method,
            headers,
            body,
            credentials: 'include',
        });

        // Auto-handle session expiry once.
        if (res.status === 401 && !options.skipAuthRedirect) {
            // Don't bounce loops on the auth pages themselves.
            const here = global.location.pathname;
            if (!/(signin|signup|admin-login|index|welcome)/.test(here)) {
                const onAR = /\/HTML-AR\//.test(here);
                global.location.href = onAR ? 'welcome-ar.html' : 'welcome.html';
            }
        }
        return res;
    }

    /** Convenience: parse JSON, throw on non-2xx. Joi validation errors
     *  ({ errors: [...] }) are folded into the thrown message so callers
     *  don't have to drill into err.data themselves. */
    async function apiJson(path, options) {
        const res = await apiFetch(path, options);
        let data;
        try { data = await res.json(); } catch { data = {}; }
        if (!res.ok) {
            let msg = data.message || `HTTP ${res.status}`;
            if (Array.isArray(data.errors) && data.errors.length) {
                msg += ': ' + data.errors.join('; ');
            }
            const err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    /** Best-effort logout — server clears cookies; client clears its display state. */
    async function logout() {
        try {
            await apiFetch('/users/logout', { method: 'POST' });
        } catch (_) { /* even if it fails, fall through and clear locally */ }
        try {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('adminUser');
            // Legacy localStorage tokens — clear in case any old session left them.
            localStorage.removeItem('userToken');
            localStorage.removeItem('adminToken');
            sessionStorage.removeItem('userToken');
            sessionStorage.removeItem('currentUser');
        } catch (_) { /* ignore */ }
    }

    // Debug helper — only emits when the user opts in via:
    //   localStorage.setItem('gmDebug', '1')
    function dlog(...args) {
        if (localStorage.getItem('gmDebug') === '1') console.log('[gm]', ...args);
    }

    /**
     * Return the right filename for a logical page based on the current
     * page's language. Handles AR pages mirroring EN with a `-ar` suffix.
     * `admin` and `admin-login` have no AR variant — they cross-fold to
     * EN when called from an AR page.
     *   langPath('welcome')  → 'welcome.html'  on EN, 'welcome-ar.html'  on AR
     *   langPath('signin')   → 'signin.html'   on EN, 'signin-ar.html'   on AR
     *   langPath('admin')    → 'admin.html'    on EN, '../HTML/admin.html' on AR
     */
    const ENGLISH_ONLY_PAGES = new Set(['admin', 'admin-login']);
    function langPath(baseName) {
        const onAR = /\/HTML-AR\//.test(global.location.pathname);
        const file = baseName + '.html';
        if (ENGLISH_ONLY_PAGES.has(baseName)) {
            return onAR ? '../HTML/' + file : file;
        }
        return onAR ? baseName + '-ar.html' : file;
    }

    global.gmApi = { apiFetch, apiJson, logout, dlog, langPath, API_BASE };
    global.dlog = dlog;
})(window);
