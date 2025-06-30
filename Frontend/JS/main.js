// Enhanced main.js for Genedy Metal Website
// Modern JavaScript with advanced features and animations

document.addEventListener('DOMContentLoaded', function() {
    // Check user authentication state
    checkUserAuth();
    
    // Initialize all features
    initializeNavigation();
    initializeAnimations();
    initializeContactForm();
    initializeGallery();
    initializeCounters();
    initializeScrollEffects();
    initializeLoader();
    initializeTooltips();
    initializeParallax();
});

// Check user authentication state
function checkUserAuth() {
    const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
    
    const userMenuContainer = document.getElementById('userMenuContainer');
    const guestMenuContainer = document.getElementById('guestMenuContainer');
    const userNameElement = document.getElementById('userName');
    
    if (userToken && currentUser) {
        // User is signed in
        if (userMenuContainer) userMenuContainer.style.display = 'block';
        if (guestMenuContainer) guestMenuContainer.style.display = 'none';
        if (userNameElement) userNameElement.textContent = currentUser.fullName;
    } else {
        // User is not signed in
        if (userMenuContainer) userMenuContainer.style.display = 'none';
        if (guestMenuContainer) guestMenuContainer.style.display = 'block';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('userToken');
    sessionStorage.removeItem('currentUser');
    
    // Redirect to welcome page
    window.location.href = 'welcome.html';
}

// Export logout function for global access
window.logout = logout;

// =========================
// NAVIGATION ENHANCEMENTS
// =========================
function initializeNavigation() {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');

            // Only prevent default for internal anchor links
            if (targetId.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80;

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });

                    // Update active nav link
                    updateActiveNavLink(targetId);

                    // Close mobile menu if open
                    const navbarCollapse = document.querySelector('.navbar-collapse');
                    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                        // Check if Bootstrap is loaded and provides Collapse
                        if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
                            bootstrap.Collapse.getInstance(navbarCollapse).hide();
                        } else {
                            // Fallback for no Bootstrap or Collapse not found
                            navbarCollapse.classList.remove('show');
                        }
                    }
                }
            }
            // For external links (like reservation.html), let the default behavior happen
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        }

        // Update active navigation based on scroll position
        updateActiveNavOnScroll();
    });
}

function updateActiveNavLink(activeId) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === activeId) {
            link.classList.add('active');
        }
    });
}

function updateActiveNavOnScroll() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            updateActiveNavLink(`#${sectionId}`);
        }
    });
}

// =========================
// SCROLL ANIMATIONS
// =========================
function initializeAnimations() {
    // Create intersection observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');

                // Special handling for different elements
                if (entry.target.classList.contains('product-card')) {
                    animateProductCard(entry.target);
                } else if (entry.target.classList.contains('history-item')) {
                    animateHistoryItem(entry.target);
                } else if (entry.target.classList.contains('gallery-item')) {
                    animateGalleryItem(entry.target);
                }
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.product-card, .history-item, .gallery-item, .contact-form, .contact-info, .section-title');
    animateElements.forEach(el => {
        el.classList.add('animate-element');
        observer.observe(el);
    });
}

function animateProductCard(card) {
    if (card.parentElement) {
        const delay = Array.from(card.parentElement.children).indexOf(card) * 200;
        setTimeout(() => {
            card.style.transform = 'translateY(0)';
            card.style.opacity = '1';
        }, delay);
    }
}

function animateHistoryItem(item) {
    if (item.parentElement) {
        const delay = Array.from(item.parentElement.children).indexOf(item) * 150;
        setTimeout(() => {
            item.style.transform = 'scale(1)';
            item.style.opacity = '1';
        }, delay);
    }
}

function animateGalleryItem(item) {
    if (item.parentElement) {
        const delay = Array.from(item.parentElement.children).indexOf(item) * 100;
        setTimeout(() => {
            item.style.transform = 'scale(1) rotate(0deg)';
            item.style.opacity = '1';
        }, delay);
    }
}

