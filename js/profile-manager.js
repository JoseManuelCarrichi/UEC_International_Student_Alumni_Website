import { supabase } from './supabase-client.js';

async function main() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('User not found. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    const profileContainer = document.querySelector('#profile-container');
    if (!profileContainer) {
        console.error('Could not find #profile-container element.');
        return;
    }

    let { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, graduation_year, country, avatar_url, bio, has_changed_name')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        profileContainer.innerHTML = `<p class="error">Error loading profile. Please try again later.</p>`;
        return;
    }

    if (profile && profile.graduation_year && profile.country) {
        renderProfileView(profile, profileContainer, user);
    } else {
        renderProfileForm(profile, profileContainer, user);
    }
}

function renderProfileView(profile, container, user) {
    // Default avatar placeholder - using an emoji
    const avatarHtml = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="Profile photo of ${profile.full_name}" class="profile-photo">`
        : `<div class="profile-photo-placeholder">👤</div>`;

    container.innerHTML = `
        <div class="profile-header">
            ${avatarHtml}
            <div class="profile-info">
                <h1>${profile.full_name}</h1>
                <p class="profile-meta"><strong>Graduation Year:</strong> ${profile.graduation_year}</p>
                <p class="profile-meta"><strong>Current Country:</strong> ${profile.country}</p>
                <button id="edit-profile-btn" class="btn btn-primary">Edit Profile</button>
            </div>
        </div>
        <div class="profile-bio">
            <h2>About Me</h2>
            <p>${profile.bio || 'No biography added yet.'}</p>
        </div>
    `;
    document.querySelector('#edit-profile-btn').addEventListener('click', () => {
        renderProfileForm(profile, container, user);
    });
}

function renderProfileForm(profile, container, user) {
    // Default avatar placeholder - using an emoji
    const avatarHtml = profile?.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="Current profile photo" class="profile-photo" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem;">`
        : `<div class="profile-photo-placeholder" style="width: 150px; height: 150px; border-radius: 50%; background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 4rem; margin: 0 auto 1rem;">👤</div>`;

    container.innerHTML = `
        <style>
            .profile-photo-placeholder {
                width: 150px;
                height: 150px;
                border-radius: 50%;
                background-color: #f0f0f0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 4rem;
                margin: 0 auto;
            }
        </style>
        <div class="auth-form" style="max-width: 600px; margin: 2rem auto;">
            <h2>${profile && profile.graduation_year ? 'Edit' : 'Complete'} Your Profile</h2>
            <p>This information will be displayed in the public alumni directory.</p>
            <form id="profile-form">
                <div class="form-group text-center">
                    ${avatarHtml}
                    <label for="avatar">Upload profile picture</label>
                    <input type="file" id="avatar" name="avatar" class="form-control" accept="image/png, image/jpeg">
                </div>
                <div class="form-group">
                    <label for="fullname">Full Name</label>
                    <input type="text" id="fullname" name="fullname" value="${profile?.full_name || ''}" 
                           ${profile?.has_changed_name ? 'disabled' : ''}>
                    ${profile?.has_changed_name 
                        ? '<small>Your name cannot be changed anymore as you have already modified it once.</small>'
                        : '<small>You can change your name once. Choose carefully!</small>'}
                </div>
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" value="${user.email}" disabled>
                </div>
                <div class="form-group">
                    <label for="graduation_year">Graduation Year</label>
                    <input type="number" id="graduation_year" name="graduation_year" placeholder="e.g., 2018" value="${profile?.graduation_year || ''}" required>
                </div>
                <div class="form-group">
                    <label for="country">Current Country</label>
                    <input type="text" id="country" name="country" placeholder="e.g., Colombia" value="${profile?.country || ''}" required>
                </div>
                <div class="form-group">
                    <label for="bio">About Me</label>
                    <textarea id="bio" name="bio" rows="5" placeholder="Tell us about yourself, your experiences at UEC, and what you're doing now...">${profile?.bio || ''}</textarea>
                    <small>Share your story with fellow alumni. What did you study? What are you working on now? What are your interests?</small>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Save Profile</button>
                ${profile && profile.graduation_year ? '<button type="button" id="cancel-edit-btn" class="btn btn-secondary btn-block">Cancel</button>' : ''}
            </form>
        </div>
    `;

    if (profile && profile.graduation_year) {
        document.querySelector('#cancel-edit-btn').addEventListener('click', () => {
            renderProfileView(profile, container, user);
        });
    }

    document.querySelector('#profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';

        try {
            let avatar_url = profile?.avatar_url;
            const file = form.avatar.files[0];

            if (file) {
                const filePath = `${user.id}/${Date.now()}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: publicUrlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                
                avatar_url = publicUrlData.publicUrl;
            }

            const updates = {
                id: user.id,
                updated_at: new Date().toISOString(),
                graduation_year: form.graduation_year.value,
                country: form.country.value,
                bio: form.bio.value.trim(),
                avatar_url: avatar_url
            };

            // Solo actualizar el nombre si no se ha cambiado antes
            if (!profile?.has_changed_name && form.fullname.value !== profile?.full_name) {
                updates.full_name = form.fullname.value;
                updates.has_changed_name = true;
            } else {
                updates.full_name = profile?.full_name;
            }

            const { error: upsertError } = await supabase.from('profiles').upsert(updates);

            if (upsertError) {
                throw upsertError;
            }

            alert('Profile saved successfully!');
            let { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            renderProfileView(updatedProfile, container, user);

        } catch (error) {
            console.error('Error updating profile:', error);
            alert(`Error updating profile: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Profile';
        }
    });
}

main(); 