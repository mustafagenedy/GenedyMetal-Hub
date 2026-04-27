/* admin-login.js — cookie-auth based.
   The HttpOnly auth cookie is set server-side; only display info goes
   to localStorage. */
(function () {
    'use strict';

    // If we already have an admin display blob AND the cookie is alive,
    // skip the login form. (We can't read the HttpOnly cookie itself,
    // but we can ping /users/profile to verify.)
    const cachedAdmin = (() => {
        try { return JSON.parse(localStorage.getItem('adminUser') || 'null'); }
        catch { return null; }
    })();

    if (cachedAdmin && cachedAdmin.role === 'admin') {
        gmApi.apiFetch('/users/profile', { skipAuthRedirect: true })
            .then(r => { if (r.ok) window.location.href = 'admin.html'; })
            .catch(() => { /* stay on login */ });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('adminLoginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const loginMessage = document.getElementById('loginMessage');
            const loginButton = document.getElementById('loginButton');
            const buttonText = document.getElementById('buttonText');

            if (loginButton) loginButton.disabled = true;
            if (buttonText)  buttonText.innerHTML = '<div class="loading-spinner"></div>';
            if (loginMessage) loginMessage.style.display = 'none';

            try {
                const data = await gmApi.apiJson('/users/signin', {
                    method: 'POST',
                    json: { email, password },
                });

                if (!data.user || data.user.role !== 'admin') {
                    // Not an admin — clear server cookies before refusing.
                    await gmApi.logout();
                    throw new Error('Access denied: Admin privileges required');
                }

                localStorage.setItem('adminUser', JSON.stringify(data.user));

                if (loginMessage) {
                    loginMessage.textContent = 'Login successful! Redirecting...';
                    loginMessage.className = 'alert alert-success';
                    loginMessage.style.display = 'block';
                }
                setTimeout(() => { window.location.href = 'admin.html'; }, 800);
            } catch (err) {
                if (loginMessage) {
                    loginMessage.textContent = err.message || 'Login failed. Please try again.';
                    loginMessage.className = 'alert alert-danger';
                    loginMessage.style.display = 'block';
                }
            } finally {
                if (loginButton) loginButton.disabled = false;
                if (buttonText)  buttonText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
        });

        document.querySelectorAll('.form-control').forEach((input) => {
            input.addEventListener('focus', () => { input.parentElement.style.transform = 'translateY(-2px)'; });
            input.addEventListener('blur',  () => { input.parentElement.style.transform = 'translateY(0)'; });
        });
    });
})();
