import { supabase } from './supabase-client.js';

// Format date to a readable string
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Check if user is administrator
async function checkIsAdmin() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: admin } = await supabase
            .from('administrators')
            .select('id')
            .eq('id', user.id)
            .single();

        return !!admin;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Create news card HTML
function createNewsCard(article) {
    const imageUrl = article.image_url || 'https://via.placeholder.com/400x250';
    const date = formatDate(article.publication_date);
    
    return `
        <div class="news-card">
            <a href="news-article.html?id=${article.id}">
                <img src="${imageUrl}" alt="${article.title}">
                <div class="card-content">
                    <p class="news-meta">${date}${article.author ? ` by ${article.author}` : ''}</p>
                    <h3>${article.title}</h3>
                    <p class="news-excerpt">${article.summary}</p>
                </div>
            </a>
        </div>
    `;
}

// Load news articles
async function loadNews() {
    try {
        // Check if user is admin and show manage button if they are
        const isAdmin = await checkIsAdmin();
        const adminActions = document.getElementById('admin-actions');
        if (adminActions) {
            adminActions.style.display = isAdmin ? 'block' : 'none';
        }

        const { data: articles, error } = await supabase
            .from('news')
            .select('*')
            .order('publication_date', { ascending: false });

        if (error) throw error;

        const newsGrid = document.querySelector('.news-grid');
        if (!articles || articles.length === 0) {
            newsGrid.innerHTML = '<p class="no-news">No news articles available at the moment.</p>';
            return;
        }

        newsGrid.innerHTML = articles.map(article => createNewsCard(article)).join('');

    } catch (error) {
        console.error('Error loading news:', error.message);
        document.querySelector('.news-grid').innerHTML = 
            '<p class="error-message">Error loading news articles. Please try again later.</p>';
    }
}

// Sanitize HTML content
function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Remove potentially dangerous elements and attributes
    const scripts = div.getElementsByTagName('script');
    const iframes = div.getElementsByTagName('iframe');
    const objects = div.getElementsByTagName('object');
    const embeds = div.getElementsByTagName('embed');
    
    while(scripts.length > 0) scripts[0].remove();
    while(iframes.length > 0) iframes[0].remove();
    while(objects.length > 0) objects[0].remove();
    while(embeds.length > 0) embeds[0].remove();
    
    // Remove dangerous attributes
    const elements = div.getElementsByTagName('*');
    for(let i = 0; i < elements.length; i++) {
        const element = elements[i];
        element.removeAttribute('onerror');
        element.removeAttribute('onload');
        element.removeAttribute('onclick');
        element.removeAttribute('onmouseover');
        element.removeAttribute('onmouseout');
    }
    
    return div.innerHTML;
}

// Load single news article
async function loadNewsArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');

    if (!articleId) {
        window.location.href = 'news.html';
        return;
    }

    try {
        const { data: article, error } = await supabase
            .from('news')
            .select('*')
            .eq('id', articleId)
            .single();

        if (error) throw error;

        if (!article) {
            document.querySelector('.article-container').innerHTML = 
                '<p class="error-message">Article not found.</p>';
            return;
        }

        // Update page title
        document.title = `${article.title} | UEC International Student Alumni Network`;

        const articleContainer = document.querySelector('.article-container');
        articleContainer.innerHTML = `
            <article class="news-article">
                <header class="article-header">
                    <h1>${article.title}</h1>
                    <p class="article-meta">Published on ${formatDate(article.publication_date)}
                        ${article.author ? ` by ${article.author}` : ''}</p>
                </header>
                
                ${article.image_url ? 
                    `<img src="${article.image_url}" alt="${article.title}" class="article-image">` : 
                    ''}
                
                <div class="article-content">
                    ${sanitizeHTML(article.content)}
                </div>

                ${article.tags && article.tags.length > 0 ? `
                    <div class="article-tags">
                        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </article>
        `;

    } catch (error) {
        console.error('Error loading article:', error.message);
        document.querySelector('.article-container').innerHTML = 
            '<p class="error-message">Error loading article. Please try again later.</p>';
    }
}

// Initialize based on current page
if (window.location.pathname.endsWith('news-article.html')) {
    loadNewsArticle();
} else {
    loadNews();
} 