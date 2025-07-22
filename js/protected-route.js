import { supabase } from './supabase-client.js';

(async function () {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error getting session:', error);
        // Redirect to login even if there's an error, as we can't verify auth status
        window.location.href = 'login.html'; 
        return;
    }

    if (!session) {
        // If there is no session, redirect to the login page
        alert('You must be logged in to view this page.');
        window.location.href = 'login.html';
    }
})(); 