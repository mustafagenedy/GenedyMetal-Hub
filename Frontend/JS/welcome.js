        // Enhanced interaction handling
        class WelcomeExperience {
            constructor() {
                this.init();
            }

            init() {
                this.setupCardInteractions();
                this.setupKeyboardNavigation();
                this.setupParallaxEffect();
                this.setupIntersectionObserver();
            }

            setupCardInteractions() {
                const cards = document.querySelectorAll('.user-type-card');
                
                cards.forEach(card => {
                    // Enhanced click handling
                    card.addEventListener('click', this.handleCardClick.bind(this));
                    
                    // Touch feedback for mobile
                    card.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
                    card.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
                    
                    // Hover sound feedback (optional)
                    card.addEventListener('mouseenter', this.playHoverSound.bind(this));
                });
            }

            handleCardClick(e) {
                e.preventDefault();
                const card = e.currentTarget;
                
                // Create enhanced ripple effect
                this.createRipple(e, card);
                
                // Add click feedback
                card.style.transform = 'translateY(-4px) scale(0.98)';
                
                // Create loading state
                this.showLoadingState(card);
                
                // Navigate after animation
                setTimeout(() => {
                    window.location.href = card.href;
                }, 400);
            }

            createRipple(e, element) {
                const ripple = document.createElement('div');
                const rect = element.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height) * 1.5;
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    left: ${x}px;
                    top: ${y}px;
                    width: ${size}px;
                    height: ${size}px;
                    background: radial-gradient(circle, rgba(12, 48, 136, 0.3) 0%, transparent 70%);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: rippleExpand 0.6s ease-out;
                    pointer-events: none;
                    z-index: 0;
                `;
                
                element.style.position = 'relative';
                element.style.overflow = 'hidden';
                element.appendChild(ripple);
                
                setTimeout(() => ripple.remove(), 600);
            }

            showLoadingState(card) {
                const actionArrow = card.querySelector('.action-arrow i');
                if (actionArrow) {
                    actionArrow.className = 'fas fa-spinner fa-spin';
                    setTimeout(() => {
                        actionArrow.className = 'fas fa-check';
                    }, 200);
                }
            }

            handleTouchStart(e) {
                e.currentTarget.style.transform = 'translateY(-4px) scale(0.98)';
            }

            handleTouchEnd(e) {
                setTimeout(() => {
                    e.currentTarget.style.transform = '';
                }, 150);
            }

            playHoverSound() {
                // Optional: Add subtle audio feedback
                // const audio = new Audio('data:audio/wav;base64,...');
                // audio.volume = 0.1;
                // audio.play().catch(() => {});
            }

            setupKeyboardNavigation() {
                const cards = document.querySelectorAll('.user-type-card');
                
                cards.forEach((card, index) => {
                    card.setAttribute('tabindex', '0');
                    
                    card.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            card.click();
                        }
                        
                        // Arrow key navigation
                        if (e.key === 'ArrowRight' && index < cards.length - 1) {
                            cards[index + 1].focus();
                        } else if (e.key === 'ArrowLeft' && index > 0) {
                            cards[index - 1].focus();
                        }
                    });
                });
            }

            setupParallaxEffect() {
                let ticking = false;
                
                const updateParallax = (e) => {
                    if (!ticking) {
                        requestAnimationFrame(() => {
                            const { clientX, clientY } = e;
                            const { innerWidth, innerHeight } = window;
                            
                            const xPercent = (clientX / innerWidth - 0.5) * 2;
                            const yPercent = (clientY / innerHeight - 0.5) * 2;
                            
                            // Move floating orbs
                            const orbs = document.querySelectorAll('.orb');
                            orbs.forEach((orb, index) => {
                                const intensity = (index + 1) * 0.3;
                                const x = xPercent * intensity * 20;
                                const y = yPercent * intensity * 20;
                                orb.style.transform = `translate(${x}px, ${y}px)`;
                            });
                            
                            // Subtle card tilt effect
                            const cards = document.querySelectorAll('.user-type-card');
                            cards.forEach(card => {
                                const rect = card.getBoundingClientRect();
                                const cardCenterX = rect.left + rect.width / 2;
                                const cardCenterY = rect.top + rect.height / 2;
                                
                                const deltaX = (clientX - cardCenterX) / rect.width;
                                const deltaY = (clientY - cardCenterY) / rect.height;
                                
                                const rotateX = deltaY * 2;
                                const rotateY = deltaX * 2;
                                
                                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                            });
                            
                            ticking = false;
                        });
                        ticking = true;
                    }
                };
                
                document.addEventListener('mousemove', updateParallax);
                
                // Reset on mouse leave
                document.addEventListener('mouseleave', () => {
                    const cards = document.querySelectorAll('.user-type-card');
                    cards.forEach(card => {
                        card.style.transform = '';
                    });
                });
            }

            setupIntersectionObserver() {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.style.animationPlayState = 'running';
                        }
                    });
                }, { threshold: 0.1 });

                const animatedElements = document.querySelectorAll('.user-type-card, .welcome-title, .welcome-subtitle');
                animatedElements.forEach(el => observer.observe(el));
            }
        }

        // Add custom CSS animations
        const style = document.createElement('style');
        style.textContent = `
                    @keyframes rippleExpand {
                        to {
                            transform: scale(1);
                            opacity: 0;
                        }
                    }

                    .orb {
                        position: absolute;
                        width: 100px;
                        height: 100px;
                        background: radial-gradient(circle, rgba(255,255,255,0.1), rgba(0,0,0,0));
                        border-radius: 50%;
                        pointer-events: none;
                        z-index: -1;
                        transition: transform 0.2s ease-out;
                    }

                    .floating-orbs {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        overflow: hidden;
                        z-index: 0;
                    }

                    .user-type-card {
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                    }
                `;
        document.head.appendChild(style);

        // Initialize the welcome experience
        document.addEventListener("DOMContentLoaded", () => {
            new WelcomeExperience();
        });
