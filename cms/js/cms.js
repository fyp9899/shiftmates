// API Base URL - Dynamic
const API_URL = window.location.origin + '/api';

// Store original data for search
let allUsers = [];
let allBookings = [];
let allInventory = [];
let allLoyalty = [];
let allReviews = [];
let allMedia = [];
let allEmployees = [];
let allVehicles = [];
let allSupervisors = [];
let allPackages = [];
let allServices = [];
let allPromoCodes = [];
let allConfirmationSlips = [];

// Check admin session on load
document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();
});

async function checkAdminSession() {
    try {
        const response = await fetch(`${API_URL}/admin/check`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.loggedIn) {
            showDashboard();
            loadDashboardStats();
            loadUsers();
            loadBookings();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Admin Login
document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            showDashboard();
            loadDashboardStats();
            loadUsers();
            loadBookings();
        } else {
            alert('Invalid credentials. Use Admin / admin');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Login failed');
    }
});

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
}

function adminLogout() {
    fetch(`${API_URL}/admin/logout`, {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        location.reload();
    });
}

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const section = link.dataset.section;
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${section}Section`).classList.add('active');
        
        const titles = {
            dashboard: 'Dashboard',
            users: 'Users Management',
            employees: 'Employees Management',
            vehicles: 'Vehicles Management',
            supervisors: 'Supervisors Management',
            packages: 'Packages Management',
            additionalServices: 'Additional Services',
            bookings: 'Bookings Management',
            inventory: 'Inventory Management',
            loyalty: 'Loyalty Points',
            promoCodes: 'Promo Codes',
            reviews: 'Customer Reviews',
            media: 'Media Gallery',
            confirmationSlips: 'Confirmation Slips'
        };
        document.getElementById('sectionTitle').textContent = titles[section];
        
        // Load data when section is opened
        if (section === 'users') loadUsers();
        else if (section === 'employees') loadEmployees();
        else if (section === 'vehicles') loadVehicles();
        else if (section === 'supervisors') loadSupervisors();
        else if (section === 'packages') loadPackages();
        else if (section === 'additionalServices') loadAdditionalServices();
        else if (section === 'bookings') loadBookings();
        else if (section === 'inventory') loadInventory();
        else if (section === 'loyalty') loadLoyalty();
        else if (section === 'promoCodes') loadPromoCodes();
        else if (section === 'reviews') loadReviews();
        else if (section === 'media') loadMedia();
        else if (section === 'confirmationSlips') loadConfirmationSlips();
    });
});

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const [users, bookings, reviews] = await Promise.all([
            fetch(`${API_URL}/admin/users`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${API_URL}/admin/bookings`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${API_URL}/admin/reviews`, { credentials: 'include' }).then(r => r.json())
        ]);
        
        document.getElementById('totalUsers').textContent = users.length;
        document.getElementById('totalBookings').textContent = bookings.length;
        document.getElementById('pendingBookings').textContent = bookings.filter(b => b.status === 'pending').length;
        document.getElementById('completedBookings').textContent = bookings.filter(b => b.status === 'completed').length;
        document.getElementById('totalPoints').textContent = users.reduce((sum, u) => sum + (u.points || 0), 0);
        document.getElementById('avgRating').textContent = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;
        
        const recentTable = document.querySelector('#recentBookingsTable tbody');
        if (recentTable) {
            recentTable.innerHTML = bookings.slice(0, 5).map(booking => `
                <tr>
                    <td>${booking.id}</td>
                    <td>${booking.firstname || ''} ${booking.lastname || ''}</td>
                    <td>${booking.relocation_type || '-'}</td>
                    <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================
// USERS MANAGEMENT
// ============================================

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, { credentials: 'include' });
        if (!response.ok) return;
        allUsers = await response.json();
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        const tableBody = document.querySelector('#usersTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="10">Error loading users</td></tr>';
        }
    }
}