// =========================
// CONTACT FORM ENHANCEMENT
// =========================
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const formInputs = this.querySelectorAll('input, textarea');
            const submitBtn = this.querySelector('button[type="submit"]');

            // Validate form
            let isValid = validateForm(formInputs);

            if (isValid) {
                // Show loading state
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
                    submitBtn.disabled = true;
                }

                try {
                    // Prepare data for API
                    const messageData = {
                        name: formData.get('name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        message: formData.get('message')
                    };

                    // Send to backend API
                    const response = await fetch('http://localhost:3000/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(messageData)
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        showNotification('Message sent successfully! We will get back to you soon.', 'success');
                        contactForm.reset();
                    } else {
                        throw new Error(result.message || 'Failed to send message');
                    }
                } catch (error) {
                    console.error('Error sending message:', error);
                    showNotification(error.message || 'Failed to send message. Please try again.', 'error');
                } finally {
                    // Reset button state
                    if (submitBtn) {
                        submitBtn.innerHTML = 'Send Message';
                        submitBtn.disabled = false;
                    }
                }
            } else {
                showNotification('Please fill in all required fields correctly.', 'error');
            }
        });

        // Real-time validation
        const formInputs = contactForm.querySelectorAll('input, textarea');
        formInputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateSingleField(this);
            });

            input.addEventListener('input', function() {
                if (this.classList.contains('is-invalid')) {
                    validateSingleField(this);
                }
            });
        });
    }
}

function validateForm(inputs) {
    let isValid = true;

    inputs.forEach(input => {
        if (!validateSingleField(input)) {
            isValid = false;
        }
    });

    return isValid;
}

function validateSingleField(field) {
    const value = field.value.trim();
    let isValid = true;

    // Remove previous validation classes
    field.classList.remove('is-valid', 'is-invalid');

    // Check if required field is empty
    if (field.hasAttribute('required') && !value) {
        isValid = false;
    }

    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
        }
    }

    // Phone validation
    if (field.type === 'tel' && value) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(value)) {
            isValid = false;
        }
    }

    // Add validation classes
    field.classList.add(isValid ? 'is-valid' : 'is-invalid');

    return isValid;
}

// =========================
// GALLERY ENHANCEMENTS
// =========================
function initializeGallery() {
    // Define projectImages within the scope of initializeGallery
    const projectImages = {
        kitchens: [
            { src: "../Assets/Kitchen.jpg", title: "Modern Kitchen", description: "Sleek, minimalist design with integrated appliances for a contemporary feel." },
            { src: "../Assets/Kitchen.jpg", title: "Spacious Kitchen Island", description: "Large island with seating, perfect for entertaining and meal prep." },
            { src: "../Assets/Kitchen.jpg", title: "Custom Cabinetry", description: "Handcrafted cabinets with smart storage solutions and soft-close features." },
            { src: "../Assets/Kitchen.jpg", title: "Bright & Airy Kitchen", description: "Open-concept kitchen with ample natural light and modern finishes." }
        ],
        doors: [
            { src: "../Assets/Door.jpg", title: "Elegant Sliding Door", description: "Custom-made sliding door with privacy glass and a smooth gliding mechanism." },
            { src: "../Assets/Door.jpg", title: "Solid Wood Entry Door", description: "Robust and beautifully carved wooden entry door for enhanced curb appeal." },
            { src: "../Assets/Door.jpg", title: "Glass French Doors", description: "Stylish French doors with multiple glass panes, ideal for patios." }
        ],
        windows: [
            { src: "../Assets/Window.jpg", title: "Panoramic Window Installation", description: "Large panoramic windows offering stunning views and excellent insulation." },
            { src: "../Assets/Window.jpg", title: "Bay Window Design", description: "Classic bay window adding architectural interest and extra interior space." },
            { src: "../Assets/Window.jpg", title: "Energy-Efficient Windows", description: "Double-glazed windows designed for superior thermal performance." }
        ],
        frontages: [
            { src: "../Assets/Frontage.jpg", title: "Modern Store Frontage", description: "Eye-catching and durable store frontage designed to attract customers." },
            { src: "../Assets/Frontage.jpg", title: "Commercial Building Facade", description: "Sleek glass and metal facade for a contemporary commercial building." },
            { src: "../Assets/Frontage.jpg", title: "Retail Outlet Entrance", description: "Inviting and functional entrance for a modern retail establishment." }
        ]
    };

    let currentCategory = '';
    let currentIndex = 0;

    // Helper function to open the lightbox
    window.openLightbox = function(category, index) {
        currentCategory = category;
        currentIndex = index;
        updateLightboxContent();
        const lightboxModal = document.getElementById('lightboxModal');
        if (lightboxModal) {
            lightboxModal.classList.add('active');
        }
    };

    // Helper function to close the lightbox
    window.closeLightbox = function() {
        const lightboxModal = document.getElementById('lightboxModal');
        if (lightboxModal) {
            lightboxModal.classList.remove('active');
        }
    };

    // Helper function to change image in lightbox
    window.changeImage = function(direction) {
        const images = projectImages[currentCategory];
        if (images && images.length > 0) {
            currentIndex = (currentIndex + direction + images.length) % images.length;
            updateLightboxContent();
        }
    };

    function updateLightboxContent() {
        const image = projectImages[currentCategory] ? projectImages[currentCategory][currentIndex] : null;
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxTitle = document.getElementById('lightboxTitle');
        const lightboxDescription = document.getElementById('lightboxDescription');

        if (image && lightboxImage && lightboxTitle && lightboxDescription) {
            lightboxImage.src = image.src;
            lightboxTitle.textContent = image.title;
            lightboxDescription.textContent = image.description;
            renderThumbnails();
        }
    }

    function renderThumbnails() {
        const thumbnailsContainer = document.getElementById('lightboxThumbnails');
        if (!thumbnailsContainer) return;

        thumbnailsContainer.innerHTML = '';
        const images = projectImages[currentCategory];
        if (!images) return;

        images.forEach((image, index) => {
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.title;
            img.classList.add('thumbnail');
            if (index === currentIndex) {
                img.classList.add('active-thumbnail');
            }
            // Use openLightbox function directly
            img.onclick = () => openLightbox(currentCategory, index);
            thumbnailsContainer.appendChild(img);
        });
    }

    // Filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;

            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to the clicked button
            button.classList.add('active');

            galleryItems.forEach(item => {
                const category = item.dataset.category;
                if (filter === 'all' || category === filter) {
                    item.classList.remove('fade-out');
                    item.classList.add('fade-in');
                    item.style.display = 'block'; // Ensure it's visible
                } else {
                    item.classList.remove('fade-in');
                    item.classList.add('fade-out');
                    // Use a timeout to hide after animation, or handle with CSS display/visibility
                    setTimeout(() => {
                        if (item.classList.contains('fade-out')) {
                            item.style.display = 'none';
                        }
                    }, 400); // Match this to your transition duration
                }
            });
        });
    });

    // Close lightbox when clicking outside the content
    window.onclick = function(event) {
        const lightboxModal = document.getElementById('lightboxModal');
        if (lightboxModal && event.target === lightboxModal) {
            closeLightbox();
        }
    };
}

