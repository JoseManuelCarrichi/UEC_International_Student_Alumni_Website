import { supabase } from './supabase-client.js';

let quill;

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

// Format date for datetime-local input
function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
}

// Initialize Quill editor
function initQuill() {
    quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'font': [] }],
                [{ 'align': [] }],
                ['clean'],
                ['link', 'image']
            ]
        },
        placeholder: 'Write your article content here...',
    });

    // Handle image upload
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                try {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('news-images')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('news-images')
                        .getPublicUrl(fileName);

                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, 'image', publicUrl);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    alert('Error uploading image. Please try again.');
                }
            }
        };
    });
}

// Initialize the page
async function init() {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    await loadNewsArticles();
    setupEventHandlers();
    initQuill();
}

// Load all news articles
async function loadNewsArticles() {
    try {
        const { data: articles, error } = await supabase
            .from('news')
            .select('*')
            .order('publication_date', { ascending: false });

        if (error) throw error;

        const newsList = document.querySelector('.news-management-list');
        newsList.innerHTML = '';

        articles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'news-management-item';
            articleElement.innerHTML = `
                <div class="news-info">
                    <div class="news-header">
                        <h3>${article.title}</h3>
                        ${article.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                    </div>
                    <div class="news-meta">
                        <p>Published on ${formatDate(article.publication_date)}</p>
                        ${article.author ? `<p>By ${article.author}</p>` : ''}
                    </div>
                    <div class="news-summary">
                        <p>${article.summary}</p>
                    </div>
                    ${article.tags && article.tags.length > 0 ? `
                        <div class="news-tags">
                            ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="news-preview">
                    ${article.image_url ? 
                        `<img src="${article.image_url}" alt="${article.title}" class="news-thumbnail">` : 
                        '<div class="no-image">No image</div>'}
                </div>
                <div class="news-actions">
                    <button class="btn btn-secondary edit-news" data-id="${article.id}">Edit</button>
                    <button class="btn btn-danger delete-news" data-id="${article.id}">Delete</button>
                </div>
            `;
            newsList.appendChild(articleElement);
        });

        // Add event listeners to the new buttons
        document.querySelectorAll('.edit-news').forEach(button => {
            button.addEventListener('click', () => editArticle(button.dataset.id));
        });

        document.querySelectorAll('.delete-news').forEach(button => {
            button.addEventListener('click', () => deleteArticle(button.dataset.id));
        });

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
        quill.setContents([]);
        // Set current date and time as default for new articles
        const now = new Date();
        document.getElementById('publication-date').value = formatDateForInput(now);
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        quill.setContents([]);
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        quill.setContents([]);
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            quill.setContents([]);
        }
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
    const content = quill.root.innerHTML;
    const publicationDate = new Date(formData.get('publication-date')).toISOString();

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
            content: content,
            author: formData.get('author'),
            publication_date: publicationDate,
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
        quill.setContents([]);
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
        quill.root.innerHTML = article.content;
        document.getElementById('author').value = article.author || '';
        document.getElementById('publication-date').value = formatDateForInput(article.publication_date);
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

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', init);