function displayUsers(users) {
    const tableBody = document.querySelector('#usersTable tbody');
    if (!tableBody) return;
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="10">No users found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td><strong>${user.firstname} ${user.lastname}</strong></td>
            <td>${user.email}</td>
            <td>${user.contact_number || '-'}</td>
            <td>${user.city || '-'}</td>
            <td>${user.cnic || '-'}</td>
            <td>${user.points || 0}</td>
            <td><span class="status-badge">${user.tier || 'Bronze'}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn-delete-user" onclick="deleteUser(${user.id}, '${user.firstname} ${user.lastname}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function searchUsers() {
    const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase() || '';
    if (!searchTerm) {
        displayUsers(allUsers);
        return;
    }
    
    const filteredUsers = allUsers.filter(user => 
        (user.firstname && user.firstname.toLowerCase().includes(searchTerm)) ||
        (user.lastname && user.lastname.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.contact_number && user.contact_number.includes(searchTerm))
    );
    displayUsers(filteredUsers);
}

async function deleteUser(userId, userName) {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone!`)) {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                alert(`User "${userName}" deleted successfully`);
                loadUsers();
                loadDashboardStats();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user. Please try again.');
        }
    }
}

// ============================================
// INVENTORY MANAGEMENT
// ============================================

async function loadInventory() {
    try {
        const response = await fetch(`${API_URL}/admin/inventory`, { credentials: 'include' });
        if (!response.ok) return;
        allInventory = await response.json();
        displayInventory(allInventory);
    } catch (error) {
        console.error('Error loading inventory:', error);
        const tableBody = document.querySelector('#inventoryTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Error loading inventory</td></tr>';
        }
    }
}

function displayInventory(items) {
    const tableBody = document.querySelector('#inventoryTable tbody');
    if (!tableBody) return;
    
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">No inventory items found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = items.map(item => `
        <table>
            <td>${item.id}</td>
            <td>${item.customer_name || 'User ' + item.user_id}</td>
            <td>#${item.booking_id || '-'}</td>
            <td>${item.room_name || '-'}</td>
            <td>${item.item_name}</td>
            <td>${item.is_fragile ? 'Yes' : 'No'}</td>
            <td><span class="status-badge">${item.status || 'pending'}</span></td>
            <td>
                <button class="btn-edit" onclick="updateInventoryStatus(${item.id})">Update Status</button>
            </td>
        </tr>
    `).join('');
}

async function updateInventoryStatus(itemId) {
    const status = prompt('Enter new status (pending/packed/loaded/delivered):', 'packed');
    if (status && ['pending', 'packed', 'loaded', 'delivered'].includes(status)) {
        try {
            await fetch(`${API_URL}/admin/inventory/${itemId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });
            loadInventory();
            alert('Status updated');
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating status');
        }
    } else if (status) {
        alert('Invalid status. Use: pending, packed, loaded, delivered');
    }
}

// ============================================
// LOYALTY MANAGEMENT
// ============================================

async function loadLoyalty() {
    try {
        const response = await fetch(`${API_URL}/admin/loyalty`, { credentials: 'include' });
        if (!response.ok) return;
        allLoyalty = await response.json();
        displayLoyalty(allLoyalty);
    } catch (error) {
        console.error('Error loading loyalty:', error);
        const tableBody = document.querySelector('#loyaltyTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Error loading loyalty data</td></tr>';
        }
    }
}

function displayLoyalty(users) {
    const tableBody = document.querySelector('#loyaltyTable tbody');
    if (!tableBody) return;
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No loyalty data found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.firstname} ${user.lastname}</td>
            <td>${user.points || 0}</td>
            <td><span class="status-badge">${user.tier || 'Bronze'}</span></td>
            <td>${user.referral_code || '-'}</td>
            <td>
                <button class="btn-edit" onclick="openPointsModal(${user.id}, ${user.points || 0})">Adjust Points</button>
            </td>
        </tr>
    `).join('');
}

function openPointsModal(userId, currentPoints) {
    document.getElementById('pointsModal').style.display = 'block';
    document.getElementById('pointsUserId').value = userId;
    document.getElementById('pointsAmount').value = '';
    document.getElementById('pointsReason').value = '';
    document.body.style.overflow = 'hidden';
}

function closePointsModal() {
    document.getElementById('pointsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function updateUserPoints() {
    const userId = document.getElementById('pointsUserId').value;
    const amount = parseInt(document.getElementById('pointsAmount').value);
    const reason = document.getElementById('pointsReason').value;
    
    if (isNaN(amount)) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (!reason) {
        alert('Please provide a reason');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/loyalty/update-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId, amount, reason })
        });
        
        if (response.ok) {
            closePointsModal();
            loadLoyalty();
            alert('Points updated successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error updating points');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating points');
    }
}

// ============================================
// REVIEWS MANAGEMENT
// ============================================

async function loadReviews() {
    try {
        const response = await fetch(`${API_URL}/admin/reviews`, { credentials: 'include' });
        if (!response.ok) return;
        allReviews = await response.json();
        displayReviews(allReviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
        const tableBody = document.querySelector('#reviewsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Error loading reviews</td></tr>';
        }
    }
}

function displayReviews(reviews) {
    const tableBody = document.querySelector('#reviewsTable tbody');
    if (!tableBody) return;
    
    if (!reviews || reviews.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">No reviews found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = reviews.map(review => `
        <tr>
            <td>${review.id}</td>
            <td>${review.user_name || review.user_id}</td>
            <td>#${review.booking_id}</td>
            <td><span style="color: #ffc107;">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span> (${review.rating})</td>
            <td>${review.comment?.substring(0, 50) || '-'}...</td>
            <td>${new Date(review.created_at).toLocaleDateString()}</td>
            <td><span class="status-badge">${review.status || 'pending'}</span></td>
            <td>
                <button class="btn-edit" onclick="toggleReviewStatus(${review.id})">Toggle Status</button>
                <button class="btn-delete" onclick="deleteReview(${review.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function toggleReviewStatus(reviewId) {
    try {
        await fetch(`${API_URL}/admin/reviews/${reviewId}/toggle`, {
            method: 'PUT',
            credentials: 'include'
        });
        loadReviews();
        alert('Review status updated');
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating review status');
    }
}

