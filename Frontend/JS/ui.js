/* ---------------------------------------------------------------------
   ui.js — themed confirm / alert / toast helpers.
   Replaces native browser dialogs, which can't be styled and break the
   dark / light theme aesthetic established in Phase 1.

   API:
     gmConfirm({ title, message, confirmLabel, cancelLabel, danger }) → Promise<boolean>
     gmAlert({ title, message, okLabel })                              → Promise<void>
     gmToast(message, { type='info', timeout=4500 })
   --------------------------------------------------------------------- */
(function (global) {
    'use strict';

    function ensureStyles() {
        if (document.getElementById('gm-ui-styles')) return;
        const css = `
            .gm-modal-backdrop {
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.55);
                backdrop-filter: blur(4px);
                z-index: 2000;
                display: flex; align-items: center; justify-content: center;
                padding: 20px;
                opacity: 0; transition: opacity 180ms ease;
            }
            .gm-modal-backdrop.gm-open { opacity: 1; }
            .gm-modal {
                background: var(--card-bg, #2a2a2a);
                color: var(--light-text, #fff);
                border: 1px solid var(--border-color, #333);
                border-radius: 14px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                max-width: 440px; width: 100%;
                padding: 24px 26px;
                transform: translateY(8px) scale(0.98);
                transition: transform 180ms ease;
            }
            .gm-modal-backdrop.gm-open .gm-modal { transform: translateY(0) scale(1); }
            .gm-modal h3 {
                margin: 0 0 8px;
                font-size: 18px; font-weight: 600;
                color: var(--light-text, #fff);
            }
            .gm-modal p {
                margin: 0 0 20px;
                color: var(--muted-text, #ccc);
                font-size: 15px; line-height: 1.55;
            }
            .gm-modal-actions {
                display: flex; justify-content: flex-end; gap: 10px;
            }
            .gm-modal-btn {
                min-width: 90px; min-height: 44px;
                padding: 10px 18px;
                border-radius: 8px;
                border: 1px solid var(--border-color, #333);
                background: transparent;
                color: var(--light-text, #fff);
                font: inherit; font-weight: 500;
                cursor: pointer;
                transition: background-color 150ms ease, border-color 150ms ease, transform 150ms ease;
            }
            .gm-modal-btn:hover { background: rgba(255,255,255,0.06); }
            .gm-modal-btn.gm-primary {
                background: var(--primary-color, #0c3088);
                border-color: var(--primary-color, #0c3088);
            }
            .gm-modal-btn.gm-primary:hover { background: var(--primary-light, #1a4fa0); }
            .gm-modal-btn.gm-danger {
                background: var(--error-color, #b91c1c);
                border-color: var(--error-color, #b91c1c);
            }
            .gm-modal-btn.gm-danger:hover { filter: brightness(1.1); }
            .gm-modal-btn:focus-visible {
                outline: 2px solid var(--accent-color, #ffd700);
                outline-offset: 3px;
            }

            .gm-toast-stack {
                position: fixed; top: 20px; inset-inline-end: 20px;
                display: flex; flex-direction: column; gap: 10px;
                z-index: 2100; pointer-events: none;
                max-width: min(360px, calc(100vw - 40px));
            }
            .gm-toast {
                pointer-events: auto;
                background: var(--card-bg, #2a2a2a);
                color: var(--light-text, #fff);
                border: 1px solid var(--border-color, #333);
                border-inline-start: 4px solid var(--primary-color, #0c3088);
                border-radius: 10px;
                padding: 12px 16px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                font-size: 14px; line-height: 1.5;
                opacity: 0; transform: translateX(20px);
                transition: opacity 200ms ease, transform 200ms ease;
            }
            .gm-toast.gm-open { opacity: 1; transform: translateX(0); }
            .gm-toast.gm-success { border-inline-start-color: var(--success-color, #16a34a); }
            .gm-toast.gm-error   { border-inline-start-color: var(--error-color, #b91c1c); }
            .gm-toast.gm-warning { border-inline-start-color: var(--warning-color, #b45309); }

            html[dir="rtl"] .gm-modal-actions { flex-direction: row-reverse; }
        `;
        const style = document.createElement('style');
        style.id = 'gm-ui-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    let toastStack = null;
    function ensureToastStack() {
        if (toastStack && document.body.contains(toastStack)) return toastStack;
        toastStack = document.createElement('div');
        toastStack.className = 'gm-toast-stack';
        toastStack.setAttribute('aria-live', 'polite');
        toastStack.setAttribute('aria-atomic', 'true');
        document.body.appendChild(toastStack);
        return toastStack;
    }

    function gmToast(message, opts = {}) {
        ensureStyles();
        const stack = ensureToastStack();
        const t = document.createElement('div');
        t.className = `gm-toast gm-${opts.type || 'info'}`;
        t.role = opts.type === 'error' ? 'alert' : 'status';
        t.textContent = message;
        stack.appendChild(t);
        requestAnimationFrame(() => t.classList.add('gm-open'));
        const timeout = opts.timeout ?? 4500;
        setTimeout(() => {
            t.classList.remove('gm-open');
            setTimeout(() => t.remove(), 220);
        }, timeout);
        return t;
    }

    function modal({ title, message, buttons }) {
        ensureStyles();
        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.className = 'gm-modal-backdrop';
            backdrop.setAttribute('role', 'dialog');
            backdrop.setAttribute('aria-modal', 'true');
            backdrop.setAttribute('aria-label', title || 'Confirm');

            const dlg = document.createElement('div');
            dlg.className = 'gm-modal';

            if (title) {
                const h = document.createElement('h3');
                h.textContent = title;
                dlg.appendChild(h);
            }
            if (message) {
                const p = document.createElement('p');
                p.textContent = message;
                dlg.appendChild(p);
            }

            const actions = document.createElement('div');
            actions.className = 'gm-modal-actions';

            const previouslyFocused = document.activeElement;

            function close(value) {
                backdrop.classList.remove('gm-open');
                document.removeEventListener('keydown', onKey);
                setTimeout(() => {
                    backdrop.remove();
                    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                        previouslyFocused.focus();
                    }
                    resolve(value);
                }, 180);
            }

            function onKey(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    const cancelBtn = buttons.find(b => b.value === false);
                    close(cancelBtn ? cancelBtn.value : null);
                }
            }

            buttons.forEach((b) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gm-modal-btn' + (b.style ? ' gm-' + b.style : '');
                btn.textContent = b.label;
                btn.addEventListener('click', () => close(b.value));
                actions.appendChild(btn);
            });

            dlg.appendChild(actions);
            backdrop.appendChild(dlg);
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    const cancelBtn = buttons.find(b => b.value === false);
                    close(cancelBtn ? cancelBtn.value : null);
                }
            });

            document.addEventListener('keydown', onKey);
            document.body.appendChild(backdrop);

            requestAnimationFrame(() => {
                backdrop.classList.add('gm-open');
                // Focus the primary button so keyboard users can confirm fast.
                const primary = actions.querySelector('.gm-primary, .gm-danger') || actions.querySelector('.gm-modal-btn');
                if (primary) primary.focus();
            });
        });
    }

    function gmConfirm({
        title = 'Are you sure?',
        message = '',
        confirmLabel = 'OK',
        cancelLabel = 'Cancel',
        danger = false,
    } = {}) {
        return modal({
            title, message,
            buttons: [
                { label: cancelLabel, value: false },
                { label: confirmLabel, value: true, style: danger ? 'danger' : 'primary' },
            ],
        });
    }

    function gmAlert({ title = 'Notice', message = '', okLabel = 'OK' } = {}) {
        return modal({
            title, message,
            buttons: [{ label: okLabel, value: true, style: 'primary' }],
        });
    }

    global.gmConfirm = gmConfirm;
    global.gmAlert = gmAlert;
    global.gmToast = gmToast;
})(window);
