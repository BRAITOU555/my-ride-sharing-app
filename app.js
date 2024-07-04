const apiUrl = 'http://localhost:3000';

// Helper function to get token from local storage
const getToken = () => localStorage.getItem('token');

// Registration
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();
    alert('Registration successful: ' + JSON.stringify(data));
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        showSections();
        alert('Login successful');
    } else {
        alert('Login failed');
    }
});

// Update Profile
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const password = document.getElementById('profilePassword').value;

    const token = getToken();

    const response = await fetch(`${apiUrl}/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();
    alert('Profile update successful: ' + JSON.stringify(data));
});

// Update Driver Location
document.getElementById('locationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;

    const token = getToken();

    const response = await fetch(`${apiUrl}/driver/location`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ latitude, longitude })
    });

    const data = await response.json();
    alert('Location update successful: ' + JSON.stringify(data));
});

// Get Ride History
document.getElementById('getHistory').addEventListener('click', async () => {
    const token = getToken();

    const response = await fetch(`${apiUrl}/rides/history`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();
    document.getElementById('historyResult').innerText = JSON.stringify(data, null, 2);
});

// Submit Review
document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ride_id = document.getElementById('rideId').value;
    const rating = document.getElementById('rating').value;
    const comment = document.getElementById('comment').value;

    const token = getToken();

    const response = await fetch(`${apiUrl}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ride_id, rating, comment })
    });

    const data = await response.json();
    alert('Review submitted: ' + JSON.stringify(data));
});

// Create Payment Intent
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('amount').value;

    const token = getToken();

    const response = await fetch(`${apiUrl}/create-payment-intent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
    });

    const data = await response.json();
    alert('Payment intent created: ' + JSON.stringify(data));
});

// Helper function to show sections after login
function showSections() {
    console.log('Showing sections');
    document.getElementById('profile').style.display = 'block';
    document.getElementById('driverLocation').style.display = 'block';
    document.getElementById('rideHistory').style.display = 'block';
    document.getElementById('reviews').style.display = 'block';
    document.getElementById('payments').style.display = 'block';
}

// Automatically show sections if the user is already logged in
window.onload = () => {
    if (getToken()) {
        showSections();
    }
}
