// Form submission handling
        const reservationForm = document.getElementById('reservationForm');
        const successCard = document.getElementById('reservationSuccess');
        const dashboardLink = document.getElementById('successDashboardLink');
        const anotherBtn = document.getElementById('successAnotherBtn');

        // Hide the "view my reservations" link for guests — they have no dashboard.
        const guest = !localStorage.getItem('currentUser') && !sessionStorage.getItem('currentUser');
        if (guest && dashboardLink) dashboardLink.hidden = true;

        if (anotherBtn) {
            anotherBtn.addEventListener('click', () => {
                if (successCard) successCard.hidden = true;
                if (reservationForm) {
                    reservationForm.hidden = false;
                    const firstField = reservationForm.querySelector('input, textarea, select');
                    if (firstField) firstField.focus();
                }
            });
        }

        reservationForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitButton = this.querySelector('.submit-button');
            const messageDiv = document.getElementById('formMessage');

            submitButton.classList.add('loading');
            if (messageDiv) messageDiv.classList.remove('show');

            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await gmApi.apiFetch('/reservations/create', {
                    method: 'POST',
                    json: data,
                });
                const result = await response.json();
                dlog('Reservation response:', result);

                if (response.ok) {
                    this.reset();
                    // Swap the form for the success card with "what's next" guidance.
                    this.hidden = true;
                    if (successCard) {
                        successCard.hidden = false;
                        successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                console.error('Reservation error:', error.message);
                showMessage(error.message || 'Something went wrong. Please try again later or contact us directly.', 'error');
            } finally {
                submitButton.classList.remove('loading');
            }
        });

        function showMessage(text, type) {
            const messageDiv = document.getElementById('formMessage');
            messageDiv.textContent = text;
            messageDiv.className = `form-message ${type}`;
            
            // Trigger animation
            setTimeout(() => {
                messageDiv.classList.add('show');
            }, 10);
            
            // Hide message after 5 seconds
            setTimeout(() => {
                messageDiv.classList.remove('show');
            }, 5000);
        }

        // Set minimum date to today
        document.getElementById('preferredDate').min = new Date().toISOString().split('T')[0];

        // Enhanced form validation
        const inputs = document.querySelectorAll('.form-input, .form-textarea, .form-select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.hasAttribute('required') && !this.value.trim()) {
                    this.style.borderColor = 'var(--error-color)';
                } else {
                    this.style.borderColor = 'var(--border-color)';
                }
            });
            
            input.addEventListener('input', function() {
                if (this.style.borderColor === 'var(--error-color)' && this.value.trim()) {
                    this.style.borderColor = 'var(--border-color)';
                }
            });
        });

        // Email validation
        document.getElementById('email').addEventListener('blur', function() {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailPattern.test(this.value)) {
                this.style.borderColor = 'var(--error-color)';
            }
        });

        // Phone number formatting (basic)
        document.getElementById('phone').addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 6) {
                value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            } else if (value.length >= 3) {
                value = value.replace(/(\d{3})(\d{3})/, '($1) $2');
            }
            this.value = value;
        });