import { supabase } from './supabase-client.js';

// Get current user function (exported for use in other scripts)
async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Function to update the navigation bar based on auth state
async function updateNav(session) {
    const navAuth = document.querySelector('.nav-auth');
    if (!navAuth) return;

    if (session) {
        navAuth.innerHTML = `
            <a href="alumni-profile.html" class="btn btn-secondary">Profile</a>
            <button id="logout-button" class="btn btn-primary">Logout</button>
        `;
        document.querySelector('#logout-button').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    } else {
        navAuth.innerHTML = `
            <a href="login.html" class="btn btn-secondary">Login</a>
            <a href="register.html" class="btn btn-primary">Register</a>
        `;
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: form.email.value,
            password: form.password.value,
        });

        if (error) throw error;

        if (data.user) {
            window.location.href = 'alumni-profile.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login form initialization
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Listen for authentication state changes
supabase.auth.onAuthStateChange((event, session) => {
    updateNav(session);
});

// Check and update navigation state when page loads
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    updateNav(session);
})();

export { getUser }; 