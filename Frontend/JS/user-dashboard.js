// User Dashboard JavaScript — cookie-auth based.
// userToken is no longer read; the HttpOnly cookie travels via gmApi.apiFetch.
let currentUser = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'null');
let currentFilter = 'all';

// XSS guard — escape all user-supplied strings before innerHTML interpolation.
function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', function() {
    // Display info comes from localStorage; the actual credential is the
    // HttpOnly cookie. apiFetch will redirect on 401 if the cookie's gone.
    if (!currentUser) {
        window.location.href = 'signin.html';
        return;
    }

    // Initialize dashboard
    initializeDashboard();
    loadUserData();
    loadUserReservations();
    loadUserMessages();
    
    // Initialize filter functionality
    initializeFilters();
});

// Initialize dashboard
function initializeDashboard() {
    // Update user name in header and welcome section
    const userNameElements = document.querySelectorAll('#userName, #welcomeUserName');
    userNameElements.forEach(element => {
        element.textContent = currentUser.fullName;
    });
    
    // Load profile data
    loadProfileData();
    
    // Initialize tab functionality
    initializeTabs();
}

// Load user profile data
function loadProfileData() {
    document.getElementById('profileName').value = currentUser.fullName;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profilePhone').value = currentUser.phone;
    document.getElementById('profileJoinDate').value = new Date(currentUser.createdAt).toLocaleDateString();
}

// Initialize tab functionality
function initializeTabs() {
    const tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabLinks.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            if (target === '#reservations') {
                loadUserReservations();
            } else if (target === '#messages') {
                loadUserMessages();
            }
        });
    });
}

// Initialize filter functionality
function initializeFilters() {
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current filter
            currentFilter = this.getAttribute('data-filter');
            
            // Reload data with filter
            if (document.querySelector('#reservations').classList.contains('active')) {
                loadUserReservations();
            } else if (document.querySelector('#messages').classList.contains('active')) {
                loadUserMessages();
            }
        });
    });
}

// Load user reservations
async function loadUserReservations() {
    const reservationsList = document.getElementById('userReservationsList');
    reservationsList.innerHTML = '<div class="loading">Loading reservations...</div>';
    
    try {
        // Server identifies the user from the token — never trust client-supplied email.
        const params = new URLSearchParams();
        if (currentFilter !== 'all') params.set('status', currentFilter);
        const qs = params.toString() ? `?${params}` : '';

        const response = await gmApi.apiFetch(`/reservations/mine${qs}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load reservations');
        }
        
        const data = await response.json();
        dlog('User reservations:', data);
        
        displayUserReservations(data.data || []);
        updateReservationStats(data.data || []);
        
    } catch (error) {
        console.error('Error loading user reservations:', error);
        reservationsList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Error Loading Reservations</h4><p>Please try again later.</p></div>';
    }
}

// Display user reservations
function displayUserReservations(reservations) {
    const reservationsList = document.getElementById('userReservationsList');
    
    if (reservations.length === 0) {
        reservationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h4>No Reservations Found</h4>
                <p>You haven't made any reservations yet.</p>
                <a href="reservation.html" class="btn btn-primary">Make Your First Reservation</a>
            </div>
        `;
        return;
    }
    
    reservationsList.innerHTML = '';
    
    reservations.forEach(reservation => {
        const reservationItem = document.createElement('div');
        reservationItem.className = `reservation-item ${reservation.status}`;
        const visitTypeLabel = reservation.visitType
            ? reservation.visitType.charAt(0).toUpperCase() + reservation.visitType.slice(1)
            : '';
        reservationItem.innerHTML = `
            <div class="reservation-header">
                <h4 class="reservation-title">${esc(visitTypeLabel)} Visit</h4>
                <span class="reservation-status ${esc(reservation.status)}">${esc(reservation.status)}</span>
            </div>
            <div class="reservation-details">
                <div class="reservation-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${reservation.preferredDate ? esc(new Date(reservation.preferredDate).toLocaleDateString()) : 'Date not specified'}</span>
                </div>
                <div class="reservation-detail">
                    <i class="fas fa-clock"></i>
                    <span>${esc(reservation.preferredTime || 'Time not specified')}</span>
                </div>
                <div class="reservation-detail">
                    <i class="fas fa-envelope"></i>
                    <span>${esc(reservation.email)}</span>
                </div>
                <div class="reservation-detail">
                    <i class="fas fa-phone"></i>
                    <span>${esc(reservation.phone)}</span>
                </div>
            </div>
            ${reservation.notes ? `
                <div class="reservation-notes">
                    <strong>Notes:</strong> ${esc(reservation.notes)}
                </div>
            ` : ''}
            <div class="reservation-date">
                <small>Created: ${esc(new Date(reservation.createdAt).toLocaleDateString())}</small>
            </div>
        `;
        reservationsList.appendChild(reservationItem);
    });
}

// Load user messages
async function loadUserMessages() {
    const messagesList = document.getElementById('userMessagesList');
    messagesList.innerHTML = '<div class="loading">Loading messages...</div>';
    
    try {
        // Server identifies the user from the auth cookie — /messages/mine is the user-scoped endpoint.
        const response = await gmApi.apiFetch(`/messages/mine`);
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load messages');
        }
        
        const data = await response.json();
        dlog('User messages:', data);
        
        displayUserMessages(data.data || []);
        updateMessageStats(data.data || []);
        
    } catch (error) {
        console.error('Error loading user messages:', error);
        messagesList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Error Loading Messages</h4><p>Please try again later.</p></div>';
    }
}

