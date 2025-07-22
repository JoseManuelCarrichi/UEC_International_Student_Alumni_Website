import { supabase } from './supabase-client.js';

(async function loadAlumni() {
    const alumniGrid = document.querySelector('.alumni-grid');
    if (!alumniGrid) {
        console.error('The .alumni-grid container was not found.');
        return;
    }

    alumniGrid.innerHTML = '<p>Loading alumni...</p>';

    try {
        let { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, full_name, graduation_year, country, avatar_url')
            .not('graduation_year', 'is', null)
            .not('country', 'is', null)
            .neq('country', '')
            .order('full_name', { ascending: true });

        if (error) {
            throw error;
        }

        if (profiles.length === 0) {
            alumniGrid.innerHTML = '<p>No completed alumni profiles yet. Be the first!</p>';
            return;
        }

        alumniGrid.innerHTML = ''; 
        for (const profile of profiles) {
            const card = document.createElement('div');
            card.classList.add('alumni-card');
            const avatarUrl = profile.avatar_url || `https://i.pravatar.cc/200?u=${profile.id}`;
            card.innerHTML = `
                <a>
                    <img src="${avatarUrl}" alt="Profile photo of ${profile.full_name}">
                    <div class="card-content">
                        <h3>${profile.full_name}</h3>
                        <p>Class of ${profile.graduation_year}</p>
                        <p>Currently in: ${profile.country}</p>
                    </div>
                </a>
            `;
            alumniGrid.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading alumni profiles:', error);
        alumniGrid.innerHTML = '<p class="error">Could not load profiles. Please try again later.</p>';
    }
})(); 