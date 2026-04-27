/* signup.js — extracted from inline <script> in signup.html. */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.password-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                const icon = btn.querySelector('i');
                if (!input || !icon) return;
                const showing = input.type === 'password';
                input.type = showing ? 'text' : 'password';
                btn.setAttribute('aria-pressed', String(showing));
                icon.classList.toggle('fa-eye', !showing);
                icon.classList.toggle('fa-eye-slash', showing);
            });
        });

        // Live password-strength meter — runs against the same regex Joi enforces.
        const pwInput = document.querySelector('input[name="password"]');
        const meter = document.querySelector('.pw-strength');
        if (pwInput && meter) {
            const fill = meter.querySelector('.pw-strength-fill');
            const checks = meter.querySelectorAll('[data-check]');
            const hint = document.getElementById('pw-strength-hint');
            const labels = ['Too weak', 'Weak', 'OK', 'Good', 'Strong'];

            pwInput.addEventListener('input', () => {
                const v = pwInput.value;
                const passed = {
                    length: v.length >= 8,
                    lower:  /[a-z]/.test(v),
                    upper:  /[A-Z]/.test(v),
                    digit:  /[0-9]/.test(v),
                    symbol: /[^A-Za-z0-9]/.test(v),
                };
                const score = Object.values(passed).filter(Boolean).length;
                fill.dataset.score = String(score);
                checks.forEach((el) => {
                    const k = el.dataset.check;
                    el.classList.toggle('passed', !!passed[k]);
                });
                if (hint) hint.textContent = `Password strength: ${labels[score]}`;
            });
        }

        const form = document.getElementById('signupForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = form.querySelector('input[name="fullName"]').value;
            const email = form.querySelector('input[name="email"]').value;
            const phone = form.querySelector('input[name="phone"]').value;
            const password = form.querySelector('input[name="password"]').value;
            const confirmPassword = form.querySelector('input[name="confirmPassword"]').value;

            clearMessages();
            if (!validateForm({ fullName, email, phone, password, confirmPassword })) return;

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalLabel = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2" aria-hidden="true"></i>Creating account...';
            }

            try {
                const data = await gmApi.apiJson('/users/signup', {
                    method: 'POST',
                    json: { fullName, email, phone, password, confirmPassword },
                });
                showSuccess(data.message || 'Account created successfully!');
                setTimeout(() => { window.location.href = 'signin.html'; }, 1500);
            } catch (err) {
                showError(err.message || 'Failed to create account. Please try again.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalLabel || '<i class="fas fa-user-plus me-2" aria-hidden="true"></i>Create Account';
                }
            }
        });
    });

    function validateForm(d) {
        if (!d.fullName || !d.email || !d.phone || !d.password || !d.confirmPassword) {
            showError('Please fill in all required fields.'); return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
            showError('Please enter a valid email address.'); return false;
        }
        if (d.password !== d.confirmPassword) {
            showError('Passwords do not match.'); return false;
        }
        if (d.password.length < 8) {
            showError('Password must be at least 8 characters long.'); return false;
        }
        if (!/[A-Z]/.test(d.password)) {
            showError('Password must contain at least one uppercase letter.'); return false;
        }
        if (!/[a-z]/.test(d.password)) {
            showError('Password must contain at least one lowercase letter.'); return false;
        }
        if (!/[0-9]/.test(d.password)) {
            showError('Password must contain at least one number.'); return false;
        }
        if (!/[^A-Za-z0-9]/.test(d.password)) {
            showError('Password must contain at least one special character.'); return false;
        }
        return true;
    }

    function clearMessages() {
        const s = document.getElementById('signup-success');
        const e = document.getElementById('signup-error');
        if (s) s.style.display = 'none';
        if (e) e.style.display = 'none';
    }

    function showError(msg) {
        let el = document.getElementById('signup-error');
        if (!el) {
            el = document.createElement('div');
            el.id = 'signup-error';
            el.className = 'error-message';
            const form = document.getElementById('signupForm');
            if (form && form.parentNode) form.parentNode.insertBefore(el, form);
        }
        el.textContent = '';
        const icon = document.createElement('i');
        icon.className = 'fas fa-exclamation-circle me-2';
        icon.setAttribute('aria-hidden', 'true');
        el.appendChild(icon);
        el.appendChild(document.createTextNode(msg));
        el.style.display = 'block';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showSuccess(msg) {
        const el = document.getElementById('signup-success');
        if (!el) return;
        el.textContent = '';
        const icon = document.createElement('i');
        icon.className = 'fas fa-check-circle me-2';
        icon.setAttribute('aria-hidden', 'true');
        el.appendChild(icon);
        el.appendChild(document.createTextNode(msg));
        el.style.display = 'block';
    }
})();