// Display user messages
function displayUserMessages(messages) {
    const messagesList = document.getElementById('userMessagesList');
    
    if (messages.length === 0) {
        messagesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope-open"></i>
                <h4>No Messages Found</h4>
                <p>You haven't sent any messages yet.</p>
                <a href="main.html#contact" class="btn btn-primary">Send Your First Message</a>
            </div>
        `;
        return;
    }
    
    messagesList.innerHTML = '';
    
    messages.forEach(message => {
        const messageItem = document.createElement('div');
        messageItem.className = 'message-item';
        messageItem.innerHTML = `
            <div class="message-header">
                <h5>Message to Genedy Metal</h5>
                <span class="message-date">${esc(new Date(message.createdAt).toLocaleDateString())}</span>
            </div>
            <div class="message-content">
                <p>${esc(message.message)}</p>
            </div>
            <div class="message-status">
                <i class="fas fa-info-circle"></i>
                <span>Status: ${esc(message.status)}</span>
            </div>
        `;
        messagesList.appendChild(messageItem);
    });
}

// Update reservation statistics
function updateReservationStats(reservations) {
    const total = reservations.length;
    const pending = reservations.filter(r => r.status === 'pending').length;
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const cancelled = reservations.filter(r => r.status === 'cancelled').length;

    document.getElementById('totalReservations').textContent = total;
    document.getElementById('pendingReservations').textContent = pending;

    // Filter button counts. We only have the *filtered* view from the
    // current request, so only update counts when the filter is 'all'
    // (otherwise the badges would lose meaning).
    if (currentFilter !== 'all') return;
    const counts = { all: total, pending, confirmed, cancelled };
    document.querySelectorAll('[data-filter]').forEach((btn) => {
        const key = btn.getAttribute('data-filter');
        if (!(key in counts)) return;
        const baseLabel = btn.dataset.label || btn.textContent.replace(/\s*\(\d+\)\s*$/, '').trim();
        btn.dataset.label = baseLabel;
        btn.textContent = counts[key] > 0 ? `${baseLabel} (${counts[key]})` : baseLabel;
    });
}

// Update message statistics
function updateMessageStats(messages) {
    const total = messages.length;
    document.getElementById('totalMessages').textContent = total;
}

// Load user data (for future use)
async function loadUserData() {
    try {
        const response = await gmApi.apiFetch(`/users/profile`);
        
        if (response.ok) {
            const userData = await response.json();
            // Update user data if needed
            dlog('Updated user data:', userData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Profile-edit and change-password flows are tracked as feature work
// (see Phase 3.5 backlog U-08). The buttons that called these stubs were
// already commented out in user-dashboard.html, so the functions are
// removed here too rather than leaving dead alerts behind.

// Logout functionality — server clears the cookies via /users/logout.
async function logout() {
    await gmApi.logout();
    window.location.href = 'signin.html';
}

// Show specific section (for navigation)
function showSection(sectionName) {
    const tab = document.querySelector(`#${sectionName}-tab`);
    if (tab) {
        const tabInstance = new bootstrap.Tab(tab);
        tabInstance.show();
    }
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Export functions for global access
window.showSection = showSection;
window.logout = logout;
window.editProfile = editProfile;
window.changePassword = changePassword; 