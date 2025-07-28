import { supabase } from './supabase-client.js';

// Check if user is authenticated and is admin
async function checkAdminAccess() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/login.html';
            return false;
        }

        const { data: admin, error } = await supabase
            .from('administrators')
            .select('id')
            .eq('id', user.id)
            .single();

        if (error || !admin) {
            console.error('Access denied: User is not an administrator');
            window.location.href = '/';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error checking admin access:', error.message);
        window.location.href = '/';
        return false;
    }
}

// Load all administrators
async function loadAdministrators() {
    try {
        const { data: administrators, error } = await supabase
            .from('administrators')
            .select('*')
            .order('email');

        if (error) throw error;

        const adminList = document.querySelector('.admin-list');
        adminList.innerHTML = '';

        administrators.forEach(admin => {
            const adminElement = document.createElement('div');
            adminElement.className = 'admin-item';
            adminElement.innerHTML = `
                <div class="admin-info">
                    <p>${admin.email}</p>
                    <p class="admin-date">Added: ${new Date(admin.created_at).toLocaleDateString()}</p>
                </div>
                <button class="btn btn-danger remove-admin" data-id="${admin.id}">Remove</button>
            `;
            adminList.appendChild(adminElement);
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-admin').forEach(button => {
            button.addEventListener('click', () => removeAdmin(button.dataset.id));
        });

    } catch (error) {
        console.error('Error loading administrators:', error.message);
        alert('Error loading administrators. Please try again.');
    }
}

// Add new administrator
async function addAdmin(email) {
    try {
        // First, check if the user exists in auth.users
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            alert('This email is not registered in the system. The user must register first.');
            return;
        }

        // Check if already an admin
        const { data: existingAdmin } = await supabase
            .from('administrators')
            .select('id')
            .eq('email', email)
            .single();

        if (existingAdmin) {
            alert('This user is already an administrator.');
            return;
        }

        // Add to administrators table
        const { error } = await supabase
            .from('administrators')
            .insert([{ id: user.id, email: email }]);

        if (error) throw error;

        alert('Administrator added successfully.');
        loadAdministrators();

    } catch (error) {
        console.error('Error adding administrator:', error.message);
        alert('Error adding administrator. Please try again.');
    }
}

// Remove administrator
async function removeAdmin(adminId) {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Prevent removing yourself
        if (user.id === adminId) {
            alert('You cannot remove yourself as an administrator.');
            return;
        }

        if (!confirm('Are you sure you want to remove this administrator?')) {
            return;
        }

        const { error } = await supabase
            .from('administrators')
            .delete()
            .eq('id', adminId);

        if (error) throw error;

        loadAdministrators();

    } catch (error) {
        console.error('Error removing administrator:', error.message);
        alert('Error removing administrator. Please try again.');
    }
}

// Initialize the page
async function init() {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    loadAdministrators();

    // Setup form handler
    const addAdminForm = document.getElementById('add-admin-form');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            addAdmin(email);
            addAdminForm.reset();
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 