import { supabase } from './supabase-client.js';

const registerForm = document.querySelector('#register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating account...';

        const fullName = form.fullname.value;
        const email = form.email.value;
        const password = form.password.value;

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    alert('This email is already registered. Please try logging in instead.');
                    window.location.href = 'login.html';
                } else {
                    throw error;
                }
                return;
            }

            if (data.user) {
                alert('Registration successful! Please check your email to verify your account.');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert(`Error during registration: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Register';
        }
    });
} 