// API URL - Now all on same port 3000
const API_URL = 'http://localhost:3000/api';

// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('CMS Loaded');
    checkAdminSession();
});

// Check admin session
async function checkAdminSession() {
    try {
        const response = await fetch(`${API_URL}/admin/check`, {
            credentials: 'include'
        });
        const data = await response.json();
        console.log('Session check:', data);
        
        if (data.loggedIn) {
            showDashboard();
            loadDashboardStats();
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Admin Login
document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('Login successful');
            showDashboard();
            loadDashboardStats();
        } else {
            alert('Invalid credentials!\n\nUsername: Admin\nPassword: admin');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Connection error. Make sure server is running on port 3000');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
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
            bookings: 'Bookings Management',
            media: 'Media Gallery'
        };
        document.getElementById('sectionTitle').textContent = titles[section];
        
        if (section === 'users') loadUsers();
        else if (section === 'employees') loadEmployees();
        else if (section === 'vehicles') loadVehicles();
        else if (section === 'supervisors') loadSupervisors();
        else if (section === 'packages') loadPackages();
        else if (section === 'bookings') loadBookings();
        else if (section === 'media') loadMedia();
    });
});

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const [users, bookings] = await Promise.all([
            fetch(`${API_URL}/admin/users`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${API_URL}/admin/bookings`, { credentials: 'include' }).then(r => r.json())
        ]);
        
        document.getElementById('totalUsers').textContent = users.length;
        document.getElementById('totalBookings').textContent = bookings.length;
        document.getElementById('pendingBookings').textContent = bookings.filter(b => b.status === 'pending').length;
        document.getElementById('completedBookings').textContent = bookings.filter(b => b.status === 'completed').length;
        
        const recentTable = document.querySelector('#recentBookingsTable tbody');
        recentTable.innerHTML = bookings.slice(0, 5).map(booking => `
            <tr>
                <td>${booking.id}</td>
                <td>${booking.firstname} ${booking.lastname}</td>
                <td>${booking.relocation_type}</td>
                <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
                <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, { credentials: 'include' });
        const users = await response.json();
        
        const table = document.querySelector('#usersTable tbody');
        table.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.firstname} ${user.lastname}</td>
                <td>${user.email}</td>
                <td>${user.contact_number}</td>
                <td>${user.city}</td>
                <td>${user.cnic}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load Employees
async function loadEmployees() {
    try {
        const response = await fetch(`${API_URL}/admin/employees`, { credentials: 'include' });
        const employees = await response.json();
        
        const table = document.querySelector('#employeesTable tbody');
        table.innerHTML = employees.map(emp => `
            <tr>
                <td>${emp.id}</td>
                <td>${emp.employee_name}</td>
                <td>${emp.employee_contact}</td>
                <td>${emp.employee_cnic}</td>
                <td>${emp.employee_type}</td>
                <td>RS${emp.employee_charge_per_visit}</td>
                <td><span class="status-badge">${emp.status}</span></td>
                <td>
                    <button class="btn-edit" onclick="editEmployee(${emp.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteEmployee(${emp.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

function openEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'block';
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

async function editEmployee(id) {
    try {
        const response = await fetch(`${API_URL}/admin/employees`, { credentials: 'include' });
        const employees = await response.json();
        const emp = employees.find(e => e.id == id);
        
        if (emp) {
            document.getElementById('employeeId').value = emp.id;
            document.getElementById('empName').value = emp.employee_name;
            document.getElementById('empContact').value = emp.employee_contact;
            document.getElementById('empCnic').value = emp.employee_cnic;
            document.getElementById('empAge').value = emp.employee_age;
            document.getElementById('empType').value = emp.employee_type;
            document.getElementById('empStatus').value = emp.status;
            openEmployeeModal();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            await fetch(`${API_URL}/admin/employees/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadEmployees();
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

document.getElementById('employeeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('employeeId').value;
    const data = {
        employee_name: document.getElementById('empName').value,
        employee_contact: document.getElementById('empContact').value,
        employee_cnic: document.getElementById('empCnic').value,
        employee_age: document.getElementById('empAge').value,
        employee_type: document.getElementById('empType').value,
        status: document.getElementById('empStatus').value
    };
    
    try {
        const url = id ? `${API_URL}/admin/employees/${id}` : `${API_URL}/admin/employees`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        closeEmployeeModal();
        loadEmployees();
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving employee');
    }
});

// Load Vehicles
async function loadVehicles() {
    try {
        const response = await fetch(`${API_URL}/admin/vehicles`, { credentials: 'include' });
        const vehicles = await response.json();
        
        const table = document.querySelector('#vehiclesTable tbody');
        table.innerHTML = vehicles.map(vehicle => `
            <tr>
                <td>${vehicle.id}</td>
                <td>${vehicle.vehicle_registration_number}</td>
                <td>${vehicle.driver_name}</td>
                <td>${vehicle.driver_contact}</td>
                <td>${vehicle.vehicle_name}</td>
                <td>${vehicle.vehicle_size}</td>
                <td><span class="status-badge">${vehicle.status}</span></td>
                <td>
                    <button class="btn-edit" onclick="editVehicle(${vehicle.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteVehicle(${vehicle.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

function openVehicleModal() {
    document.getElementById('vehicleModal').style.display = 'block';
    document.getElementById('vehicleForm').reset();
    document.getElementById('vehicleId').value = '';
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').style.display = 'none';
}

async function editVehicle(id) {
    try {
        const response = await fetch(`${API_URL}/admin/vehicles`, { credentials: 'include' });
        const vehicles = await response.json();
        const vehicle = vehicles.find(v => v.id == id);
        
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
            openVehicleModal();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteVehicle(id) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
        try {
            await fetch(`${API_URL}/admin/vehicles/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadVehicles();
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

document.getElementById('vehicleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('vehicleId').value;
    const data = {
        vehicle_registration_number: document.getElementById('vehicleReg').value,
        driver_name: document.getElementById('driverName').value,
        driver_contact: document.getElementById('driverContact').value,
        driver_cnic: document.getElementById('driverCnic').value,
        vehicle_name: document.getElementById('vehicleName').value,
        vehicle_model_year: document.getElementById('vehicleYear').value,
        vehicle_size: document.getElementById('vehicleSize').value,
        vehicle_area: document.getElementById('vehicleArea').value,
        status: document.getElementById('vehicleStatus').value
    };
    
    try {
        const url = id ? `${API_URL}/admin/vehicles/${id}` : `${API_URL}/admin/vehicles`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        closeVehicleModal();
        loadVehicles();
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving vehicle');
    }
});

// Load Supervisors
async function loadSupervisors() {
    try {
        const response = await fetch(`${API_URL}/admin/supervisors`, { credentials: 'include' });
        const supervisors = await response.json();
        
        const table = document.querySelector('#supervisorsTable tbody');
        table.innerHTML = supervisors.map(sup => `
            <tr>
                <td>${sup.id}</td>
                <td>${sup.supervisor_name}</td>
                <td>${sup.supervisor_contact}</td>
                <td>${sup.supervisor_cnic}</td>
                <td>${sup.supervisor_area || '-'}</td>
                <td>${sup.supervisor_city || '-'}</td>
                <td>RS${sup.supervisor_salary || 0}</td>
                <td><span class="status-badge">${sup.status}</span></td>
                <td>
                    <button class="btn-edit" onclick="editSupervisor(${sup.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteSupervisor(${sup.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading supervisors:', error);
    }
}

function openSupervisorModal() {
    document.getElementById('supervisorModal').style.display = 'block';
    document.getElementById('supervisorForm').reset();
    document.getElementById('supervisorId').value = '';
}

function closeSupervisorModal() {
    document.getElementById('supervisorModal').style.display = 'none';
}

async function editSupervisor(id) {
    try {
        const response = await fetch(`${API_URL}/admin/supervisors`, { credentials: 'include' });
        const supervisors = await response.json();
        const sup = supervisors.find(s => s.id == id);
        
        if (sup) {
            document.getElementById('supervisorId').value = sup.id;
            document.getElementById('supName').value = sup.supervisor_name;
            document.getElementById('supAge').value = sup.supervisor_age;
            document.getElementById('supContact').value = sup.supervisor_contact;
            document.getElementById('supCnic').value = sup.supervisor_cnic;
            document.getElementById('supArea').value = sup.supervisor_area;
            document.getElementById('supSalary').value = sup.supervisor_salary;
            document.getElementById('supCity').value = sup.supervisor_city;
            document.getElementById('supStatus').value = sup.status;
            openSupervisorModal();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteSupervisor(id) {
    if (confirm('Are you sure you want to delete this supervisor?')) {
        try {
            await fetch(`${API_URL}/admin/supervisors/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadSupervisors();
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

document.getElementById('supervisorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('supervisorId').value;
    const data = {
        supervisor_name: document.getElementById('supName').value,
        supervisor_age: document.getElementById('supAge').value,
        supervisor_contact: document.getElementById('supContact').value,
        supervisor_cnic: document.getElementById('supCnic').value,
        supervisor_area: document.getElementById('supArea').value,
        supervisor_salary: document.getElementById('supSalary').value,
        supervisor_city: document.getElementById('supCity').value,
        status: document.getElementById('supStatus').value
    };
    
    try {
        const url = id ? `${API_URL}/admin/supervisors/${id}` : `${API_URL}/admin/supervisors`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        closeSupervisorModal();
        loadSupervisors();
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving supervisor');
    }
});

// Load Packages
async function loadPackages() {
    try {
        const response = await fetch(`${API_URL}/admin/packages`, { credentials: 'include' });
        const packages = await response.json();
        
        const table = document.querySelector('#packagesTable tbody');
        table.innerHTML = packages.map(pkg => `
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
                    <button class="btn-edit" onclick="openPackageEditModal(${pkg.id})">Edit</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

function openPackageEditModal(packageId) {
    document.getElementById('packageModal').style.display = 'block';
    document.getElementById('packageId').value = packageId;
    loadPackageData(packageId);
}

function closePackageModal() {
    document.getElementById('packageModal').style.display = 'none';
}

async function loadPackageData(id) {
    try {
        const response = await fetch(`${API_URL}/admin/packages`, { credentials: 'include' });
        const packages = await response.json();
        const pkg = packages.find(p => p.id == id);
        
        if (pkg) {
            document.getElementById('packagePrice').value = pkg.price;
            document.getElementById('packageLaborers').value = pkg.laborers;
            document.getElementById('packageTruckSize').value = pkg.truck_size || '';
            document.getElementById('packageInsurance').value = pkg.insurance_type || '';
            document.getElementById('packageDescription').value = pkg.description || '';
            document.getElementById('packagePackingMaterials').value = pkg.packing_materials ? 'Yes' : 'No';
            document.getElementById('packageFurnitureAssembly').value = pkg.furniture_assembly ? 'Yes' : 'No';
        }
    } catch (error) {
        console.error('Error loading package:', error);
    }
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
        await fetch(`${API_URL}/admin/packages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        closePackageModal();
        loadPackages();
        alert('Package updated successfully');
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating package');
    }
}

// Load Bookings
async function loadBookings() {
    try {
        const response = await fetch(`${API_URL}/admin/bookings`, { credentials: 'include' });
        const bookings = await response.json();
        
        const table = document.querySelector('#bookingsTable tbody');
        table.innerHTML = bookings.map(booking => `
            <tr>
                <td>${booking.id}</td>
                <td>${booking.firstname} ${booking.lastname}</td>
                <td>${booking.relocation_type}</td>
                <td>${booking.package_name || '-'}</td>
                <td>${booking.pickup_address?.substring(0, 30) || '-'}...</td>
                <td>${booking.dropoff_address?.substring(0, 30) || '-'}...</td>
                <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
                <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
                <td>
                    <button class="btn-update-status" onclick="openStatusModal(${booking.id})">Update Status</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function openStatusModal(bookingId) {
    document.getElementById('statusModal').style.display = 'block';
    document.getElementById('statusBookingId').value = bookingId;
}

function closeStatusModal() {
    document.getElementById('statusModal').style.display = 'none';
}

async function updateBookingStatus() {
    const bookingId = document.getElementById('statusBookingId').value;
    const status = document.getElementById('bookingStatus').value;
    
    try {
        await fetch(`${API_URL}/admin/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status })
        });
        
        closeStatusModal();
        loadBookings();
        loadDashboardStats();
        alert('Status updated successfully');
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating status');
    }
}

// Load Media
async function loadMedia() {
    try {
        const response = await fetch(`${API_URL}/admin/booking-media`, { credentials: 'include' });
        const media = await response.json();
        
        const table = document.querySelector('#mediaTable tbody');
        table.innerHTML = media.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>${item.customer_name}</td>
                <td>${item.customer_contact || '-'}</td>
                <td>${item.package_name || '-'}</td>
                <td>${item.item_pictures ? '📷 View' : '-'}</td>
                <td>${item.item_videos ? '🎥 View' : '-'}</td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading media:', error);
    }
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}