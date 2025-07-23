import { supabase } from './supabase-client.js';

// Function to load all events
async function loadEvents() {
    try {
        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: true })
            .gte('event_date', new Date().toISOString()); // Only future events

        if (error) throw error;

        const eventsList = document.querySelector('.events-list');
        if (!eventsList) return;

        eventsList.innerHTML = ''; // Clear existing events

        if (events.length === 0) {
            eventsList.innerHTML = '<p class="no-events">No upcoming events at the moment.</p>';
            return;
        }

        events.forEach(event => {
            const eventDate = new Date(event.event_date);
            const month = eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const day = eventDate.getDate();

            const eventCard = `
                <div class="event-card">
                    <div class="event-date">
                        <span class="month">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    <div class="event-details">
                        <h2>${event.title}</h2>
                        <p class="event-meta"><strong>When:</strong> ${eventDate.toLocaleString('en-US', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Tokyo'
                        })} JST</p>
                        <p class="event-meta"><strong>Where:</strong> ${event.location}</p>
                        <p class="event-summary">${event.summary}</p>
                        <a href="event-detail.html?id=${event.id}" class="btn btn-secondary">More Info</a>
                    </div>
                </div>
            `;
            eventsList.innerHTML += eventCard;
        });

    } catch (error) {
        console.error('Error loading events:', error.message);
        const eventsList = document.querySelector('.events-list');
        eventsList.innerHTML = '<p class="error-message">Error loading events. Please try again later.</p>';
    }
}

// Function to load a specific event
async function loadEventDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');

        if (!eventId) {
            window.location.href = 'events.html';
            return;
        }

        const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) throw error;

        if (!event) {
            window.location.href = 'events.html';
            return;
        }

        // Update the page content
        document.querySelector('.event-detail-header h1').textContent = event.title;
        
        const eventDate = new Date(event.event_date);
        const eventMeta = document.querySelector('.event-meta-detail');
        eventMeta.innerHTML = `
            <strong>Date:</strong> ${eventDate.toLocaleString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })} <br>
            <strong>Time:</strong> ${eventDate.toLocaleString('en-US', { 
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Tokyo'
            })} JST <br>
            <strong>Location:</strong> ${event.location}
        `;

        const eventContent = document.querySelector('.event-detail-content');
        const eventImage = document.querySelector('.event-image');
        if (event.image_url) {
            eventImage.src = event.image_url;
            eventImage.style.display = 'block';
        } else {
            eventImage.style.display = 'none';
        }

        // Update the event description
        const aboutSection = eventContent.querySelector('p');
        aboutSection.textContent = event.description || 'No description available.';

        // Update the schedule if it exists
        const scheduleList = document.querySelector('.event-detail-content ul');
        if (event.schedule && Object.keys(event.schedule).length > 0) {
            scheduleList.innerHTML = '';
            Object.entries(event.schedule).forEach(([time, activity]) => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${time}:</strong> ${activity}`;
                scheduleList.appendChild(li);
            });
        } else {
            scheduleList.innerHTML = '<li>Schedule to be announced.</li>';
        }

        // Update the registration section
        const registrationSection = document.querySelector('.registration-section');
        const registrationText = event.is_free ? 
            `This event is free for all alumni` :
            `This event has a registration fee of ¥${event.price}`;
            
        registrationSection.querySelector('p').textContent = 
            `${registrationText}. ${event.registration_deadline ? 
                `Registration deadline is ${new Date(event.registration_deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}.` : 
                'No registration deadline specified.'}`;

        // Configure the registration button
        const registerButton = document.getElementById('register-button');
        if (new Date(event.registration_deadline) < new Date()) {
            registerButton.style.display = 'none';
            registrationSection.querySelector('p').textContent += ' Registration is closed.';
        } else {
            registerButton.href = `mailto:events@uec-alumni.example.com?subject=Registration for ${event.title}`;
        }

    } catch (error) {
        console.error('Error loading event details:', error.message);
        document.querySelector('.container').innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>Unable to load event details. Please try again later.</p>
                <a href="events.html" class="btn btn-primary">Back to Events</a>
            </div>
        `;
    }
}

// Initialize the page according to the current URL
if (window.location.pathname.includes('events.html')) {
    loadEvents();
} else if (window.location.pathname.includes('event-detail.html')) {
    loadEventDetails();
} 