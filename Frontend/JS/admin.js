// Admin Panel JavaScript
let adminToken = localStorage.getItem('adminToken');
let currentPage = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
    adminToken = localStorage.getItem('adminToken');
    
    console.log('adminToken:', adminToken);
    console.log('adminUser:', adminUser);
    
    if (!adminUser || adminUser.role !== 'admin' || !adminToken) {
        console.log('No valid admin session, redirecting to login');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Initialize admin panel
    console.log('Initializing admin dashboard');
    loadReservations();
    loadMessages();
    
    // Add navigation functionality
    initializeNavigation();
    
    // Add logout functionality to the logout link
    const logoutLink = document.querySelector('.nav-link[onclick="logout()"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

// Initialize navigation between sections
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

// Show specific section
function showSection(sectionName) {
    document.getElementById('reservationsSection').style.display = 'none';
    document.getElementById('messagesSection').style.display = 'none';
    const customersSection = document.getElementById('customersSection');
    if (customersSection) customersSection.style.display = 'none';
    if (sectionName === 'reservations') {
        document.getElementById('reservationsSection').style.display = 'block';
        loadReservations();
    } else if (sectionName === 'messages') {
        document.getElementById('messagesSection').style.display = 'block';
        loadMessages();
    } else if (sectionName === 'customers') {
        if (customersSection) customersSection.style.display = 'block';
        loadAllCustomers();
    }
}

// Logout functionality
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'admin-login.html';
}

// Load reservations from backend
async function loadReservations(page = 1) {
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilters
        });
        
        

        const response = await fetch(`http://localhost:3000/reservations/all?${params}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
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
        console.log('Fetched reservation data:', data); // ← Add this line
        console.log('Sending reservations to display:', data.reservations); // ← Add this line

        displayReservations(data.reservations);
        updateStats(data.reservations);
        updatePagination(data.currentPage, data.totalPages);
        currentPage = data.currentPage;
        
    } catch (error) {
        console.error('Error loading reservations:', error);
        showAlert('Error loading reservations', 'danger');
    }
}

// Display reservations in list
function displayReservations(reservations) {
    // Defensive guard to catch bad data
    if (!Array.isArray(reservations)) {
        console.error('displayReservations error: reservations is not an array', reservations);
        return;
    }
    
    const reservationsList = document.getElementById('reservationsList');
    reservationsList.innerHTML = '';
    
    if (reservations.length === 0) {
        reservationsList.innerHTML = '<div class="no-reservations">No reservations found</div>';
        return;
    }
    
    reservations.forEach(reservation => {
        const reservationCard = document.createElement('div');
        reservationCard.className = 'reservation-card';
        reservationCard.innerHTML = `
            <div class="reservation-header">
                <h3 class="reservation-name">${reservation.fullName}</h3>
                <span class="status-badge ${reservation.status}">${reservation.status}</span>
            </div>
            <div class="reservation-details">
                <div class="detail-item">
                    <i class="fas fa-envelope"></i>
                    <span>${reservation.email}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${reservation.phone}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>${reservation.visitType}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${reservation.preferredDate ? new Date(reservation.preferredDate).toLocaleDateString() : 'Not specified'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-time"></i>
                    <span>${reservation.preferredTime || 'Not specified'}</span>
                </div>
            </div>
            <div class="reservation-actions">
                <button class="action-btn edit" onclick="editReservation('${reservation._id}')">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="action-btn delete" onclick="deleteReservation('${reservation._id}')">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;
        reservationsList.appendChild(reservationCard);
    });
}

// Update statistics
function updateStats(reservations) {
    const total = reservations.length;
    const pending = reservations.filter(r => r.status === 'pending').length;
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const cancelled = reservations.filter(r => r.status === 'cancelled').length;
    
    // Update the stats cards in the HTML
    document.getElementById('pendingStats').textContent = pending;
    document.getElementById('confirmedStats').textContent = confirmed;
    document.getElementById('cancelledStats').textContent = cancelled;
    document.getElementById('totalStats').textContent = total;
    
    // Update the pending count in the sidebar
    const pendingCountElement = document.getElementById('pendingCount');
    if (pendingCountElement) {
        pendingCountElement.textContent = pending;
    }
}

