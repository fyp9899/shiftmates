// API Base URL - Website uses port 3000
const API_URL = 'http://localhost:3000/api';

// Check login status on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
    initializeChatbot();
});

// Check login status
async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_URL}/auth/session`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.loggedIn) {
            document.getElementById('navAuth').style.display = 'none';
            const userGreeting = document.getElementById('userGreeting');
            userGreeting.style.display = 'flex';
            document.getElementById('userName').innerHTML = `${data.user.firstname} <button onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>`;
        } else {
            document.getElementById('navAuth').style.display = 'flex';
            document.getElementById('userGreeting').style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking login status:', error);
    }
}

// Logout function
async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Login Modal Functions
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Signup Modal Functions
function openSignupModal() {
    document.getElementById('signupModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSignupModal() {
    document.getElementById('signupModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Login Form Submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Loading...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeLoginModal();
            await checkLoginStatus();
            location.reload();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Signup Form Submission
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
    
    for (let [key, value] of Object.entries(userData)) {
        if (key !== 'postal_code' && key !== 'area' && !value) {
            alert(`Please fill in the ${key} field`);
            return;
        }
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Account created successfully! Please login.');
            closeSignupModal();
            openLoginModal();
            document.getElementById('signupForm').reset();
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function showPackageInfo(info) {
    alert(`For booking ${info}, please download our mobile app from the app store.`);
}

function openGoogleMaps() {
    window.open('https://maps.google.com/?q=NIPA+Road+Karachi+Pakistan', '_blank');
}

// Chatbot Functions
function initializeChatbot() {
    const chatbot = document.getElementById('chatbot');
    const chatInput = document.getElementById('chatInput');
    
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function toggleChatbot() {
    const chatbot = document.getElementById('chatbot');
    chatbot.classList.toggle('active');
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    addMessage(message, 'user');
    input.value = '';
    
    setTimeout(() => {
        const response = getBotResponse(message);
        addMessage(response, 'bot');
    }, 500);
}

function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function getBotResponse(message) {
    const msg = message.toLowerCase();
    if (msg.includes('hello') || msg.includes('hi')) {
        return 'Hello! Welcome to ShiftMates. How can I assist you with your relocation needs?';
    } else if (msg.includes('service') || msg.includes('offer')) {
        return 'We offer house shifting, office shifting, furniture shifting, and additional services like plumber, electrician, carpenter, AC technician, and cleaner.';
    } else if (msg.includes('package') || msg.includes('price')) {
        return 'We have three packages: Basic (RS5000), Gold (RS10000), and Platinum (RS20000). Each package includes different features.';
    } else if (msg.includes('book') || msg.includes('booking')) {
        return 'To book our services, please download our mobile app from Google Play Store or App Store.';
    } else if (msg.includes('contact') || msg.includes('phone')) {
        return 'Contact us at +92 309 1422225 or shiftmates@gmail.com';
    } else if (msg.includes('location') || msg.includes('office')) {
        return 'Our office is at Main NIPA Road Near SSUET, Karachi, Pakistan.';
    } else if (msg.includes('app') || msg.includes('download')) {
        return 'Download our app from Google Play Store or Apple App Store!';
    } else if (msg.includes('thank')) {
        return 'You\'re welcome! Is there anything else I can help you with?';
    } else {
        return 'For specific inquiries, please contact our customer support at +92 309 1422225.';
    }
}

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});