// API Base URL - Dynamic
const API_URL = window.location.origin + '/api';
let currentUser = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initializeOptionCards();
    setMinDate();
});

async function initializeApp() {
    try {
        const response = await fetch(`${API_URL}/auth/session`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.loggedIn) {
                currentUser = data.user;
                showAppDashboard();
                loadDashboardData();
                return;
            }
        }
        showAuthContainer();
    } catch (error) {
        console.log('Session check failed, showing auth container');
        showAuthContainer();
    }
}

function showAuthContainer() {
    const authContainer = document.getElementById('authContainer');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const appDashboard = document.getElementById('appDashboard');
    
    if (authContainer) authContainer.style.display = 'flex';
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (appDashboard) appDashboard.style.display = 'none';
}

function showLogin() {
    const authContainer = document.getElementById('authContainer');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (authContainer) authContainer.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
}

function showSignup() {
    const authContainer = document.getElementById('authContainer');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (authContainer) authContainer.style.display = 'none';
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showAppDashboard();
            loadDashboardData();
            document.getElementById('loginForm').reset();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Connection error. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Signup
async function handleSignup(event) {
    event.preventDefault();
    
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
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
            alert(`Please fill in the ${field} field`);
            return;
        }
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Account created successfully! Please login.');
            showLogin();
            document.getElementById('signupForm').reset();
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Connection error. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Show App Dashboard
function showAppDashboard() {
    const authContainer = document.getElementById('authContainer');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const appDashboard = document.getElementById('appDashboard');
    const userNameSpan = document.getElementById('appUserName');
    
    if (authContainer) authContainer.style.display = 'none';
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (appDashboard) appDashboard.style.display = 'block';
    if (userNameSpan && currentUser) userNameSpan.textContent = currentUser.firstname;
    
    setupBottomNavigation();
    
    // Pre-load packages for relocate page when user is logged in
    setTimeout(() => {
        loadPackagesForSelect();
    }, 500);
}

// Setup Bottom Navigation
function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.removeEventListener('click', handleNavClick);
        item.addEventListener('click', handleNavClick);
    });
}

function handleNavClick(event) {
    const page = event.currentTarget.dataset.page;
    navigateToPage(page);
}

function navigateToPage(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) targetPage.classList.add('active');
    
    if (pageName === 'bookings') {
        loadUserBookings();
    } else if (pageName === 'profile') {
        loadUserProfile();
    } else if (pageName === 'relocate') {
        loadRelocateFormData();
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    await loadPackages();
    await loadRecentBookings();
    loadAdditionalServices();
}