// Update pagination
function updatePagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    if (currentPage > 1) {
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item';
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="loadReservations(${currentPage - 1})">Previous</a>`;
        pagination.appendChild(prevLi);
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="loadReservations(${i})">${i}</a>`;
        pagination.appendChild(li);
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item';
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="loadReservations(${currentPage + 1})">Next</a>`;
        pagination.appendChild(nextLi);
    }
}

// Search functionality
function searchReservations() {
    const searchTerm = document.getElementById('searchInput').value;
    currentFilters.search = searchTerm;
    currentPage = 1;
    loadReservations(currentPage);
}

// Filter functionality
function filterReservations() {
    const status = document.getElementById('statusFilter').value;
    currentFilters.status = status;
    currentPage = 1;
    loadReservations(currentPage);
}

// Edit reservation
async function editReservation(id) {
    try {
        const response = await fetch(`http://localhost:3000/reservations/${id}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load reservation');
        
        const data = await response.json();
        const reservation = data.reservation;
        
        // Populate modal
        document.getElementById('editReservationId').value = reservation._id;
        document.getElementById('editFullName').value = reservation.fullName;
        document.getElementById('editEmail').value = reservation.email;
        document.getElementById('editPhone').value = reservation.phone;
        document.getElementById('editVisitType').value = reservation.visitType;
        document.getElementById('editPreferredDate').value = reservation.preferredDate ? reservation.preferredDate.split('T')[0] : '';
        document.getElementById('editPreferredTime').value = reservation.preferredTime || '';
        document.getElementById('editStatus').value = reservation.status;
        document.getElementById('editAddress').value = reservation.address || '';
        document.getElementById('editNotes').value = reservation.notes || '';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editReservationModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading reservation:', error);
        showAlert('Error loading reservation details', 'danger');
    }
}

// Update reservation
async function updateReservation() {
    const id = document.getElementById('editReservationId').value;
    const updateData = {
        preferredDate: document.getElementById('editPreferredDate').value,
        preferredTime: document.getElementById('editPreferredTime').value,
        status: document.getElementById('editStatus').value,
        notes: document.getElementById('editNotes').value
    };
    
    try {
        const response = await fetch(`http://localhost:3000/reservations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) throw new Error('Failed to update reservation');
        
        const data = await response.json();
        showAlert('Reservation updated successfully', 'success');
        
        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('editReservationModal'));
        modal.hide();
        loadReservations(currentPage);
        
    } catch (error) {
        console.error('Error updating reservation:', error);
        showAlert('Error updating reservation', 'danger');
    }
}

// Delete reservation
async function deleteReservation(id) {
    if (!confirm('Are you sure you want to delete this reservation?')) return;
    
    try {
        const response = await fetch(`http://localhost:3000/reservations/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to delete reservation');
        
        showAlert('Reservation deleted successfully', 'success');
        loadReservations(currentPage);
        
    } catch (error) {
        console.error('Error deleting reservation:', error);
        showAlert('Error deleting reservation', 'danger');
    }
}

// Export data functionality
function exportData() {
    console.log('Export functionality - to be implemented');
    showAlert('Export functionality coming soon!', 'info');
}

// Add manual booking functionality
function addManualBooking() {
    console.log('Add manual booking functionality - to be implemented');
    showAlert('Manual booking functionality coming soon!', 'info');
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Helper functions
function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'confirmed': return 'success';
        case 'cancelled': return 'danger';
        case 'completed': return 'info';
        default: return 'secondary';
    }
}

function showAlert(message, type) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at the top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// =========================
// MESSAGES MANAGEMENT
// =========================