// =========================
// COUNTER ANIMATIONS
// =========================
function initializeCounters() {
    const counters = document.querySelectorAll('.history-item h4');

    const counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

function animateCounter(element) {
    const target = parseInt(element.textContent.replace(/\D/g, ''));
    const suffix = element.textContent.replace(/\d/g, '');
    let current = 0;
    const increment = target / 100;
    const duration = 2000;
    const stepTime = duration / 100;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + suffix;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + suffix;
        }
    }, stepTime);
}

// =========================
// SCROLL EFFECTS
// =========================
function initializeScrollEffects() {
    // Scroll progress indicator
    createScrollProgressIndicator();
}

function createScrollProgressIndicator() {
    const progressHTML = `<div class="scroll-progress"></div>`;
    document.body.insertAdjacentHTML('afterbegin', progressHTML);

    const progressBar = document.querySelector('.scroll-progress');

    window.addEventListener('scroll', function() {
        if (progressBar) {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;

            progressBar.style.width = scrollPercent + '%';
        }
    });
}

// =========================
// LOADER
// =========================
function initializeLoader() {
    // Create and show loader
    const loaderHTML = `
        <div class="page-loader" id="pageLoader">
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-text">Loading...</div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', loaderHTML);

    // Hide loader when page is fully loaded
    window.addEventListener('load', function() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            setTimeout(() => {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.remove();
                }, 500);
            }, 1000);
        }
    });
}

// =========================
// TOOLTIPS
// =========================
function initializeTooltips() {
    // Initialize Bootstrap tooltips
    // Ensure Bootstrap's JS is loaded before calling this
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

// =========================
// PARALLAX EFFECTS
// =========================
function initializeParallax() {
    const parallaxElements = document.querySelectorAll('.banner_main');

    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;

        parallaxElements.forEach(element => {
            element.style.transform = `translateY(${rate}px)`;
        });
    });
}

// =========================
// NOTIFICATION SYSTEM
// =========================
function showNotification(message, type = 'info') {
    const notificationHTML = `
        <div class="notification notification-${type}">
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)} me-2"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    container.insertAdjacentHTML('beforeend', notificationHTML);

    const notification = container.lastElementChild;
    const closeBtn = notification.querySelector('.notification-close');

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        removeNotification(notification);
    }, 5000);

    // Close button functionality
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });
}

function removeNotification(notification) {
    if (notification) {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

// =========================
// UTILITY FUNCTIONS
// =========================

// Debounce function for performance optimization
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Add responsive image loading
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLazyLoading);
} else {
    initializeLazyLoading();
}

// Error handling for JavaScript errors
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    // You can add error reporting here
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}