async function deleteReview(reviewId) {
    if (confirm('Are you sure you want to delete this review?')) {
        try {
            await fetch(`${API_URL}/admin/reviews/${reviewId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadReviews();
            loadDashboardStats();
            alert('Review deleted');
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting review');
        }
    }
}

// ============================================
// MEDIA MANAGEMENT
// ============================================

async function loadMedia() {
    try {
        const response = await fetch(`${API_URL}/admin/booking-media`, { credentials: 'include' });
        if (!response.ok) return;
        allMedia = await response.json();
        displayMedia(allMedia);
    } catch (error) {
        console.error('Error loading media:', error);
        const tableBody = document.querySelector('#mediaTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Error loading media</td></tr>';
        }
    }
}

function displayMedia(media) {
    const tableBody = document.querySelector('#mediaTable tbody');
    if (!tableBody) return;
    
    if (!media || media.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No media found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = media.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.customer_name || '-'}</td>
            <td>#${item.booking_id || '-'}</td>
            <td>${item.item_name || '-'}</td>
            <td>${item.media_type === 'photo' ? '📷 Photo' : '🎥 Video'}</td>
            <td>${new Date(item.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn-edit" onclick="viewMedia('${item.media_url}')">View</button>
                <button class="btn-delete" onclick="deleteMedia(${item.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function viewMedia(url) {
    window.open(url, '_blank');
}

async function deleteMedia(id) {
    if (confirm('Are you sure you want to delete this media?')) {
        try {
            await fetch(`${API_URL}/admin/booking-media/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadMedia();
            alert('Media deleted');
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting media');
        }
    }
}

// ============================================
// CONFIRMATION SLIPS MANAGEMENT
// ============================================

async function loadConfirmationSlips() {
    try {
        const response = await fetch(`${API_URL}/admin/confirmation-slips`, { 
            credentials: 'include' 
        });
        if (!response.ok) return;
        allConfirmationSlips = await response.json();
        displayConfirmationSlips(allConfirmationSlips);
    } catch (error) {
        console.error('Error loading confirmation slips:', error);
        const tableBody = document.querySelector('#confirmationSlipsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="10">Error loading confirmation slips</td></tr>';
        }
    }
}

function displayConfirmationSlips(slips) {
    const tableBody = document.querySelector('#confirmationSlipsTable tbody');
    if (!tableBody) return;
    
    if (!slips || slips.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="10">No confirmation slips found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = slips.map(slip => `
        <tr>
            <td><strong>${slip.slip_number}</strong></td>
            <td>${slip.customer_name}</td>
            <td>#${slip.booking_id}</td>
            <td>${new Date(slip.booking_date).toLocaleDateString()} at ${slip.booking_time}</td>
            <td>${slip.truck_name || '-'}</td>
            <td>${slip.driver_name || '-'}</td>
            <td>${slip.supervisor_name || '-'}</td>
            <td><strong>RS${slip.total_price}</strong></td>
            <td><span class="status-badge">${slip.status}</span></td>
            <td>
                <button class="btn-edit" onclick="viewSlipDetails(${slip.id})">View Details</button>
                <button class="btn-update-status" onclick="updateSlipStatus(${slip.id})">Update Status</button>
            </td>
        </tr>
    `).join('');
}

function viewSlipDetails(slipId) {
    const slip = allConfirmationSlips.find(s => s.id === slipId);
    if (slip) {
        // Remove existing modal if any
        const existingModal = document.getElementById('slipDetailModal');
        if (existingModal) existingModal.remove();
        
        const modalHtml = `
            <div id="slipDetailModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 550px; max-height: 85vh; overflow-y: auto;">
                    <span class="close" onclick="closeSlipDetailModal()">&times;</span>
                    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #4caf50; padding-bottom: 10px;">
                        <h2 style="color: #2e7d32;">ShiftMates</h2>
                        <p>Booking Confirmation Slip</p>
                        <p><strong>Slip #: ${slip.slip_number}</strong></p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Customer Information</h4>
                        <p><strong>Name:</strong> ${slip.customer_name}</p>
                        <p><strong>Email:</strong> ${slip.customer_email || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${slip.customer_phone || 'N/A'}</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Moving Details</h4>
                        <p><strong>Type:</strong> ${slip.relocation_type?.toUpperCase()}</p>
                        <p><strong>Package:</strong> ${slip.package_name}</p>
                        <p><strong>Labourers:</strong> ${slip.laborers_count}</p>
                        <p><strong>Date:</strong> ${new Date(slip.booking_date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${slip.booking_time}</p>
                        <p><strong>Day:</strong> ${slip.booking_day}</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Addresses</h4>
                        <p><strong>Pickup:</strong> ${slip.pickup_address}</p>
                        <p><strong>Dropoff:</strong> ${slip.dropoff_address}</p>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 10px; margin-bottom: 15px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Assigned Team</h4>
                        <p><strong>Truck:</strong> ${slip.truck_name} (${slip.truck_registration})</p>
                        <p><strong>Driver:</strong> ${slip.driver_name} - ${slip.driver_contact}</p>
                        <p><strong>Supervisor:</strong> ${slip.supervisor_name} - ${slip.supervisor_contact}</p>
                    </div>
                    
                    <div style="text-align: center; border-top: 1px solid #ddd; padding-top: 15px;">
                        <h3 style="color: #2e7d32;">Total Amount: RS${slip.total_price}</h3>
                        <p style="font-size: 11px; color: #888; margin-top: 5px;">Generated on: ${new Date(slip.generated_at).toLocaleString()}</p>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.print()" class="btn-submit" style="background: #4caf50; flex: 1;">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button onclick="closeSlipDetailModal()" class="btn-submit" style="background: #666; flex: 1;">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

function closeSlipDetailModal() {
    const modal = document.getElementById('slipDetailModal');
    if (modal) modal.remove();
}

async function updateSlipStatus(slipId) {
    const newStatus = prompt('Enter new status (generated/printed/cancelled):', 'printed');
    if (newStatus && ['generated', 'printed', 'cancelled'].includes(newStatus.toLowerCase())) {
        try {
            const response = await fetch(`${API_URL}/admin/confirmation-slips/${slipId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus.toLowerCase() })
            });
            
            if (response.ok) {
                loadConfirmationSlips();
                alert('Slip status updated successfully');
            } else {
                alert('Error updating slip status');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating slip status');
        }
    } else if (newStatus) {
        alert('Invalid status. Use: generated, printed, cancelled');
    }
}

