/* signin.js — extracted from inline <script> in signin.html (CSP-friendly).
   Uses gmApi.apiJson so cookies + CSRF are handled automatically. */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Password visibility toggle (replaces inline onclick="togglePassword(this)")
        document.querySelectorAll('.password-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                const icon = btn.querySelector('i');
                if (!input || !icon) return;
                const showing = input.type === 'password';
                input.type = showing ? 'text' : 'password';
                icon.classList.toggle('fa-eye', !showing);
                icon.classList.toggle('fa-eye-slash', showing);
            });
        });

        const form = document.getElementById('signinForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = (form.querySelector('input[name="email"]').value || '').trim();
            const password = form.querySelector('input[name="password"]').value || '';

            const successEl = document.getElementById('signin-success');
            const errorEl   = document.getElementById('signin-error');
            const errorText = document.getElementById('error-text');
            if (successEl) successEl.style.display = 'none';
            if (errorEl)   errorEl.style.display = 'none';

            if (!email || !password) {
                if (errorText) errorText.textContent = 'Please fill in all required fields.';
                if (errorEl) errorEl.style.display = 'block';
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalLabel = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2" aria-hidden="true"></i>Signing in...';
            }

            try {
                const data = await gmApi.apiJson('/users/signin', {
                    method: 'POST',
                    json: { email, password },
                });

                // Auth + CSRF live in cookies now. Only display info goes to localStorage.
                if (data.user) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                }

                if (successEl) successEl.style.display = 'block';

                const dest = data.user && data.user.role === 'admin'
                    ? gmApi.langPath('admin')           // English-only; cross-folds from AR
                    : gmApi.langPath('user-dashboard'); // matches current language
                setTimeout(() => { window.location.href = dest; }, 800);
            } catch (err) {
                if (errorText) errorText.textContent = err.message || 'Login failed. Please check your credentials.';
                if (errorEl)   errorEl.style.display = 'block';
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalLabel || '<i class="fas fa-sign-in-alt me-2" aria-hidden="true"></i>Sign In';
                }
            }
        });
    });
})();
