import { supabase } from './supabase-client.js';

// Check if user is authenticated and is admin
async function checkAdminAccess() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/login.html';
            return false;
        }

        // Check if the user is in the administrators table
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

// Initialize the page
async function init() {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    loadEvents();
    setupEventHandlers();
}

// Load all events for management
async function loadEvents() {
    try {
        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: true });

        if (error) throw error;

        const eventsList = document.querySelector('.events-management-list');
        eventsList.innerHTML = '';

        events.forEach(event => {
            const eventDate = new Date(event.event_date);
            const eventElement = document.createElement('div');
            eventElement.className = 'event-management-item';
            eventElement.innerHTML = `
                <div class="event-info">
                    <h3>${event.title}</h3>
                    <p>${eventDate.toLocaleString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Tokyo'
                    })} JST</p>
                </div>
                <div class="event-actions">
                    <button class="btn btn-secondary edit-event" data-id="${event.id}">Edit</button>
                    <button class="btn btn-danger delete-event" data-id="${event.id}">Delete</button>
                </div>
            `;
            eventsList.appendChild(eventElement);
        });

        // Add event listeners to the new buttons
        document.querySelectorAll('.edit-event').forEach(button => {
            button.addEventListener('click', () => editEvent(button.dataset.id));
        });

        document.querySelectorAll('.delete-event').forEach(button => {
            button.addEventListener('click', () => deleteEvent(button.dataset.id));
        });

    } catch (error) {
        console.error('Error loading events:', error.message);
        alert('Error loading events. Please try again.');
    }
}

// Setup event handlers
function setupEventHandlers() {
    const modal = document.getElementById('event-modal');
    const createBtn = document.getElementById('create-event-btn');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-btn');
    const eventForm = document.getElementById('event-form');
    const isFreeCheckbox = document.getElementById('is-free');
    const priceGroup = document.getElementById('price-group');

    createBtn.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Create Event';
        document.getElementById('event-id').value = '';
        eventForm.reset();
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    isFreeCheckbox.addEventListener('change', () => {
        priceGroup.style.display = isFreeCheckbox.checked ? 'none' : 'block';
    });

    eventForm.addEventListener('submit', handleEventSubmit);
}

// Handle form submission
async function handleEventSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(e.target);
        const eventId = document.getElementById('event-id').value;
        const imageFile = formData.get('event-image');
        
        // Prepare event data
        const eventData = {
            title: formData.get('title'),
            event_date: new Date(formData.get('event-date')).toISOString(),
            location: formData.get('location'),
            summary: formData.get('summary'),
            description: formData.get('description'),
            is_free: formData.get('is-free') === 'on',
            price: formData.get('is-free') === 'on' ? null : Number(formData.get('price')),
            registration_deadline: formData.get('registration-deadline') ? 
                new Date(formData.get('registration-deadline')).toISOString() : null
        };

        // Handle schedule JSON
        try {
            const scheduleText = formData.get('schedule');
            eventData.schedule = scheduleText ? JSON.parse(scheduleText) : null;
        } catch (error) {
            alert('Invalid schedule JSON format. Please check the format and try again.');
            return;
        }

        // Handle image upload if there's a new image
        if (imageFile.size > 0) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('event-images')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            // Get the public URL for the uploaded image
            const { data: { publicUrl } } = supabase.storage
                .from('event-images')
                .getPublicUrl(filePath);

            eventData.image_url = publicUrl;
        }

        // Update or create event
        const { error } = eventId ? 
            await supabase
                .from('events')
                .update(eventData)
                .eq('id', eventId) :
            await supabase
                .from('events')
                .insert([eventData]);

        if (error) throw error;

        // Close modal and reload events
        document.getElementById('event-modal').style.display = 'none';
        loadEvents();

    } catch (error) {
        console.error('Error saving event:', error.message);
        alert('Error saving event. Please try again.');
    }
}

// Load event data for editing
async function editEvent(eventId) {
    try {
        const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) throw error;

        // Populate form
        document.getElementById('modal-title').textContent = 'Edit Event';
        document.getElementById('event-id').value = eventId;
        document.getElementById('title').value = event.title;
        document.getElementById('event-date').value = new Date(event.event_date)
            .toISOString().slice(0, 16);
        document.getElementById('location').value = event.location;
        document.getElementById('summary').value = event.summary;
        document.getElementById('description').value = event.description || '';
        document.getElementById('is-free').checked = event.is_free;
        document.getElementById('price').value = event.price || '';
        document.getElementById('price-group').style.display = event.is_free ? 'none' : 'block';
        
        if (event.registration_deadline) {
            document.getElementById('registration-deadline').value = 
                new Date(event.registration_deadline).toISOString().slice(0, 16);
        }
        
        document.getElementById('schedule').value = 
            event.schedule ? JSON.stringify(event.schedule, null, 2) : '';

        // Show current image if exists
        const currentImageDiv = document.getElementById('current-image');
        if (event.image_url) {
            currentImageDiv.innerHTML = `
                <p>Current image:</p>
                <img src="${event.image_url}" alt="Current event image" style="max-width: 200px">
            `;
        } else {
            currentImageDiv.innerHTML = '<p>No image currently set</p>';
        }

        // Show modal
        document.getElementById('event-modal').style.display = 'block';

    } catch (error) {
        console.error('Error loading event details:', error.message);
        alert('Error loading event details. Please try again.');
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }

    try {
        // Get event details to check for image
        const { data: event } = await supabase
            .from('events')
            .select('image_url')
            .eq('id', eventId)
            .single();

        // Delete image if exists
        if (event?.image_url) {
            const imagePath = event.image_url.split('/').pop();
            await supabase.storage
                .from('event-images')
                .remove([imagePath]);
        }

        // Delete event
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;

        loadEvents();

    } catch (error) {
        console.error('Error deleting event:', error.message);
        alert('Error deleting event. Please try again.');
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 