// Load messages from backend
async function loadMessages(page = 1) {
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 10
        });

        const response = await fetch(`http://localhost:3000/messages?${params}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
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
        console.log('Fetched message data:', data);

        displayMessages(data.data);
        updateMessageStats(data.data);
        updateMessagePagination(data.pagination);
        
    } catch (error) {
        console.error('Error loading messages:', error);
        showAlert('Error loading messages', 'danger');
    }
}

// Display messages in list
function displayMessages(messages) {
    if (!Array.isArray(messages)) {
        console.error('displayMessages error: messages is not an array', messages);
        return;
    }
    
    const messagesList = document.getElementById('messagesList');
    messagesList.innerHTML = '';
    
    if (messages.length === 0) {
        messagesList.innerHTML = '<div class="no-messages">No messages found</div>';
        return;
    }
    
    messages.forEach(message => {
        const messageCard = document.createElement('div');
        messageCard.className = `message-card ${message.status}`;
        messageCard.innerHTML = `
            <div class="message-header">
                <h3 class="message-name">${message.name}</h3>
                <span class="status-badge ${message.status}">${message.status}</span>
            </div>
            <div class="message-details">
                <div class="detail-item">
                    <i class="fas fa-envelope"></i>
                    <span>${message.email}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${message.phone}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${new Date(message.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="message-content">
                <p>${message.message}</p>
            </div>
            <div class="message-actions">
                <button class="action-btn edit" onclick="updateMessageStatus('${message._id}', 'read')">
                    <i class="fas fa-eye"></i>
                    Mark as Read
                </button>
                <button class="action-btn confirm" onclick="updateMessageStatus('${message._id}', 'replied')">
                    <i class="fas fa-reply"></i>
                    Mark as Replied
                </button>
                <button class="action-btn delete" onclick="deleteMessage('${message._id}')">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;
        messagesList.appendChild(messageCard);
    });
}

// Update message statistics
function updateMessageStats(messages) {
    const total = messages.length;
    const pending = messages.filter(m => m.status === 'pending').length;
    const read = messages.filter(m => m.status === 'read').length;
    const replied = messages.filter(m => m.status === 'replied').length;
    
    // Update the stats cards in the HTML
    document.getElementById('unreadMessagesStats').textContent = pending;
    document.getElementById('readMessagesStats').textContent = read;
    document.getElementById('repliedMessagesStats').textContent = replied;
    document.getElementById('totalMessagesStats').textContent = total;
    
    // Update the unread count in the sidebar
    const unreadCountElement = document.getElementById('unreadMessagesCount');
    if (unreadCountElement) {
        unreadCountElement.textContent = pending;
    }
}

// Update message status
async function updateMessageStatus(messageId, status) {
    try {
        const response = await fetch(`http://localhost:3000/messages/${messageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error('Failed to update message status');
        }

        const result = await response.json();
        showAlert('Message status updated successfully', 'success');
        loadMessages(); // Reload messages to reflect changes
        
    } catch (error) {
        console.error('Error updating message status:', error);
        showAlert('Error updating message status', 'danger');
    }
}

// Delete message
async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete message');
        }

        showAlert('Message deleted successfully', 'success');
        loadMessages(); // Reload messages to reflect changes
        
    } catch (error) {
        console.error('Error deleting message:', error);
        showAlert('Error deleting message', 'danger');
    }
}

// Mark all messages as read
async function markAllAsRead() {
    try {
        // Get all pending messages
        const response = await fetch('http://localhost:3000/messages?status=pending', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch pending messages');
        }

        const data = await response.json();
        const pendingMessages = data.data;

        // Update each pending message to read status
        for (const message of pendingMessages) {
            await updateMessageStatus(message._id, 'read');
        }

        showAlert('All messages marked as read', 'success');
        loadMessages();
        
    } catch (error) {
        console.error('Error marking all messages as read:', error);
        showAlert('Error marking messages as read', 'danger');
    }
}

// Export messages
function exportMessages() {
    // Implementation for exporting messages to CSV/Excel
    showAlert('Export functionality coming soon!', 'info');
}

// Update message pagination
function updateMessagePagination(pagination) {
    // Similar to reservation pagination but for messages
    // Implementation can be added if needed
}

// Fetch and display all customers in the Customers section
async function loadAllCustomers() {
    try {
        const response = await fetch('http://localhost:3000/users/all', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        if (!response.ok) throw new Error('Failed to load customers');
        const data = await response.json();
        const users = data.data;
        renderCustomersTable(users);
        // Attach search handler
        const searchInput = document.getElementById('customerSearchInput');
        searchInput.oninput = function() {
            const q = this.value.toLowerCase();
            const filtered = users.filter(u =>
                (u.fullName && u.fullName.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q))
            );
            renderCustomersTable(filtered);
        };
    } catch (error) {
        console.error('Error loading customers:', error);
        showAlert('Error loading customers', 'danger');
    }
}

function renderCustomersTable(users) {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No customers found.</td></tr>';
        return;
    }
    users.forEach((user, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${user.fullName || ''}</td>
            <td>${user.email || ''}</td>
            <td>${user.role || ''}</td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</td>
        `;
        tbody.appendChild(tr);
    });
}