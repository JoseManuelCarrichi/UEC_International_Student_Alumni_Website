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

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Initialize the page
async function init() {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    await loadNewsArticles();
    setupEventHandlers();
}

// Load all news articles
async function loadNewsArticles() {
    try {
        const { data: articles, error } = await supabase
            .from('news')
            .select('*')
            .order('publication_date', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById('news-table-body');
        tableBody.innerHTML = articles.map(article => `
            <tr>
                <td>${article.title}</td>
                <td>${article.author || '-'}</td>
                <td>${formatDate(article.publication_date)}</td>
                <td>${article.is_featured ? '✓' : '-'}</td>
                <td>
                    <button onclick="editArticle(${article.id})" class="btn btn-small btn-secondary">Edit</button>
                    <button onclick="deleteArticle(${article.id})" class="btn btn-small btn-danger">Delete</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading articles:', error.message);
        alert('Error loading articles. Please try again.');
    }
}

// Setup event handlers
function setupEventHandlers() {
    const modal = document.getElementById('news-modal');
    const createBtn = document.getElementById('create-news-btn');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-edit');
    const newsForm = document.getElementById('news-form');
    const imageInput = document.getElementById('image');

    createBtn.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Create News Article';
        document.getElementById('news-id').value = '';
        newsForm.reset();
        document.getElementById('image-preview').innerHTML = '';
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    newsForm.addEventListener('submit', handleSubmit);
    imageInput.addEventListener('change', handleImagePreview);
}

// Handle image preview
function handleImagePreview(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `
            <p>Preview:</p>
            <img src="${e.target.result}" alt="Preview" style="max-width: 200px;">
        `;
    };
    reader.readAsDataURL(file);
}

// Handle form submission
async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const newsId = document.getElementById('news-id').value;
    const imageFile = document.getElementById('image').files[0];

    try {
        let imageUrl = null;
        
        // Handle image upload if there's a new image
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('news-images')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('news-images')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
        }

        // Prepare article data
        const articleData = {
            title: formData.get('title'),
            summary: formData.get('summary'),
            content: formData.get('content'),
            author: formData.get('author'),
            is_featured: formData.get('is_featured') === 'on',
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
            ...(imageUrl && { image_url: imageUrl })
        };

        let error;
        if (newsId) {
            // Get current article to check for existing image
            const { data: currentArticle } = await supabase
                .from('news')
                .select('image_url')
                .eq('id', newsId)
                .single();

            // Delete old image if it's being replaced
            if (imageFile && currentArticle?.image_url) {
                const oldImagePath = currentArticle.image_url.split('/').pop();
                await supabase.storage
                    .from('news-images')
                    .remove([oldImagePath]);
            }

            // Update existing article
            const { error: updateError } = await supabase
                .from('news')
                .update(articleData)
                .eq('id', newsId);
            error = updateError;
        } else {
            // Create new article
            const { error: insertError } = await supabase
                .from('news')
                .insert([articleData]);
            error = insertError;
        }

        if (error) throw error;

        // Close modal and reload
        document.getElementById('news-modal').style.display = 'none';
        await loadNewsArticles();

    } catch (error) {
        console.error('Error saving article:', error.message);
        alert('Error saving article. Please try again.');
    }
}

// Edit article
async function editArticle(id) {
    try {
        const { data: article, error } = await supabase
            .from('news')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Update modal title
        document.getElementById('modal-title').textContent = 'Edit News Article';

        // Populate form
        document.getElementById('news-id').value = article.id;
        document.getElementById('title').value = article.title;
        document.getElementById('summary').value = article.summary;
        document.getElementById('content').value = article.content;
        document.getElementById('author').value = article.author || '';
        document.getElementById('is_featured').checked = article.is_featured;
        document.getElementById('tags').value = article.tags ? article.tags.join(', ') : '';

        if (article.image_url) {
            document.getElementById('image-preview').innerHTML = `
                <p>Current image:</p>
                <img src="${article.image_url}" alt="Current image" style="max-width: 200px;">
            `;
        } else {
            document.getElementById('image-preview').innerHTML = '';
        }

        // Show modal
        document.getElementById('news-modal').style.display = 'block';

    } catch (error) {
        console.error('Error loading article:', error.message);
        alert('Error loading article for editing. Please try again.');
    }
}

// Delete article
async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
        return;
    }

    try {
        // Get article details to check for image
        const { data: article } = await supabase
            .from('news')
            .select('image_url')
            .eq('id', id)
            .single();

        // Delete image if exists
        if (article?.image_url) {
            const imagePath = article.image_url.split('/').pop();
            await supabase.storage
                .from('news-images')
                .remove([imagePath]);
        }

        // Delete article
        const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadNewsArticles();

    } catch (error) {
        console.error('Error deleting article:', error.message);
        alert('Error deleting article. Please try again.');
    }
}

// Make functions available globally
window.editArticle = editArticle;
window.deleteArticle = deleteArticle;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 