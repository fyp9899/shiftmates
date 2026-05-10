// API Base URL
const API_URL = window.location.origin + '/api';
let currentUser = null;
let currentBookingTotal = 0;
let currentPromoDiscount = 0;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log('App loaded');
    checkSession();
    initializeOptionCards();
    setMinDate();
});

// Check if user is already logged in
async function checkSession() {
    try {
        const response = await fetch(API_URL + '/auth/session', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.loggedIn) {
                currentUser = data.user;
                showDashboard();
                loadAllData();
                return;
            }
        }
        showAuthScreen();
    } catch (error) {
        console.log('Session check error:', error);
        showAuthScreen();
    }
}

// Show login/signup screen
function showAuthScreen() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('appDashboard').style.display = 'none';
}

// Show auth container from forms
function showAuthContainer() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
}

// Show main dashboard
function showDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('appDashboard').style.display = 'block';
    document.getElementById('appUserName').innerText = currentUser.firstname;
    
    // Setup navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => navigateTo(btn.dataset.page);
    });
}

// Navigate between pages
function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active');
    
    if (page === 'relocate') loadRelocateData();
    if (page === 'bookings') loadBookings();
    if (page === 'profile') loadProfile();
    if (page === 'inventory') loadInventory();
    if (page === 'loyalty') loadLoyaltyPoints();
}

// Load all dashboard data
async function loadAllData() {
    await loadPackages();
    await loadRecentBookings();
    loadHomeServices();
    await loadLoyaltyPoints();
}

