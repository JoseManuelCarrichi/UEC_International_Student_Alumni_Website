import { supabase } from './supabase-client.js';

const updatePasswordForm = document.querySelector('#update-password-form');

if (updatePasswordForm) {
    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Updating...';

        const password = form.password.value;
        const confirmPassword = form['confirm-password'].value;

        try {
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match.');
            }

            // Update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            // Explicitly sign out the user
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) throw signOutError;

            alert('Password updated successfully! Please log in with your new password.');
            window.location.href = 'login.html';

        } catch (error) {
            console.error('Password update error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Update Password';
        }
    });
} 