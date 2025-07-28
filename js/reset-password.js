import { supabase } from './supabase-client.js';

const resetPasswordForm = document.querySelector('#reset-password-form');

if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(form.email.value, {
                redirectTo: `${window.location.origin}/update-password.html`,
            });

            if (error) throw error;

            alert('If an account exists with this email, you will receive password reset instructions shortly.');
            window.location.href = 'login.html';

        } catch (error) {
            console.error('Password reset request error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Reset Instructions';
        }
    });
} 