// Admin Panel JavaScript — cookie-auth based.
// adminToken is no longer read; the HttpOnly cookie travels automatically
// via gmApi.apiFetch (credentials: 'include').
let currentPage = 1;
let currentFilters = {};

// XSS guard: escape any user-supplied string before injecting via innerHTML.
// Reservation/message/customer rows render attacker-controlled fields, so
// every interpolation of those values must go through this helper.
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
    dlog('DOM fully loaded');
    
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');

    if (!adminUser || adminUser.role !== 'admin') {
        dlog('No valid admin session, redirecting to login');
        window.location.href = 'admin-login.html';
        return;
    }
    // Note: the HttpOnly auth cookie is the actual credential and is verified
    // by the backend on every call below. apiFetch redirects on 401.
    
    // Initialize admin panel
    dlog('Initializing admin dashboard');
    loadReservations();
    loadMessages();

    // Event delegation: replaces inline onclick="..." (XSS-hardened)
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action][data-id]');
        if (!btn) return;
        const id = btn.dataset.id;
        switch (btn.dataset.action) {
            case 'edit':         editReservation(id); break;
            case 'delete':       deleteReservation(id); break;
            case 'msg-read':     updateMessageStatus(id, 'read'); break;
            case 'msg-replied':  updateMessageStatus(id, 'replied'); break;
            case 'msg-delete':   deleteMessage(id); break;
        }
    });
    
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

