// User Dashboard JavaScript
let userToken = sessionStorage.getItem('userToken') || localStorage.getItem('userToken');
let currentUser = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'null');
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 User Dashboard loaded');
    console.log('🔍 User token exists:', !!userToken);
    console.log('🔍 Current user:', currentUser);
    console.log('🔍 User token from localStorage:', localStorage.getItem('userToken'));
    console.log('🔍 Current user from localStorage:', localStorage.getItem('currentUser'));
    console.log('🔍 User token from sessionStorage:', sessionStorage.getItem('userToken'));
    console.log('🔍 Current user from sessionStorage:', sessionStorage.getItem('currentUser'));
    
    // Check authentication
    if (!currentUser || !userToken) {
        console.log('❌ No valid user session, redirecting to signin');
        console.log('❌ Current user is null/undefined:', !currentUser);
        console.log('❌ User token is null/undefined:', !userToken);
        window.location.href = 'signin.html';
        return;
    }
    
    console.log('✅ Authentication check passed');
    
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
        const params = new URLSearchParams({
            email: currentUser.email,
            status: currentFilter !== 'all' ? currentFilter : ''
        });
        
        const response = await fetch(`http://localhost:3000/reservations/user?${params}`, {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load reservations');
        }
        
        const data = await response.json();
        console.log('User reservations:', data);
        
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
        reservationItem.innerHTML = `
            <div class="reservation-header">
                <h4 class="reservation-title">${reservation.visitType.charAt(0).toUpperCase() + reservation.visitType.slice(1)} Visit</h4>
                <span class="reservation-status ${reservation.status}">${reservation.status}</span>
            </div>
            <div class="reservation-details">
                <div class="reservation-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${reservation.preferredDate ? new Date(reservation.preferredDate).toLocaleDateString() : 'Date not specified'}</span>
                </div>
                <div class="reservation-detail">
                    <i class="fas fa-clock"></i>
                    <span>${reservation.preferredTime || 'Time not specified'}</span>
                </div>
                <div class="reservation-detail">
                    <i class="fas fa-envelope"></i>
                    <span>${reservation.email}</span>
                </div>
                <div class="reservation-detail">
                    <i class="fas fa-phone"></i>
                    <span>${reservation.phone}</span>
                </div>
            </div>
            ${reservation.notes ? `
                <div class="reservation-notes">
                    <strong>Notes:</strong> ${reservation.notes}
                </div>
            ` : ''}
            <div class="reservation-date">
                <small>Created: ${new Date(reservation.createdAt).toLocaleDateString()}</small>
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
        const response = await fetch(`http://localhost:3000/messages/email/${encodeURIComponent(currentUser.email)}`, {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load messages');
        }
        
        const data = await response.json();
        console.log('User messages:', data);
        
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
                <span class="message-date">${new Date(message.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="message-content">
                <p>${message.message}</p>
            </div>
            <div class="message-status">
                <i class="fas fa-info-circle"></i>
                <span>Status: ${message.status}</span>
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
}

// Update message statistics
function updateMessageStats(messages) {
    const total = messages.length;
    document.getElementById('totalMessages').textContent = total;
}

// Load user data (for future use)
async function loadUserData() {
    try {
        const response = await fetch(`http://localhost:3000/users/profile`, {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            // Update user data if needed
            console.log('Updated user data:', userData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Edit profile functionality
function editProfile() {
    // For now, just show an alert. This can be expanded to show an edit form
    alert('Profile editing functionality will be implemented soon!');
}

// Change password functionality
function changePassword() {
    // For now, just show an alert. This can be expanded to show a password change form
    alert('Password change functionality will be implemented soon!');
}

// Logout functionality
function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
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