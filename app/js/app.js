// API Base URL
const API_URL = window.location.origin + '/api';
let currentUser = null;

// Wait for page to fully load
document.addEventListener('DOMContentLoaded', function() {
    console.log('App loaded, checking session...');
    checkSession();
    initializeOptionCards();
    setMinDate();
});

// Check if user is already logged in
async function checkSession() {
    try {
        const response = await fetch(API_URL + '/auth/session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
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
}

// Load all dashboard data
async function loadAllData() {
    await loadPackages();
    await loadRecentBookings();
    loadServices();
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

// Load additional services
function loadServices() {
    const services = [
        { name: 'Plumber', icon: 'fa-wrench', price: '1500' },
        { name: 'Electrician', icon: 'fa-bolt', price: '1200' },
        { name: 'Carpenter', icon: 'fa-hammer', price: '1000' },
        { name: 'AC Tech', icon: 'fa-snowplow', price: '1800' },
        { name: 'Cleaner', icon: 'fa-broom', price: '2000' }
    ];
    
    const container = document.querySelector('.services-scroll');
    if (container) {
        container.innerHTML = services.map(s => `
            <div class="service-mini" onclick="alert('${s.name} service - RS${s.price}')">
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
                    packages.map(pkg => `<option value="${pkg.id}" data-labourers="${pkg.laborers}">${pkg.package_name.toUpperCase()} - RS${pkg.price} (${pkg.laborers} labourers)</option>`).join('');
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
            <option value="1" data-labourers="2">BASIC - RS5000 (2 labourers)</option>
            <option value="2" data-labourers="4">GOLD - RS10000 (4 labourers)</option>
            <option value="3" data-labourers="6">PLATINUM - RS20000 (6 labourers)</option>
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
}

// Load service checkboxes
function loadServiceCheckboxes() {
    const services = [
        { id: 1, name: 'Plumber', charge: 1500 },
        { id: 2, name: 'Electrician', charge: 1200 },
        { id: 3, name: 'Carpenter', charge: 1000 },
        { id: 4, name: 'AC Technician', charge: 1800 },
        { id: 5, name: 'Cleaner', charge: 2000 }
    ];
    
    const container = document.getElementById('additionalServicesList');
    if (container) {
        container.innerHTML = services.map(s => `
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:#f8f9fa;border-radius:8px;">
                <input type="checkbox" value="${s.id}">
                ${s.name} - RS${s.charge}
            </label>
        `).join('');
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
        vehicle_size: vehicleSize
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

// Load user bookings
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
                container.innerHTML = bookings.map(b => `
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
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.log('Error loading bookings:', error);
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
                `;
            }
        }
    } catch (error) {
        console.log('Error loading profile:', error);
    }
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

// Show auth container
function showAuthContainer() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
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

function selectPackage(packageName) {
    navigateTo('relocate');
    alert('You selected ' + packageName + ' package. Fill the form to proceed.');
}
