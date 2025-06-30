// Form submission handling
        document.getElementById('reservationForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = this.querySelector('.submit-button');
            const messageDiv = document.getElementById('formMessage');
            
            // Show loading state
            submitButton.classList.add('loading');
            messageDiv.classList.remove('show');
            
            // Get form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            try {
                console.log('=== SENDING RESERVATION REQUEST ===');
                console.log('Form data being sent:', data);
                
                // Call backend API
                const response = await fetch('http://localhost:3000/reservations/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });
                
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);
                
                const result = await response.json();
                console.log('Response data:', result);
                
                if (response.ok) {
                    showMessage(result.message || 'Reservation request submitted successfully! We\'ll contact you soon to confirm your appointment.', 'success');
                    this.reset();
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                console.error('=== RESERVATION ERROR ===');
                console.error('Reservation error:', error);
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                showMessage(error.message || 'Something went wrong. Please try again later or contact us directly.', 'error');
            } finally {
                // Remove loading state
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