function searchSlips() {
    const searchTerm = document.getElementById('slipSearchInput')?.value.toLowerCase() || '';
    if (!searchTerm) {
        displayConfirmationSlips(allConfirmationSlips);
        return;
    }
    
    const filteredSlips = allConfirmationSlips.filter(slip => 
        (slip.slip_number && slip.slip_number.toLowerCase().includes(searchTerm)) ||
        (slip.customer_name && slip.customer_name.toLowerCase().includes(searchTerm)) ||
        (slip.booking_id && slip.booking_id.toString().includes(searchTerm))
    );
    displayConfirmationSlips(filteredSlips);
}

// ============================================
// BOOKINGS MANAGEMENT
// ============================================

async function loadBookings() {
    try {
        const response = await fetch(`${API_URL}/admin/bookings`, { credentials: 'include' });
        if (!response.ok) return;
        allBookings = await response.json();
        displayBookings(allBookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        const tableBody = document.querySelector('#bookingsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="9">Error loading bookings</td></tr>';
        }
    }
}

function displayBookings(bookings) {
    const tableBody = document.querySelector('#bookingsTable tbody');
    if (!tableBody) return;
    
    if (!bookings || bookings.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="9">No bookings found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = bookings.map(booking => `
        <tr>
            <td>${booking.id}</td>
            <td><strong>${booking.firstname || '-'} ${booking.lastname || '-'}</strong></td>
            <td>${booking.relocation_type || '-'}</td>
            <td>${booking.package_name || '-'}</td>
            <td>${booking.vehicle_name || '-'}</td>
            <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
            <td>RS${booking.total_price || 0}</td>
            <td><span class="status-badge status-${booking.status}">${booking.status || 'pending'}</span></td>
            <td>
                <button class="btn-update-status" onclick="openStatusModal(${booking.id})">Update Status</button>
                ${booking.status === 'confirmed' ? '<button class="btn-edit" onclick="viewBookingSlip(' + booking.id + ')" style="margin-left: 5px;">View Slip</button>' : ''}
            </td>
        </tr>
    `).join('');
}

async function viewBookingSlip(bookingId) {
    try {
        // First check if slip exists
        const response = await fetch(`${API_URL}/bookings/${bookingId}/slip`, {
            credentials: 'include'
        });
        const slip = await response.json();
        
        if (slip && slip.id) {
            viewSlipDetails(slip.id);
        } else {
            alert('No confirmation slip found for this booking. Please confirm the booking first.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading slip');
    }
}

function searchBookings() {
    const searchTerm = document.getElementById('bookingSearchInput')?.value.toLowerCase() || '';
    if (!searchTerm) {
        displayBookings(allBookings);
        return;
    }
    
    const filteredBookings = allBookings.filter(booking => 
        (booking.id && booking.id.toString().includes(searchTerm)) ||
        (booking.firstname && booking.firstname.toLowerCase().includes(searchTerm)) ||
        (booking.lastname && booking.lastname.toLowerCase().includes(searchTerm)) ||
        (booking.status && booking.status.toLowerCase().includes(searchTerm))
    );
    displayBookings(filteredBookings);
}

function openStatusModal(bookingId) {
    document.getElementById('statusModal').style.display = 'block';
    document.getElementById('statusBookingId').value = bookingId;
    document.body.style.overflow = 'hidden';
}

function closeStatusModal() {
    document.getElementById('statusModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function updateBookingStatus() {
    const bookingId = document.getElementById('statusBookingId').value;
    const status = document.getElementById('bookingStatus').value;
    
    try {
        // Update booking status
        const response = await fetch(`${API_URL}/admin/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            // If status is confirmed, generate confirmation slip
            if (status === 'confirmed') {
                const generateResponse = await fetch(`${API_URL}/bookings/${bookingId}/generate-slip`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({})
                });
                
                if (generateResponse.ok) {
                    alert('Booking confirmed and confirmation slip generated successfully!');
                } else {
                    alert('Booking status updated but slip generation failed');
                }
            } else {
                alert('Status updated successfully');
            }
            
            closeStatusModal();
            loadBookings();
            loadDashboardStats();
            loadConfirmationSlips();
        } else {
            const error = await response.json();
            alert(error.error || 'Error updating status');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating status');
    }
}

// ============================================
// EMPLOYEES MANAGEMENT
// ============================================

async function loadEmployees() {
    try {
        const response = await fetch(`${API_URL}/admin/employees`, { credentials: 'include' });
        if (!response.ok) return;
        allEmployees = await response.json();
        displayEmployees(allEmployees);
    } catch (error) {
        console.error('Error loading employees:', error);
        const tableBody = document.querySelector('#employeesTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Error loading employees</td></tr>';
        }
    }
}

function displayEmployees(employees) {
    const tableBody = document.querySelector('#employeesTable tbody');
    if (!tableBody) return;
    
    if (!employees || employees.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">No employees found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.id}</td>
            <td>${emp.employee_name}</td>
            <td>${emp.employee_contact}</td>
            <td>${emp.employee_cnic}</td>
            <td>${emp.employee_type}</td>
            <td>RS${emp.employee_charge_per_visit}</td>
            <td><span class="status-badge">${emp.status}</span>
                        <td>
                <button class="btn-edit" onclick="editEmployee(${emp.id})">Edit</button>
                <button class="btn-delete" onclick="deleteEmployee(${emp.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openEmployeeModal(employee = null) {
    document.getElementById('employeeModal').style.display = 'block';
    if (employee) {
        document.getElementById('employeeId').value = employee.id;
        document.getElementById('empName').value = employee.employee_name;
        document.getElementById('empContact').value = employee.employee_contact;
        document.getElementById('empCnic').value = employee.employee_cnic;
        document.getElementById('empAge').value = employee.employee_age;
        document.getElementById('empType').value = employee.employee_type;
        document.getElementById('empCharge').value = employee.employee_charge_per_visit;
        document.getElementById('empStatus').value = employee.status;
    } else {
        document.getElementById('employeeForm').reset();
        document.getElementById('employeeId').value = '';
    }
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

document.getElementById('employeeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('employeeId').value;
    const data = {
        employee_name: document.getElementById('empName').value,
        employee_contact: document.getElementById('empContact').value,
        employee_cnic: document.getElementById('empCnic').value,
        employee_age: document.getElementById('empAge').value || null,
        employee_type: document.getElementById('empType').value,
        employee_charge_per_visit: document.getElementById('empCharge').value,
        status: document.getElementById('empStatus').value
    };
    
    try {
        let response;
        if (id) {
            response = await fetch(`${API_URL}/admin/employees/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_URL}/admin/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        }
        
        if (response.ok) {
            closeEmployeeModal();
            loadEmployees();
            alert(id ? 'Employee updated' : 'Employee added');
        } else {
            const error = await response.json();
            alert(error.error || 'Operation failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving employee');
    }
});

function editEmployee(id) {
    const employee = allEmployees.find(e => e.id === id);
    if (employee) openEmployeeModal(employee);
}

async function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            await fetch(`${API_URL}/admin/employees/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadEmployees();
            alert('Employee deleted');
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting employee');
        }
    }
}

// ============================================
// VEHICLES MANAGEMENT
// ============================================

async function loadVehicles() {
    try {
        const response = await fetch(`${API_URL}/admin/vehicles`, { credentials: 'include' });
        if (!response.ok) return;
        allVehicles = await response.json();
        displayVehicles(allVehicles);
    } catch (error) {
        console.error('Error loading vehicles:', error);
        const tableBody = document.querySelector('#vehiclesTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Error loading vehicles</td></tr>';
        }
    }
}

function displayVehicles(vehicles) {
    const tableBody = document.querySelector('#vehiclesTable tbody');
    if (!tableBody) return;
    
    if (!vehicles || vehicles.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">No vehicles found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = vehicles.map(v => `
        <tr>
            <td>${v.id}</td>
            <td>${v.vehicle_registration_number}</td>
            <td>${v.driver_name}</td>
            <td>${v.driver_contact}</td>
            <td>${v.vehicle_name}</td>
            <td>${v.vehicle_size}</td>
            <td><span class="status-badge">${v.status}</span></td>
            <td>
                <button class="btn-edit" onclick="editVehicle(${v.id})">Edit</button>
                <button class="btn-delete" onclick="deleteVehicle(${v.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openVehicleModal(vehicle = null) {
    document.getElementById('vehicleModal').style.display = 'block';
    if (vehicle) {
        document.getElementById('vehicleId').value = vehicle.id;
        document.getElementById('vehicleReg').value = vehicle.vehicle_registration_number;
        document.getElementById('driverName').value = vehicle.driver_name;
        document.getElementById('driverContact').value = vehicle.driver_contact;
        document.getElementById('driverCnic').value = vehicle.driver_cnic;
        document.getElementById('vehicleName').value = vehicle.vehicle_name;
        document.getElementById('vehicleYear').value = vehicle.vehicle_model_year;
        document.getElementById('vehicleSize').value = vehicle.vehicle_size;
        document.getElementById('vehicleArea').value = vehicle.vehicle_area;
        document.getElementById('vehicleStatus').value = vehicle.status;
    } else {
        document.getElementById('vehicleForm').reset();
        document.getElementById('vehicleId').value = '';
    }
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').style.display = 'none';
}

document.getElementById('vehicleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('vehicleId').value;
    const data = {
        vehicle_registration_number: document.getElementById('vehicleReg').value,
        driver_name: document.getElementById('driverName').value,
        driver_contact: document.getElementById('driverContact').value,
        driver_cnic: document.getElementById('driverCnic').value,
        vehicle_model_year: document.getElementById('vehicleYear').value || null,
        vehicle_name: document.getElementById('vehicleName').value,
        vehicle_size: document.getElementById('vehicleSize').value,
        vehicle_area: document.getElementById('vehicleArea').value,
        status: document.getElementById('vehicleStatus').value
    };
    
    try {
        let response;
        if (id) {
            response = await fetch(`${API_URL}/admin/vehicles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_URL}/admin/vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        }
        
        if (response.ok) {
            closeVehicleModal();
            loadVehicles();
            alert(id ? 'Vehicle updated' : 'Vehicle added');
        } else {
            const error = await response.json();
            alert(error.error || 'Operation failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving vehicle');
    }
});

function editVehicle(id) {
    const vehicle = allVehicles.find(v => v.id === id);
    if (vehicle) openVehicleModal(vehicle);
}

async function deleteVehicle(id) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
        try {
            await fetch(`${API_URL}/admin/vehicles/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadVehicles();
            alert('Vehicle deleted');
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting vehicle');
        }
    }
}

// ============================================
// SUPERVISORS MANAGEMENT
// ============================================

async function loadSupervisors() {
    try {
        const response = await fetch(`${API_URL}/admin/supervisors`, { credentials: 'include' });
        if (!response.ok) return;
        allSupervisors = await response.json();
        displaySupervisors(allSupervisors);
    } catch (error) {
        console.error('Error loading supervisors:', error);
        const tableBody = document.querySelector('#supervisorsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="9">Error loading supervisors</td></tr>';
        }
    }
}

function displaySupervisors(supervisors) {
    const tableBody = document.querySelector('#supervisorsTable tbody');
    if (!tableBody) return;
    
    if (!supervisors || supervisors.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="9">No supervisors found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = supervisors.map(s => `
        <tr>
            <td>${s.id}</td>
            <td>${s.supervisor_name}</td>
            <td>${s.supervisor_contact}</td>
            <td>${s.supervisor_cnic}</td>
            <td>${s.supervisor_area || '-'}</td>
            <td>${s.supervisor_city || '-'}</td>
            <td>RS${s.supervisor_salary || 0}</td>
            <td><span class="status-badge">${s.status}</span></td>
            <td>
                <button class="btn-edit" onclick="editSupervisor(${s.id})">Edit</button>
                <button class="btn-delete" onclick="deleteSupervisor(${s.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openSupervisorModal(supervisor = null) {
    document.getElementById('supervisorModal').style.display = 'block';
    if (supervisor) {
        document.getElementById('supervisorId').value = supervisor.id;
        document.getElementById('supName').value = supervisor.supervisor_name;
        document.getElementById('supAge').value = supervisor.supervisor_age;
        document.getElementById('supContact').value = supervisor.supervisor_contact;
        document.getElementById('supCnic').value = supervisor.supervisor_cnic;
        document.getElementById('supArea').value = supervisor.supervisor_area;
        document.getElementById('supSalary').value = supervisor.supervisor_salary;
        document.getElementById('supCity').value = supervisor.supervisor_city;
        document.getElementById('supStatus').value = supervisor.status;
    } else {
        document.getElementById('supervisorForm').reset();
        document.getElementById('supervisorId').value = '';
    }
}

function closeSupervisorModal() {
    document.getElementById('supervisorModal').style.display = 'none';
}

document.getElementById('supervisorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('supervisorId').value;
    const data = {
        supervisor_name: document.getElementById('supName').value,
        supervisor_age: document.getElementById('supAge').value || null,
        supervisor_contact: document.getElementById('supContact').value,
        supervisor_cnic: document.getElementById('supCnic').value,
        supervisor_area: document.getElementById('supArea').value,
        supervisor_salary: document.getElementById('supSalary').value,
        supervisor_city: document.getElementById('supCity').value,
        status: document.getElementById('supStatus').value
    };
    
    try {
        let response;
        if (id) {
            response = await fetch(`${API_URL}/admin/supervisors/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_URL}/admin/supervisors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        }
        
        if (response.ok) {
            closeSupervisorModal();
            loadSupervisors();
            alert(id ? 'Supervisor updated' : 'Supervisor added');
        } else {
            const error = await response.json();
            alert(error.error || 'Operation failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving supervisor');
    }
});

function editSupervisor(id) {
    const supervisor = allSupervisors.find(s => s.id === id);
    if (supervisor) openSupervisorModal(supervisor);
}

async function deleteSupervisor(id) {
    if (confirm('Are you sure you want to delete this supervisor?')) {
        try {
            await fetch(`${API_URL}/admin/supervisors/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadSupervisors();
            alert('Supervisor deleted');
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting supervisor');
        }
    }
}

// ============================================
// PACKAGES MANAGEMENT
// ============================================

async function loadPackages() {
    try {
        const response = await fetch(`${API_URL}/admin/packages`, { credentials: 'include' });
        if (!response.ok) return;
        allPackages = await response.json();
        displayPackages(allPackages);
    } catch (error) {
        console.error('Error loading packages:', error);
        const tableBody = document.querySelector('#packagesTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="9">Error loading packages</td></tr>';
        }
    }
}

function displayPackages(packages) {
    const tableBody = document.querySelector('#packagesTable tbody');
    if (!tableBody) return;
    
    if (!packages || packages.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="9">No packages found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = packages.map(pkg => `
        <tr>
            <td>${pkg.id}</td>
            <td>${pkg.package_name.toUpperCase()}</td>
            <td>RS${pkg.price}</td>
            <td>${pkg.laborers}</td>
            <td>${pkg.truck_size || '-'}</td>
            <td>${pkg.insurance_type || '-'}</td>
            <td>${pkg.packing_materials ? 'Yes' : 'No'}</td>
            <td>${pkg.furniture_assembly ? 'Yes' : 'No'}</td>
            <td>
                <button class="btn-edit" onclick="openPackageModal(${pkg.id})">Edit</button>
            </td>
        </tr>
    `).join('');
}

function openPackageModal(packageId) {
    const pkg = allPackages.find(p => p.id === packageId);
    if (pkg) {
        document.getElementById('packageModal').style.display = 'block';
        document.getElementById('packageId').value = pkg.id;
        document.getElementById('packagePrice').value = pkg.price;
        document.getElementById('packageLaborers').value = pkg.laborers;
        document.getElementById('packageTruckSize').value = pkg.truck_size || '';
        document.getElementById('packageInsurance').value = pkg.insurance_type || '';
        document.getElementById('packagePackingMaterials').value = pkg.packing_materials ? 'Yes' : 'No';
        document.getElementById('packageFurnitureAssembly').value = pkg.furniture_assembly ? 'Yes' : 'No';
        document.getElementById('packageDescription').value = pkg.description || '';
    }
}

function closePackageModal() {
    document.getElementById('packageModal').style.display = 'none';
}

async function updatePackage() {
    const id = document.getElementById('packageId').value;
    const data = {
        price: document.getElementById('packagePrice').value,
        laborers: document.getElementById('packageLaborers').value,
        truck_size: document.getElementById('packageTruckSize').value,
        insurance_type: document.getElementById('packageInsurance').value,
        packing_materials: document.getElementById('packagePackingMaterials').value === 'Yes',
        furniture_assembly: document.getElementById('packageFurnitureAssembly').value === 'Yes',
        description: document.getElementById('packageDescription').value
    };
    
    try {
        const response = await fetch(`${API_URL}/admin/packages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closePackageModal();
            loadPackages();
            alert('Package updated');
        } else {
            const error = await response.json();
            alert(error.error || 'Update failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating package');
    }
}

// ============================================
// ADDITIONAL SERVICES MANAGEMENT
// ============================================

async function loadAdditionalServices() {
    try {
        const response = await fetch(`${API_URL}/admin/additional-services`, { credentials: 'include' });
        if (!response.ok) return;
        allServices = await response.json();
        displayAdditionalServices(allServices);
    } catch (error) {
        console.error('Error loading services:', error);
        const tableBody = document.querySelector('#additionalServicesTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Error loading services</td></tr>';
        }
    }
}

function displayAdditionalServices(services) {
    const tableBody = document.querySelector('#additionalServicesTable tbody');
    if (!tableBody) return;
    
    if (!services || services.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No services found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = services.map(s => `
        <tr>
            <td>${s.id}</td>
            <td>${s.service_name}</td>
            <td>${s.service_type || '-'}</td>
            <td>RS${s.price}</td>
            <td>${s.description || '-'}</td>
            <td>
                <button class="btn-edit" onclick="editAdditionalService(${s.id})">Edit</button>
                <button class="btn-delete" onclick="deleteAdditionalService(${s.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openAdditionalServiceModal(service = null) {
    document.getElementById('additionalServiceModal').style.display = 'block';
    if (service) {
        document.getElementById('serviceId').value = service.id;
        document.getElementById('serviceName').value = service.service_name;
        document.getElementById('serviceType').value = service.service_type || '';
        document.getElementById('servicePrice').value = service.price;
        document.getElementById('serviceDescription').value = service.description || '';
    } else {
        document.getElementById('additionalServiceForm')?.reset();
        document.getElementById('serviceId').value = '';
    }
}

function closeAdditionalServiceModal() {
    document.getElementById('additionalServiceModal').style.display = 'none';
}

async function saveAdditionalService() {
    const id = document.getElementById('serviceId').value;
    const data = {
        service_name: document.getElementById('serviceName').value,
        service_type: document.getElementById('serviceType').value,
        price: document.getElementById('servicePrice').value,
        description: document.getElementById('serviceDescription').value
    };
    
    try {
        let response;
        if (id) {
            response = await fetch(`${API_URL}/admin/additional-services/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_URL}/admin/additional-services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        }
        
        if (response.ok) {
            closeAdditionalServiceModal();
            loadAdditionalServices();
            alert(id ? 'Service updated' : 'Service added');
        } else {
            const error = await response.json();
            alert(error.error || 'Operation failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving service');
    }
}

function editAdditionalService(id) {
    const service = allServices.find(s => s.id === id);
    if (service) openAdditionalServiceModal(service);
}

async function deleteAdditionalService(id) {
    if (confirm('Are you sure you want to delete this service?')) {
        try {
            await fetch(`${API_URL}/admin/additional-services/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadAdditionalServices();
            alert('Service deleted');
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting service');
        }
    }
}

// ============================================
// PROMO CODES MANAGEMENT
// ============================================

async function loadPromoCodes() {
    try {
        const response = await fetch(`${API_URL}/admin/promocodes`, { credentials: 'include' });
        if (!response.ok) return;
        allPromoCodes = await response.json();
        displayPromoCodes(allPromoCodes);
    } catch (error) {
        console.error('Error loading promo codes:', error);
        const tableBody = document.querySelector('#promoCodesTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Error loading promo codes</td></tr>';
        }
    }
}

function displayPromoCodes(promos) {
    const tableBody = document.querySelector('#promoCodesTable tbody');
    if (!tableBody) return;
    
    if (!promos || promos.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">No promo codes found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = promos.map(p => `
        <tr>
            <td>${p.id}</td>
            <td><strong>${p.code}</strong></td>
            <td>${p.discount_percentage}%</td>
            <td>${p.valid_until ? new Date(p.valid_until).toLocaleDateString() : 'Never'}</td>
            <td>${p.usage_limit || '-'}</td>
            <td>${p.used_count || 0}</td>
            <td>${p.is_active ? '<span class="status-badge">Active</span>' : '<span class="status-badge">Inactive</span>'}</td>
            <td>
                <button class="btn-edit" onclick="editPromoCode(${p.id})">Edit</button>
                <button class="btn-delete" onclick="deletePromoCode(${p.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openPromoCodeModal(promo = null) {
    document.getElementById('promoCodeModal').style.display = 'block';
    if (promo) {
        document.getElementById('promoId').value = promo.id;
        document.getElementById('promoCode').value = promo.code;
        document.getElementById('promoDiscount').value = promo.discount_percentage;
        document.getElementById('promoValidUntil').value = promo.valid_until ? promo.valid_until.split('T')[0] : '';
        document.getElementById('promoUsageLimit').value = promo.usage_limit;
        document.getElementById('promoStatus').value = promo.is_active ? 'active' : 'inactive';
    } else {
        document.getElementById('promoCodeForm')?.reset();
        document.getElementById('promoId').value = '';
    }
}

function closePromoCodeModal() {
    document.getElementById('promoCodeModal').style.display = 'none';
}

async function savePromoCode() {
    const id = document.getElementById('promoId').value;
    const data = {
        code: document.getElementById('promoCode').value.toUpperCase(),
        discount_percentage: document.getElementById('promoDiscount').value,
        valid_until: document.getElementById('promoValidUntil').value || null,
        usage_limit: document.getElementById('promoUsageLimit').value,
        is_active: document.getElementById('promoStatus').value === 'active'
    };
    
    try {
        let response;
        if (id) {
            response = await fetch(`${API_URL}/admin/promocodes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_URL}/admin/promocodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
        }
        
        if (response.ok) {
            closePromoCodeModal();
            loadPromoCodes();
            alert(id ? 'Promo code updated' : 'Promo code added');
        } else {
            const error = await response.json();
            alert(error.error || 'Operation failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving promo code');
    }
}

function editPromoCode(id) {
    const promo = allPromoCodes.find(p => p.id === id);
    if (promo) openPromoCodeModal(promo);
}

async function deletePromoCode(id) {
    if (confirm('Are you sure you want to delete this promo code?')) {
        try {
            await fetch(`${API_URL}/admin/promocodes/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadPromoCodes();
            alert('Promo code deleted');
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting promo code');
        }
    }
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    const slipModal = document.getElementById('slipDetailModal');
    if (slipModal && event.target === slipModal) {
        closeSlipDetailModal();
    }
}