async function loadPackages() {
    try {
        const response = await fetch(`${API_URL}/packages`);
        if (!response.ok) return;
        const packages = await response.json();
        
        const packagesContainer = document.querySelector('.packages-scroll');
        if (packagesContainer && packages && packages.length > 0) {
            packagesContainer.innerHTML = packages.map(pkg => `
                <div class="package-mini ${pkg.package_name}" onclick="selectPackage('${pkg.package_name}')">
                    <h5>${pkg.package_name.charAt(0).toUpperCase() + pkg.package_name.slice(1)}</h5>
                    <p class="price">RS${pkg.price}</p>
                    <small>${pkg.laborers} labourers</small>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

async function loadRecentBookings() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}/bookings/user/${currentUser.id}`, {
            credentials: 'include'
        });
        if (!response.ok) return;
        const bookings = await response.json();
        const recentContainer = document.getElementById('recentBookings');
        const recentBookings = bookings.slice(0, 3);
        
        if (!recentContainer) return;
        
        if (recentBookings.length === 0) {
            recentContainer.innerHTML = '<p class="empty-state">No recent bookings</p>';
        } else {
            recentContainer.innerHTML = recentBookings.map(booking => `
                <div class="booking-card" onclick="navigateToPage('bookings')">
                    <div class="booking-header">
                        <span class="booking-id">#${booking.id}</span>
                        <span class="booking-status status-${booking.status}">${booking.status}</span>
                    </div>
                    <div class="booking-details">
                        <p><i class="fas fa-truck"></i> ${booking.relocation_type} relocation</p>
                        <p><i class="fas fa-calendar"></i> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function loadAdditionalServices() {
    const servicesList = [
        { name: 'Plumber', icon: 'fa-wrench', price: '1500' },
        { name: 'Electrician', icon: 'fa-bolt', price: '1200' },
        { name: 'Carpenter', icon: 'fa-hammer', price: '1000' },
        { name: 'AC Technician', icon: 'fa-snowplow', price: '1800' },
        { name: 'Cleaner', icon: 'fa-broom', price: '2000' },
        { name: 'Packer', icon: 'fa-boxes', price: '2500' }
    ];
    
    const servicesContainer = document.querySelector('.services-scroll');
    if (servicesContainer) {
        servicesContainer.innerHTML = servicesList.map(service => `
            <div class="service-mini" onclick="showServiceInfo('${service.name}')">
                <i class="fas ${service.icon}"></i>
                <span>${service.name}</span>
                <small style="display: block; font-size: 10px;">RS${service.price}</small>
            </div>
        `).join('');
    }
}

// Load Relocate Form Data
async function loadRelocateFormData() {
    console.log('Loading relocate form data...');
    await loadPackagesForSelect();
    loadVehicleSizes();
    loadAdditionalServicesForCheckbox();
}

// FIXED: Load packages for select dropdown
async function loadPackagesForSelect() {
    console.log('Fetching packages for dropdown...');
    try {
        const response = await fetch(`${API_URL}/packages`);
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            console.error('Failed to fetch packages:', response.status);
            return;
        }
        
        const packages = await response.json();
        console.log('Packages received:', packages);
        
        const select = document.getElementById('packageSelect');
        if (!select) {
            console.error('Package select element not found');
            return;
        }
        
        if (packages && packages.length > 0) {
            select.innerHTML = '<option value="">Choose a package</option>' + 
                packages.map(pkg => `<option value="${pkg.id}" data-price="${pkg.price}" data-labourers="${pkg.laborers}">${pkg.package_name.toUpperCase()} - RS${pkg.price} (${pkg.laborers} labourers)</option>`).join('');
            console.log('Packages loaded into dropdown');
        } else {
            // Fallback static packages if no packages in database
            console.log('No packages from API, using static fallback');
            select.innerHTML = `
                <option value="">Choose a package</option>
                <option value="1" data-price="5000" data-labourers="2">BASIC - RS5000 (2 labourers)</option>
                <option value="2" data-price="10000" data-labourers="4">GOLD - RS10000 (4 labourers)</option>
                <option value="3" data-price="20000" data-labourers="6">PLATINUM - RS20000 (6 labourers)</option>
            `;
        }
        
        // Add event listener for package selection
        select.removeEventListener('change', handlePackageChange);
        select.addEventListener('change', handlePackageChange);
        
    } catch (error) {
        console.error('Error loading packages for select:', error);
        // Fallback static packages
        const select = document.getElementById('packageSelect');
        if (select) {
            select.innerHTML = `
                <option value="">Choose a package</option>
                <option value="1" data-price="5000" data-labourers="2">BASIC - RS5000 (2 labourers)</option>
                <option value="2" data-price="10000" data-labourers="4">GOLD - RS10000 (4 labourers)</option>
                <option value="3" data-price="20000" data-labourers="6">PLATINUM - RS20000 (6 labourers)</option>
            `;
            select.removeEventListener('change', handlePackageChange);
            select.addEventListener('change', handlePackageChange);
        }
    }
}

function handlePackageChange(event) {
    const select = event.target;
    const selectedOption = select.options[select.selectedIndex];
    const laborCountInput = document.getElementById('laborCount');
    if (selectedOption && selectedOption.dataset && selectedOption.dataset.labourers && laborCountInput) {
        laborCountInput.value = selectedOption.dataset.labourers;
        console.log('Labour count updated to:', selectedOption.dataset.labourers);
    }
}

function loadVehicleSizes() {
    const vehicleSizes = [
        { size: 'small', name: 'Small Truck', icon: 'fa-truck', capacity: 'Up to 500kg' },
        { size: 'medium', name: 'Medium Truck', icon: 'fa-truck-moving', capacity: '500kg - 1500kg' },
        { size: 'large', name: 'Large Truck', icon: 'fa-trailer', capacity: '1500kg+' }
    ];
    
    const container = document.getElementById('vehicleSizeOptions');
    if (container) {
        container.innerHTML = vehicleSizes.map(vehicle => `
            <div class="vehicle-size-option" onclick="selectVehicleSize('${vehicle.size}', this)">
                <i class="fas ${vehicle.icon}"></i>
                <span>${vehicle.name}</span>
                <small>${vehicle.capacity}</small>
            </div>
        `).join('');
    }
}

function selectVehicleSize(size, element) {
    document.querySelectorAll('.vehicle-size-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
    const selectedInput = document.getElementById('selectedVehicleSize');
    if (selectedInput) selectedInput.value = size;
}

function loadAdditionalServicesForCheckbox() {
    const services = [
        { id: 1, name: 'Plumber', charge: 1500 },
        { id: 2, name: 'Electrician', charge: 1200 },
        { id: 3, name: 'Carpenter', charge: 1000 },
        { id: 4, name: 'AC Technician', charge: 1800 },
        { id: 5, name: 'Cleaner', charge: 2000 },
        { id: 6, name: 'Packer', charge: 2500 }
    ];
    
    const container = document.getElementById('additionalServicesList');
    if (container) {
        container.innerHTML = services.map(service => `
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 8px; cursor: pointer;">
                <input type="checkbox" value="${service.id}" data-charge="${service.charge}">
                ${service.name} - RS${service.charge}
            </label>
        `).join('');
    }
}

// Handle Relocation Booking
const relocationForm = document.getElementById('relocationForm');
if (relocationForm) {
    relocationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const relocationType = document.querySelector('input[name="relocationType"]:checked')?.value;
        if (!relocationType) {
            alert('Please select relocation type');
            return;
        }
        
        const selectedVehicleSize = document.getElementById('selectedVehicleSize')?.value;
        if (!selectedVehicleSize) {
            alert('Please select a vehicle size (Small, Medium, or Large Truck)');
            return;
        }
        
        const bookingData = {
            user_id: currentUser.id,
            relocation_type: relocationType,
            package_id: document.getElementById('packageSelect')?.value || null,
            labor_count: parseInt(document.getElementById('laborCount')?.value || 2),
            pickup_address: document.getElementById('pickupAddress')?.value,
            dropoff_address: document.getElementById('dropoffAddress')?.value,
            booking_date: document.getElementById('bookingDate')?.value,
            booking_time: document.getElementById('bookingTime')?.value,
            vehicle_size: selectedVehicleSize
        };
        
        if (!bookingData.pickup_address || !bookingData.dropoff_address || !bookingData.booking_date || !bookingData.booking_time) {
            alert('Please fill in all required fields');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Booking...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${API_URL}/bookings/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(bookingData)
            });
            
            const data = await response.json();
            if (response.ok) {
                alert('Booking created successfully!');
                relocationForm.reset();
                const selectedInput = document.getElementById('selectedVehicleSize');
                if (selectedInput) selectedInput.value = '';
                document.querySelectorAll('.vehicle-size-option').forEach(opt => opt.classList.remove('selected'));
                document.querySelectorAll('input[name="relocationType"]').forEach(radio => radio.checked = false);
                document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
                navigateToPage('bookings');
                loadUserBookings();
            } else {
                alert(data.error || 'Booking failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Load User Bookings
async function loadUserBookings() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}/bookings/user/${currentUser.id}`, {
            credentials: 'include'
        });
        if (!response.ok) return;
        const bookings = await response.json();
        const container = document.getElementById('bookingsList');
        
        if (!container) return;
        
        if (bookings.length === 0) {
            container.innerHTML = '<p class="empty-state">No bookings found</p>';
        } else {
            container.innerHTML = bookings.map(booking => `
                <div class="booking-card">
                    <div class="booking-header">
                        <span class="booking-id">Booking #${booking.id}</span>
                        <span class="booking-status status-${booking.status}">${booking.status.toUpperCase()}</span>
                    </div>
                    <div class="booking-details">
                        <p><i class="fas fa-${booking.relocation_type === 'home' ? 'home' : booking.relocation_type === 'office' ? 'building' : 'city'}"></i> ${booking.relocation_type.toUpperCase()} Relocation</p>
                        <p><i class="fas fa-truck"></i> Vehicle: ${booking.vehicle_size ? booking.vehicle_size.toUpperCase() + ' Truck' : 'Not specified'}</p>
                        <p><i class="fas fa-map-marker-alt"></i> From: ${booking.pickup_address?.substring(0, 50) || 'N/A'}...</p>
                        <p><i class="fas fa-calendar"></i> Date: ${new Date(booking.booking_date).toLocaleDateString()} at ${booking.booking_time}</p>
                        <p><i class="fas fa-users"></i> Labourers: ${booking.labor_count}</p>
                        ${booking.package_name ? `<p><i class="fas fa-gift"></i> Package: ${booking.package_name.toUpperCase()}</p>` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Load User Profile
async function loadUserProfile() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}/auth/session`, { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        if (data.loggedIn) {
            const profileContainer = document.getElementById('profileInfo');
            if (profileContainer) {
                profileContainer.innerHTML = `
                    <div class="profile-field"><div class="label">Name</div><div class="value">${data.user.firstname} ${data.user.lastname}</div></div>
                    <div class="profile-field"><div class="label">Email</div><div class="value">${data.user.email}</div></div>
                    <div class="profile-field"><div class="label">Phone</div><div class="value">${data.user.contact_number || 'N/A'}</div></div>
                    <div class="profile-field"><div class="label">Address</div><div class="value">${data.user.address || 'N/A'}</div></div>
                    <div class="profile-field"><div class="label">City</div><div class="value">${data.user.city || 'N/A'}</div></div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Logout
async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
        currentUser = null;
        showAuthContainer();
    } catch (error) {
        console.error('Error:', error);
    }
}

// Helper Functions
function setMinDate() {
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
}

function initializeOptionCards() {
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            }
        });
    });
}

function callSupport() {
    window.location.href = 'tel:+923091422225';
}

function showServiceInfo(service) {
    alert(`${service} service is available. Starting from RS1000. Book now through our relocation form!`);
}

function selectPackage(packageName) {
    navigateToPage('relocate');
    alert(`You selected ${packageName} package. Please fill the relocation form to proceed.`);
}

// Also load packages when relocate page is shown
const relocatePage = document.getElementById('relocatePage');
if (relocatePage) {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class' && relocatePage.classList.contains('active')) {
                console.log('Relocate page activated, loading packages...');
                loadPackagesForSelect();
            }
        });
    });
    observer.observe(relocatePage, { attributes: true });
}