// Logout functionality — cookies are cleared by the server.
async function logout() {
    await gmApi.logout();
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
        
        

        const response = await gmApi.apiFetch(`/reservations/all?${params}`);

        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load reservations');
        }
        
        const data = await response.json();
        dlog('Fetched reservation data:', data); // ← Add this line
        dlog('Sending reservations to display:', data.reservations); // ← Add this line

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
                <h3 class="reservation-name">${esc(reservation.fullName)}</h3>
                <span class="status-badge ${esc(reservation.status)}">${esc(reservation.status)}</span>
            </div>
            <div class="reservation-details">
                <div class="detail-item">
                    <i class="fas fa-envelope"></i>
                    <span>${esc(reservation.email)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${esc(reservation.phone)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>${esc(reservation.visitType)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${reservation.preferredDate ? esc(new Date(reservation.preferredDate).toLocaleDateString()) : 'Not specified'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-time"></i>
                    <span>${esc(reservation.preferredTime || 'Not specified')}</span>
                </div>
            </div>
            <div class="reservation-actions">
                <button class="action-btn edit" data-action="edit" data-id="${esc(reservation._id)}">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="action-btn delete" data-action="delete" data-id="${esc(reservation._id)}">
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
        const response = await gmApi.apiFetch(`/reservations/${id}`);

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
        const response = await gmApi.apiFetch(`/reservations/${id}`, {
            method: 'PUT',
            json: updateData,
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
    const ok = await gmConfirm({
        title: 'Delete reservation?',
        message: "This permanently removes the reservation. The customer's record will be lost.",
        confirmLabel: 'Delete',
        cancelLabel: 'Keep',
        danger: true,
    });
    if (!ok) return;
    
    try {
        const response = await gmApi.apiFetch(`/reservations/${id}`, { method: 'DELETE' });

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
    dlog('Export functionality - to be implemented');
    showAlert('Export functionality coming soon!', 'info');
}

// Add manual booking functionality
function addManualBooking() {
    dlog('Add manual booking functionality - to be implemented');
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

        const response = await gmApi.apiFetch(`/messages?${params}`);

        if (!response.ok) {
            if (response.status === 401) { logout(); return; }
            throw new Error('Failed to load messages');
        }
        
        const data = await response.json();
        dlog('Fetched message data:', data);

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
                <h3 class="message-name">${esc(message.name)}</h3>
                <span class="status-badge ${esc(message.status)}">${esc(message.status)}</span>
            </div>
            <div class="message-details">
                <div class="detail-item">
                    <i class="fas fa-envelope"></i>
                    <span>${esc(message.email)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${esc(message.phone)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${esc(new Date(message.createdAt).toLocaleDateString())}</span>
                </div>
            </div>
            <div class="message-content">
                <p>${esc(message.message)}</p>
            </div>
            <div class="message-actions">
                <button class="action-btn edit" data-action="msg-read" data-id="${esc(message._id)}">
                    <i class="fas fa-eye"></i>
                    Mark as Read
                </button>
                <button class="action-btn confirm" data-action="msg-replied" data-id="${esc(message._id)}">
                    <i class="fas fa-reply"></i>
                    Mark as Replied
                </button>
                <button class="action-btn delete" data-action="msg-delete" data-id="${esc(message._id)}">
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
        const response = await gmApi.apiFetch(`/messages/${messageId}`, {
            method: 'PUT',
            json: { status },
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
    const ok = await gmConfirm({
        title: 'Delete message?',
        message: "This permanently removes the customer's message.",
        confirmLabel: 'Delete',
        cancelLabel: 'Keep',
        danger: true,
    });
    if (!ok) return;

    try {
        const response = await gmApi.apiFetch(`/messages/${messageId}`, { method: 'DELETE' });

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
    const ok = await gmConfirm({
        title: 'Mark all as read?',
        message: 'This affects every pending message. The change cannot be undone.',
        confirmLabel: 'Mark all read',
        cancelLabel: 'Cancel',
    });
    if (!ok) return;
    try {
        // Get all pending messages
        const response = await gmApi.apiFetch('/messages?status=pending');

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

// Customers — server-side search + pagination so it scales past a few hundred users.
let customerPage = 1;
let customerSearchAbort = null;
let customerSearchDebounce = null;

async function loadAllCustomers(page = 1, search = '') {
    customerPage = page;
    // Cancel any in-flight request from a previous keystroke.
    if (customerSearchAbort) customerSearchAbort.abort();
    customerSearchAbort = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('search', search);

    try {
        const response = await gmApi.apiFetch(`/users/all?${params}`, {
            signal: customerSearchAbort.signal,
        });
        if (!response.ok) throw new Error('Failed to load customers');
        const data = await response.json();
        renderCustomersTable(data.data || []);
        renderCustomerPagination(data.pagination || {});
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error loading customers:', error.message);
        showAlert('Error loading customers', 'danger');
    }

    // Attach the debounced search handler once.
    const searchInput = document.getElementById('customerSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = '1';
        searchInput.addEventListener('input', () => {
            clearTimeout(customerSearchDebounce);
            customerSearchDebounce = setTimeout(() => {
                loadAllCustomers(1, searchInput.value.trim());
            }, 250);
        });
    }
}

function renderCustomerPagination({ currentPage, totalPages, total }) {
    let pager = document.getElementById('customerPagination');
    if (!pager) {
        pager = document.createElement('div');
        pager.id = 'customerPagination';
        pager.style.cssText = 'display:flex;align-items:center;gap:12px;margin-top:14px;justify-content:flex-end;color:var(--muted-text);';
        const wrapper = document.querySelector('.customers-table-wrapper');
        if (wrapper && wrapper.parentNode) wrapper.parentNode.appendChild(pager);
    }
    if (!totalPages || totalPages <= 1) {
        pager.innerHTML = total ? `<span>${total} customer${total === 1 ? '' : 's'}</span>` : '';
        return;
    }
    pager.innerHTML = '';
    const info = document.createElement('span');
    info.textContent = `Page ${currentPage} of ${totalPages} · ${total} total`;
    pager.appendChild(info);

    const mkBtn = (label, target, disabled) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.disabled = !!disabled;
        b.style.cssText = 'min-height:36px;padding:6px 14px;border-radius:8px;border:1px solid var(--border-color);background:transparent;color:var(--light-text);cursor:pointer;';
        if (disabled) { b.style.opacity = '0.5'; b.style.cursor = 'not-allowed'; }
        b.addEventListener('click', () => {
            const search = (document.getElementById('customerSearchInput') || {}).value || '';
            loadAllCustomers(target, search.trim());
        });
        return b;
    };
    pager.appendChild(mkBtn('Prev', currentPage - 1, currentPage <= 1));
    pager.appendChild(mkBtn('Next', currentPage + 1, currentPage >= totalPages));
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
            <td>${esc(user.fullName)}</td>
            <td>${esc(user.email)}</td>
            <td>${esc(user.role)}</td>
            <td>${user.createdAt ? esc(new Date(user.createdAt).toLocaleDateString()) : ''}</td>
        `;
        tbody.appendChild(tr);
    });
}