// Load packages for home page
async function loadPackages() {
    try {
        const response = await fetch(API_URL + '/packages');
        if (response.ok) {
            const packages = await response.json();
            const container = document.querySelector('.packages-scroll');
            if (container && packages.length) {
                container.innerHTML = packages.map(pkg => `
                    <div class="package-mini ${pkg.package_name}" onclick="selectPackage('${pkg.package_name}')">
                        <h5>${pkg.package_name.toUpperCase()}</h5>
                        <p class="price">RS${pkg.price}</p>
                        <small>${pkg.laborers} labourers</small>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.log('Error loading packages:', error);
    }
}

// Load recent bookings for home page
async function loadRecentBookings() {
    if (!currentUser) return;
    try {
        const response = await fetch(API_URL + '/bookings/user/' + currentUser.id, {
            credentials: 'include'
        });
        if (response.ok) {
            const bookings = await response.json();
            const container = document.getElementById('recentBookings');
            if (container) {
                const recent = bookings.slice(0, 3);
                if (recent.length === 0) {
                    container.innerHTML = '<p class="empty-state">No recent bookings</p>';
                } else {
                    container.innerHTML = recent.map(b => `
                        <div class="booking-card" onclick="navigateTo('bookings')">
                            <div class="booking-header">
                                <span class="booking-id">#${b.id}</span>
                                <span class="booking-status status-${b.status}">${b.status}</span>
                            </div>
                            <div class="booking-details">
                                <p><i class="fas fa-truck"></i> ${b.relocation_type} relocation</p>
                                <p><i class="fas fa-calendar"></i> ${new Date(b.booking_date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.log('Error loading recent bookings:', error);
    }
}

// Load home services
function loadHomeServices() {
    const services = [
        { name: 'Plumber', icon: 'fa-wrench', price: '1500' },
        { name: 'Electrician', icon: 'fa-bolt', price: '1200' },
        { name: 'Carpenter', icon: 'fa-hammer', price: '1000' },
        { name: 'AC Tech', icon: 'fa-snowplow', price: '1800' },
        { name: 'Cleaner', icon: 'fa-broom', price: '2000' }
    ];
    
    const container = document.getElementById('homeServicesList');
    if (container) {
        container.innerHTML = services.map(s => `
            <div class="service-mini" onclick="showServiceInfo('${s.name}')">
                <i class="fas ${s.icon}"></i>
                <span>${s.name}</span>
                <small style="display:block;font-size:10px;">RS${s.price}</small>
            </div>
        `).join('');
    }
}

// Load relocate form data
async function loadRelocateData() {
    await loadPackageOptions();
    loadVehicleOptions();
    loadServiceCheckboxes();
    const breakdownDiv = document.getElementById('priceBreakdown');
    if (breakdownDiv) breakdownDiv.style.display = 'none';
}

// Load package options for dropdown
async function loadPackageOptions() {
    try {
        const response = await fetch(API_URL + '/packages');
        const select = document.getElementById('packageSelect');
        
        if (response.ok) {
            const packages = await response.json();
            if (packages.length) {
                select.innerHTML = '<option value="">Choose a package</option>' + 
                    packages.map(pkg => `<option value="${pkg.id}" data-price="${pkg.price}" data-labourers="${pkg.laborers}">${pkg.package_name.toUpperCase()} - RS${pkg.price} (${pkg.laborers} labourers)</option>`).join('');
            } else {
                setDefaultPackageOptions(select);
            }
        } else {
            setDefaultPackageOptions(select);
        }
        
        select.onchange = function() {
            const opt = this.options[this.selectedIndex];
            if (opt && opt.dataset.labourers) {
                document.getElementById('laborCount').value = opt.dataset.labourers;
            }
            calculatePrice();
        };
    } catch (error) {
        console.log('Error loading packages:', error);
        setDefaultPackageOptions(document.getElementById('packageSelect'));
    }
}

// Default package options
function setDefaultPackageOptions(select) {
    if (select) {
        select.innerHTML = `
            <option value="">Choose a package</option>
            <option value="1" data-price="5000" data-labourers="2">BASIC - RS5000 (2 labourers)</option>
            <option value="2" data-price="10000" data-labourers="4">GOLD - RS10000 (4 labourers)</option>
            <option value="3" data-price="20000" data-labourers="6">PLATINUM - RS20000 (6 labourers)</option>
        `;
    }
}

// Load vehicle size options
function loadVehicleOptions() {
    const vehicles = [
        { size: 'small', name: 'Small Truck', icon: 'fa-truck', capacity: 'Up to 500kg' },
        { size: 'medium', name: 'Medium Truck', icon: 'fa-truck-moving', capacity: '500-1500kg' },
        { size: 'large', name: 'Large Truck', icon: 'fa-trailer', capacity: '1500kg+' }
    ];
    
    const container = document.getElementById('vehicleSizeOptions');
    if (container) {
        container.innerHTML = vehicles.map(v => `
            <div class="vehicle-size-option" onclick="selectVehicle('${v.size}', this)">
                <i class="fas ${v.icon}"></i>
                <span>${v.name}</span>
                <small>${v.capacity}</small>
            </div>
        `).join('');
    }
}

// Select vehicle size
function selectVehicle(size, element) {
    document.querySelectorAll('.vehicle-size-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('selectedVehicleSize').value = size;
    calculatePrice();
}

// Load service checkboxes
function loadServiceCheckboxes() {
    const services = [
        { id: 1, name: 'Plumber', charge: 1500, icon: 'fa-wrench' },
        { id: 2, name: 'Electrician', charge: 1200, icon: 'fa-bolt' },
        { id: 3, name: 'Carpenter', charge: 1000, icon: 'fa-hammer' },
        { id: 4, name: 'AC Technician', charge: 1800, icon: 'fa-snowplow' },
        { id: 5, name: 'Cleaner', charge: 2000, icon: 'fa-broom' },
        { id: 6, name: 'Packer', charge: 2500, icon: 'fa-boxes' }
    ];
    
    const container = document.getElementById('additionalServicesList');
    if (container) {
        container.innerHTML = services.map(service => `
            <label class="service-card">
                <input type="checkbox" value="${service.id}" data-charge="${service.charge}" onchange="calculatePrice()">
                <div class="service-icon">
                    <i class="fas ${service.icon}"></i>
                </div>
                <div class="service-info">
                    <span class="service-name">${service.name}</span>
                    <span class="service-price">RS${service.charge}</span>
                </div>
            </label>
        `).join('');
    }
}

// Calculate price
function calculatePrice() {
    const packageSelect = document.getElementById('packageSelect');
    const selectedOption = packageSelect.options[packageSelect.selectedIndex];
    const selectedServices = document.querySelectorAll('#additionalServicesList input:checked');
    
    const breakdownDiv = document.getElementById('priceBreakdown');
    const breakdownContent = document.getElementById('breakdownContent');
    const totalDisplay = document.getElementById('totalPriceDisplay');
    
    const hasPackage = selectedOption && selectedOption.value !== '';
    const hasServices = selectedServices.length > 0;
    
    if (!hasPackage && !hasServices) {
        if (breakdownDiv) breakdownDiv.style.display = 'none';
        currentBookingTotal = 0;
        return;
    }
    
    let total = 0;
    let packagePrice = 0;
    
    if (hasPackage) {
        if (selectedOption.dataset.price) {
            packagePrice = parseInt(selectedOption.dataset.price);
        } else {
            const packageText = selectedOption.text.toLowerCase();
            if (packageText.includes('basic')) packagePrice = 5000;
            else if (packageText.includes('gold')) packagePrice = 10000;
            else if (packageText.includes('platinum')) packagePrice = 20000;
        }
        total = packagePrice;
    }
    
    let servicesTotal = 0;
    selectedServices.forEach(service => {
        servicesTotal += parseInt(service.dataset.charge);
    });
    total += servicesTotal;
    currentBookingTotal = total;
    
    let finalTotal = total;
    if (currentPromoDiscount > 0) {
        finalTotal = total - currentPromoDiscount;
    }
    
    if (breakdownDiv) {
        breakdownDiv.style.display = 'block';
        let breakdownHtml = '';
        if (hasPackage) {
            breakdownHtml += `<div class="breakdown-row">Base Package: RS${packagePrice}</div>`;
        }
        if (servicesTotal > 0) {
            breakdownHtml += `<div class="breakdown-row">Additional Services: RS${servicesTotal}</div>`;
        }
        if (currentPromoDiscount > 0) {
            breakdownHtml += `<div class="breakdown-row discount">Promo Discount: -RS${currentPromoDiscount}</div>`;
        }
        breakdownContent.innerHTML = breakdownHtml;
        totalDisplay.innerHTML = `Total: RS${finalTotal}`;
    }
}

// Apply promo code
function applyPromoCodeToBooking() {
    const code = document.getElementById('promoCodeInput').value;
    if (!code) {
        alert('Please enter a promo code');
        return;
    }
    
    if (code.toUpperCase() === 'SAVE10') {
        currentPromoDiscount = Math.floor(currentBookingTotal * 0.1);
        document.getElementById('promoDiscountDisplay').innerHTML = `<span class="success">Promo applied! You saved RS${currentPromoDiscount}</span>`;
        calculatePrice();
    } else if (code.toUpperCase() === 'SAVE20') {
        currentPromoDiscount = Math.floor(currentBookingTotal * 0.2);
        document.getElementById('promoDiscountDisplay').innerHTML = `<span class="success">Promo applied! You saved RS${currentPromoDiscount}</span>`;
        calculatePrice();
    } else {
        alert('Invalid promo code');
        document.getElementById('promoDiscountDisplay').innerHTML = `<span class="error">Invalid promo code</span>`;
    }
}

// Handle booking submission
document.getElementById('relocationForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const relocationType = document.querySelector('input[name="relocationType"]:checked')?.value;
    if (!relocationType) {
        alert('Please select relocation type');
        return;
    }
    
    const vehicleSize = document.getElementById('selectedVehicleSize')?.value;
    if (!vehicleSize) {
        alert('Please select vehicle size');
        return;
    }
    
    const booking = {
        user_id: currentUser.id,
        relocation_type: relocationType,
        package_id: document.getElementById('packageSelect').value || null,
        labor_count: parseInt(document.getElementById('laborCount').value),
        pickup_address: document.getElementById('pickupAddress').value,
        dropoff_address: document.getElementById('dropoffAddress').value,
        booking_date: document.getElementById('bookingDate').value,
        booking_time: document.getElementById('bookingTime').value,
        vehicle_size: vehicleSize,
        total_price: currentBookingTotal - currentPromoDiscount
    };
    
    if (!booking.pickup_address || !booking.dropoff_address || !booking.booking_date || !booking.booking_time) {
        alert('Please fill all required fields');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Booking...';
    btn.disabled = true;
    
    try {
        const response = await fetch(API_URL + '/bookings/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(booking)
        });
        
        if (response.ok) {
            alert('Booking created successfully!');
            e.target.reset();
            document.getElementById('selectedVehicleSize').value = '';
            document.querySelectorAll('.vehicle-size-option').forEach(opt => opt.classList.remove('selected'));
            document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
            document.getElementById('priceBreakdown').style.display = 'none';
            document.getElementById('promoDiscountDisplay').innerHTML = '';
            currentPromoDiscount = 0;
            navigateTo('bookings');
            loadBookings();
        } else {
            const data = await response.json();
            alert(data.error || 'Booking failed');
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert('Connection error. Please try again.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// Load user bookings with confirmation slip
async function loadBookings() {
    if (!currentUser) return;
    try {
        const response = await fetch(API_URL + '/bookings/user/' + currentUser.id, {
            credentials: 'include'
        });
        if (response.ok) {
            const bookings = await response.json();
            const container = document.getElementById('bookingsList');
            if (bookings.length === 0) {
                container.innerHTML = '<p class="empty-state">No bookings found</p>';
            } else {
                container.innerHTML = bookings.map(b => {
                    const hasSlip = b.confirmation_slip && b.status === 'confirmed';
                    
                    return `
                    <div class="booking-card">
                        <div class="booking-header">
                            <span class="booking-id">Booking #${b.id}</span>
                            <span class="booking-status status-${b.status}">${b.status.toUpperCase()}</span>
                        </div>
                        <div class="booking-details">
                            <p><i class="fas fa-truck"></i> ${b.relocation_type.toUpperCase()} Relocation</p>
                            <p><i class="fas fa-map-marker-alt"></i> From: ${b.pickup_address?.substring(0, 50)}...</p>
                            <p><i class="fas fa-calendar"></i> ${new Date(b.booking_date).toLocaleDateString()} at ${b.booking_time}</p>
                            <p><i class="fas fa-users"></i> Labourers: ${b.labor_count}</p>
                            ${b.total_price ? `<p><i class="fas fa-rupee-sign"></i> Total: RS${b.total_price}</p>` : ''}
                            
                            ${hasSlip ? `
                            <div class="confirmation-slip" style="margin-top: 12px; padding: 12px; background: #e8f5e9; border-radius: 12px; border-left: 4px solid #4caf50;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <strong style="color: #2e7d32;"><i class="fas fa-check-circle"></i> Booking Confirmed!</strong>
                                    <button class="btn-view-slip" onclick="viewConfirmationSlip(${b.id})" style="background: #4caf50; color: white; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                        <i class="fas fa-file-alt"></i> View Slip
                                    </button>
                                </div>
                                <div style="font-size: 12px; color: #555;">
                                    <p><i class="fas fa-truck"></i> Truck: ${b.confirmation_slip.truck_name || 'Assigned'}</p>
                                    <p><i class="fas fa-user"></i> Driver: ${b.confirmation_slip.driver_name || 'Assigned'}</p>
                                    <p><i class="fas fa-user-tie"></i> Supervisor: ${b.confirmation_slip.supervisor_name || 'Assigned'}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="booking-actions">
                                <button class="btn-track" onclick="trackBooking(${b.id})"><i class="fas fa-map-marker-alt"></i> Track</button>
                                <button class="btn-review" onclick="openReviewModal(${b.id})"><i class="fas fa-star"></i> Review</button>
                                ${b.status === 'pending' ? `<button class="btn-cancel" onclick="cancelBooking(${b.id})"><i class="fas fa-times"></i> Cancel</button>` : ''}
                                <button class="btn-media" onclick="uploadMedia(${b.id})" style="background: #28a745; color: white; padding: 0.4rem 0.8rem; border: none; border-radius: 8px; cursor: pointer;">
                                    <i class="fas fa-camera"></i> Add Media
                                </button>
                            </div>
                        </div>
                    </div>
                `}).join('');
            }
        }
    } catch (error) {
        console.log('Error loading bookings:', error);
    }
}

// View confirmation slip modal
async function viewConfirmationSlip(bookingId) {
    try {
        const response = await fetch(API_URL + '/bookings/' + bookingId + '/slip', {
            credentials: 'include'
        });
        const slip = await response.json();
        
        if (slip) {
            const modalHtml = `
                <div id="slipModal" class="modal" style="display: block;">
                    <div class="modal-content" style="max-width: 500px; max-height: 85vh; overflow-y: auto;">
                        <span class="close" onclick="closeSlipModal()">&times;</span>
                        <div class="confirmation-slip-detail">
                            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #4caf50; padding-bottom: 10px;">
                                <h2 style="color: #2e7d32;">ShiftMates</h2>
                                <p style="color: #666;">Booking Confirmation Slip</p>
                                <p><strong>Slip #: ${slip.slip_number}</strong></p>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <h4 style="color: #333; margin-bottom: 10px;">Customer Information</h4>
                                <p><i class="fas fa-user"></i> <strong>Name:</strong> ${slip.customer_name}</p>
                                <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${slip.customer_email || 'N/A'}</p>
                                <p><i class="fas fa-phone"></i> <strong>Phone:</strong> ${slip.customer_phone || 'N/A'}</p>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <h4 style="color: #333; margin-bottom: 10px;">Moving Details</h4>
                                <p><i class="fas fa-truck"></i> <strong>Relocation Type:</strong> ${slip.relocation_type?.toUpperCase()}</p>
                                <p><i class="fas fa-box"></i> <strong>Package:</strong> ${slip.package_name}</p>
                                <p><i class="fas fa-users"></i> <strong>Labourers:</strong> ${slip.laborers_count}</p>
                                <p><i class="fas fa-calendar"></i> <strong>Date:</strong> ${new Date(slip.booking_date).toLocaleDateString()}</p>
                                <p><i class="fas fa-clock"></i> <strong>Time:</strong> ${slip.booking_time}</p>
                                <p><i class="fas fa-calendar-week"></i> <strong>Day:</strong> ${slip.booking_day}</p>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <h4 style="color: #333; margin-bottom: 10px;">Addresses</h4>
                                <p><i class="fas fa-map-marker-alt"></i> <strong>Pickup:</strong> ${slip.pickup_address}</p>
                                <p><i class="fas fa-flag-checkered"></i> <strong>Dropoff:</strong> ${slip.dropoff_address}</p>
                            </div>
                            
                            <div style="margin-bottom: 15px; background: #f5f5f5; padding: 10px; border-radius: 8px;">
                                <h4 style="color: #333; margin-bottom: 10px;">Assigned Team</h4>
                                <p><i class="fas fa-truck"></i> <strong>Truck:</strong> ${slip.truck_name} (${slip.truck_registration})</p>
                                <p><i class="fas fa-user"></i> <strong>Driver:</strong> ${slip.driver_name} - ${slip.driver_contact}</p>
                                <p><i class="fas fa-user-tie"></i> <strong>Supervisor:</strong> ${slip.supervisor_name} - ${slip.supervisor_contact}</p>
                            </div>
                            
                            <div style="margin-bottom: 15px; text-align: center; border-top: 1px solid #ddd; padding-top: 15px;">
                                <h3 style="color: #2e7d32;">Total Amount: RS${slip.total_price}</h3>
                                <p style="font-size: 12px; color: #888;">Thank you for choosing ShiftMates!</p>
                            </div>
                            
                            <button onclick="window.print()" class="btn-submit" style="background: #4caf50; margin-top: 10px;">
                                <i class="fas fa-print"></i> Print Slip
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const existingModal = document.getElementById('slipModal');
            if (existingModal) existingModal.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } else {
            alert('Confirmation slip not available yet. Please wait for booking confirmation.');
        }
    } catch (error) {
        console.error('Error fetching slip:', error);
        alert('Error loading confirmation slip');
    }
}

function closeSlipModal() {
    const modal = document.getElementById('slipModal');
    if (modal) modal.remove();
}

// Load user bookings function for refresh button
function loadUserBookings() {
    loadBookings();
}

// Upload media for booking
function uploadMedia(bookingId) {
    const modalHtml = `
        <div id="mediaUploadModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 400px;">
                <span class="close" onclick="closeMediaUploadModal()">&times;</span>
                <h3>Upload Media for Booking #${bookingId}</h3>
                <div class="form-group">
                    <label>Item Name</label>
                    <input type="text" id="mediaItemName" placeholder="e.g., Sofa, TV, Box" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                </div>
                <div class="form-group">
                    <label>Select Media (Photo or Video)</label>
                    <input type="file" id="mediaFile" accept="image/*,video/*" style="width: 100%; padding: 10px;">
                </div>
                <button class="btn-submit" onclick="uploadMediaFile(${bookingId})" style="margin-top: 10px;">
                    <i class="fas fa-upload"></i> Upload
                </button>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('mediaUploadModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeMediaUploadModal() {
    const modal = document.getElementById('mediaUploadModal');
    if (modal) modal.remove();
}

async function uploadMediaFile(bookingId) {
    const fileInput = document.getElementById('mediaFile');
    const itemName = document.getElementById('mediaItemName').value || 'Uploaded Item';
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file to upload');
        return;
    }
    
    const uploadBtn = document.querySelector('#mediaUploadModal .btn-submit');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;
    
    const formData = new FormData();
    formData.append('booking_id', bookingId);
    formData.append('media', file);
    formData.append('item_name', itemName);
    
    try {
        const response = await fetch(API_URL + '/bookings/media/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            alert('Media uploaded successfully!');
            closeMediaUploadModal();
        } else {
            alert(result.error || 'Upload failed. Please try again.');
        }
    } catch (error) {
        console.error('Error uploading media:', error);
        alert('Upload failed: ' + error.message);
    } finally {
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
    }
}

// Track booking
function trackBooking(bookingId) {
    alert(`Tracking feature for booking #${bookingId} will be available soon.`);
}

// Open review modal
function openReviewModal(bookingId) {
    const rating = prompt('Rate your experience (1-5 stars):', '5');
    if (rating && rating >= 1 && rating <= 5) {
        const comment = prompt('Please share your experience:');
        if (comment) {
            submitReview(bookingId, parseInt(rating), comment);
        }
    } else if (rating) {
        alert('Please enter a rating between 1 and 5');
    }
}

// Submit review
async function submitReview(bookingId, rating, comment) {
    try {
        const response = await fetch(API_URL + '/reviews/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                booking_id: bookingId,
                user_id: currentUser.id,
                rating: rating,
                comment: comment
            })
        });
        
        if (response.ok) {
            alert('Thank you for your review!');
        } else {
            alert('Error submitting review');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        try {
            const response = await fetch(API_URL + '/bookings/' + bookingId + '/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: 'Cancelled by user' })
            });
            
            if (response.ok) {
                alert('Booking cancelled successfully');
                loadBookings();
            } else {
                alert('Error cancelling booking');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// Load inventory items
async function loadInventory() {
    if (!currentUser) return;
    try {
        const response = await fetch(API_URL + '/inventory/user/' + currentUser.id, {
            credentials: 'include'
        });
        if (response.ok) {
            const items = await response.json();
            const container = document.getElementById('itemsContainer');
            if (!items || items.length === 0) {
                container.innerHTML = '<p class="empty-state">No items added yet</p>';
            } else {
                container.innerHTML = items.map(item => `
                    <div class="inventory-item ${item.is_fragile ? 'fragile' : ''}">
                        <div class="item-info">
                            <strong>${item.room_name || 'General'}</strong> - ${item.item_name}
                            ${item.is_fragile ? '<span class="fragile-badge">Fragile</span>' : ''}
                            <div class="item-status">Status: ${item.status}</div>
                        </div>
                        <div class="item-actions">
                            <button onclick="updateItemStatus(${item.id}, 'packed')">Pack</button>
                            <button onclick="updateItemStatus(${item.id}, 'loaded')">Load</button>
                            <button onclick="deleteInventoryItem(${item.id})">Delete</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.log('Error loading inventory:', error);
    }
}

// Add inventory item
async function addInventoryItem() {
    const itemName = document.getElementById('itemName')?.value;
    if (!itemName) {
        alert('Please enter item name');
        return;
    }
    
    const data = {
        user_id: currentUser.id,
        room_name: document.getElementById('roomName')?.value || 'General',
        item_name: itemName,
        is_fragile: document.getElementById('isFragile')?.checked || false,
        special_handling: document.getElementById('specialHandling')?.value || '',
        quantity: 1
    };
    
    try {
        const response = await fetch(API_URL + '/inventory/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Item added to inventory!');
            document.getElementById('itemName').value = '';
            document.getElementById('isFragile').checked = false;
            document.getElementById('specialHandling').value = '';
            loadInventory();
        } else {
            alert('Error adding item');
        }
    } catch (error) {
        console.error('Error adding item:', error);
        alert('Error adding item');
    }
}

// Update item status
async function updateItemStatus(itemId, status) {
    try {
        await fetch(API_URL + '/inventory/item/' + itemId + '/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status })
        });
        loadInventory();
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// Delete inventory item
async function deleteInventoryItem(itemId) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await fetch(API_URL + '/inventory/item/' + itemId, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadInventory();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    }
}

// Load user profile
async function loadProfile() {
    if (!currentUser) return;
    try {
        const response = await fetch(API_URL + '/auth/session', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            if (data.loggedIn) {
                document.getElementById('profileInfo').innerHTML = `
                    <div class="profile-field"><div class="label">Name</div><div class="value">${data.user.firstname} ${data.user.lastname}</div></div>
                    <div class="profile-field"><div class="label">Email</div><div class="value">${data.user.email}</div></div>
                    <div class="profile-field"><div class="label">Phone</div><div class="value">${data.user.contact_number || 'N/A'}</div></div>
                    <div class="profile-field"><div class="label">Address</div><div class="value">${data.user.address || 'N/A'}</div></div>
                    <div class="profile-field"><div class="label">City</div><div class="value">${data.user.city || 'N/A'}</div></div>
                    <div class="profile-field"><div class="label">Member Since</div><div class="value">${new Date(data.user.created_at).toLocaleDateString()}</div></div>
                `;
            }
        }
    } catch (error) {
        console.log('Error loading profile:', error);
    }
}

// Load loyalty points
async function loadLoyaltyPoints() {
    if (!currentUser) return;
    try {
        const response = await fetch(API_URL + '/loyalty/user/' + currentUser.id, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('userPointsDisplay').textContent = data.points || 0;
            document.getElementById('loyaltyPoints').textContent = data.points || 0;
            document.getElementById('userTierDisplay').textContent = data.tier || 'Bronze';
            document.getElementById('loyaltyTier').textContent = data.tier || 'Bronze';
            
            let pointsNeeded = 10000 - (data.points || 0);
            let nextTier = 'Silver';
            if (data.points >= 50000) {
                pointsNeeded = 0;
                nextTier = 'Platinum (Max)';
            } else if (data.points >= 25000) {
                pointsNeeded = 50000 - data.points;
                nextTier = 'Platinum';
            } else if (data.points >= 10000) {
                pointsNeeded = 25000 - data.points;
                nextTier = 'Gold';
            }
            const progress = Math.min(((data.points || 0) / 10000) * 100, 100);
            document.getElementById('tierProgress').style.width = `${progress}%`;
            document.getElementById('nextTierInfo').innerHTML = pointsNeeded > 0 ? `Earn ${pointsNeeded} more points to reach ${nextTier}` : 'You have reached the highest tier!';
            
            loadReferralCode();
        }
    } catch (error) {
        console.log('Error loading loyalty:', error);
    }
}

// Load referral code
async function loadReferralCode() {
    try {
        const response = await fetch(API_URL + '/loyalty/referral/' + currentUser.id, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('referralCode').value = data.referralCode;
        }
    } catch (error) {
        console.log('Error loading referral:', error);
    }
}

// Copy referral code
function copyReferralCode() {
    const code = document.getElementById('referralCode');
    code.select();
    document.execCommand('copy');
    alert('Referral code copied!');
}

// Share referral
function shareReferral() {
    const code = document.getElementById('referralCode').value;
    if (navigator.share) {
        navigator.share({
            title: 'ShiftMates Referral',
            text: `Use my referral code ${code} to get RS500 off your first move with ShiftMates!`,
            url: 'https://shiftmates.com'
        });
    } else {
        alert(`Share this code: ${code}`);
    }
}

// Price Calculator
function showPriceCalculator() {
    document.getElementById('priceCalculatorModal').style.display = 'block';
}

function closePriceCalculator() {
    document.getElementById('priceCalculatorModal').style.display = 'none';
}

function calculateAndShowPrice() {
    const distance = parseInt(document.getElementById('calcDistance')?.value || 10);
    const rooms = parseInt(document.getElementById('calcRooms')?.value || 2);
    const packageType = document.getElementById('calcPackage')?.value || 'basic';
    
    let basePrice = packageType === 'basic' ? 5000 : (packageType === 'gold' ? 10000 : 20000);
    let distanceCharge = distance * 50;
    let roomsCharge = rooms * 500;
    let total = basePrice + distanceCharge + roomsCharge;
    
    document.getElementById('priceResult').innerHTML = `
        <div class="price-result-box">
            <h4>Estimated Total: RS${total}</h4>
            <small>Base: RS${basePrice} | Distance: RS${distanceCharge} | Rooms: RS${roomsCharge}</small>
        </div>
    `;
}

// Login function
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const btn = event.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Logging in...';
    btn.disabled = true;
    
    try {
        const response = await fetch(API_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showDashboard();
            loadAllData();
            event.target.reset();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Connection error. Please try again.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Signup function
async function handleSignup(event) {
    event.preventDefault();
    
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    if (password !== confirm) {
        alert('Passwords do not match!');
        return;
    }
    
    const userData = {
        firstname: document.getElementById('firstName').value,
        lastname: document.getElementById('lastName').value,
        email: document.getElementById('signupEmail').value,
        contact_number: document.getElementById('contactNumber').value,
        address: document.getElementById('address').value,
        postal_code: document.getElementById('postalCode').value,
        password: password,
        cnic: document.getElementById('cnic').value,
        area: document.getElementById('area').value,
        city: document.getElementById('city').value
    };
    
    const required = ['firstname', 'lastname', 'email', 'contact_number', 'address', 'password', 'cnic', 'city'];
    for (let field of required) {
        if (!userData[field]) {
            alert(`Please fill in ${field}`);
            return;
        }
    }
    
    const btn = event.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Creating account...';
    btn.disabled = true;
    
    try {
        const response = await fetch(API_URL + '/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Account created! Please login.');
            showAuthScreen();
            showLogin();
            event.target.reset();
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        alert('Connection error. Please try again.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Chat Support
function openChatSupport() {
    document.getElementById('chatModal').style.display = 'block';
}

function closeChatModal() {
    document.getElementById('chatModal').style.display = 'none';
}

function sendSupportMessage() {
    const message = document.getElementById('chatMessageInput')?.value;
    if (!message) return;
    
    addChatMessage(message, 'user');
    document.getElementById('chatMessageInput').value = '';
    
    setTimeout(() => {
        addChatMessage('Thank you for your message. Our support team will get back to you shortly.', 'support');
    }, 1000);
}

function addChatMessage(message, type) {
    const container = document.getElementById('chatMessagesList');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Show login form
function showLogin() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

// Show signup form
function showSignup() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

// Logout
async function logout() {
    try {
        await fetch(API_URL + '/auth/logout', { method: 'POST', credentials: 'include' });
        currentUser = null;
        showAuthScreen();
    } catch (error) {
        console.log('Logout error:', error);
    }
}

// Helper functions
function setMinDate() {
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
    }
}

function initializeOptionCards() {
    document.querySelectorAll('.option-card').forEach(card => {
        card.onclick = function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            }
        };
    });
}

function callSupport() {
    window.location.href = 'tel:+923091422225';
}

function showServiceInfo(service) {
    alert(`${service} service is available. Starting from RS1000. Book now through our relocation form!`);
}

function selectPackage(packageName) {
    navigateTo('relocate');
    alert('You selected ' + packageName + ' package. Fill the form to proceed.');
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
    const mediaModal = document.getElementById('mediaUploadModal');
    if (mediaModal && event.target === mediaModal) {
        closeMediaUploadModal();
    }
    const slipModal = document.getElementById('slipModal');
    if (slipModal && event.target === slipModal) {
        closeSlipModal();
    }
}