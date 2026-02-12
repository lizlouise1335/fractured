/**
 * Fractured Research — Main Application
 */

let articles = [];
let currentPage = 'home';

// ---- Initialization ----

document.addEventListener('DOMContentLoaded', () => {
  articles = loadArticles();
  renderArticleList(articles);
  setupScrollListener();
});

// ---- Navigation ----

function navigateTo(page, data) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  currentPage = page;

  if (page === 'home') {
    document.getElementById('page-home').classList.add('active');
    document.getElementById('search-input').value = '';
    renderArticleList(articles);
  } else if (page === 'reader' && data) {
    document.getElementById('page-reader').classList.add('active');
    renderArticle(data);
  } else if (page === 'compose') {
    document.getElementById('page-compose').classList.add('active');
  } else if (page === 'simulation') {
    document.getElementById('page-simulation').classList.add('active');
    initSimulation();
  } else if (page === 'about') {
    document.getElementById('page-about').classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Article List ----

function renderArticleList(list) {
  const container = document.getElementById('article-list');
  const emptyState = document.getElementById('empty-state');

  if (list.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Sort by date descending
  const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = sorted.map(article => `
    <div class="article-card" onclick="openArticle('${article.id}')">
      <button class="article-card-delete" onclick="event.stopPropagation(); deleteArticle('${article.id}')" title="Delete article">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div class="article-card-meta">
        <span class="article-card-category">${escapeForHtml(article.category)}</span>
        <span class="article-card-dot"></span>
        <span>${formatDate(article.date)}</span>
        <span class="article-card-dot"></span>
        <span>${escapeForHtml(article.author)}</span>
      </div>
      <h2 class="article-card-title">${escapeForHtml(article.title)}</h2>
      <p class="article-card-abstract">${escapeForHtml(article.abstract)}</p>
      <div class="article-card-footer">
        ${(article.tags || []).map(tag => `<span class="tag">${escapeForHtml(tag)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function openArticle(id) {
  const article = articles.find(a => a.id === id);
  if (article) {
    navigateTo('reader', article);
  }
}

function deleteArticle(id) {
  if (!confirm('Delete this article? This cannot be undone.')) return;

  articles = articles.filter(a => a.id !== id);
  saveArticles(articles);
  renderArticleList(articles);
  showToast('Article deleted');
}

// ---- Search ----

function filterArticles(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderArticleList(articles);
    return;
  }
  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.abstract.toLowerCase().includes(q) ||
    a.category.toLowerCase().includes(q) ||
    a.author.toLowerCase().includes(q) ||
    (a.tags || []).some(t => t.toLowerCase().includes(q))
  );
  renderArticleList(filtered);
}

// ---- Article Reader ----

function renderArticle(article) {
  const container = document.getElementById('reader-content');

  container.innerHTML = `
    <button class="reader-back" onclick="navigateTo('home')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back to articles
    </button>
    <header class="reader-header">
      <div class="reader-category">${escapeForHtml(article.category)}</div>
      <h1 class="reader-title">${escapeForHtml(article.title)}</h1>
      <div class="reader-meta">
        <strong>${escapeForHtml(article.author)}</strong>
        <span class="article-card-dot"></span>
        <span>${formatDate(article.date)}</span>
      </div>
    </header>
    <div class="reader-abstract">${escapeForHtml(article.abstract)}</div>
    <div class="reader-body">${parseMarkdown(article.body)}</div>
    ${(article.tags || []).length > 0 ? `
      <div class="reader-tags">
        ${article.tags.map(t => `<span class="tag">${escapeForHtml(t)}</span>`).join('')}
      </div>
    ` : ''}
  `;
}

// ---- Compose ----

function publishArticle(event) {
  event.preventDefault();

  const title = document.getElementById('compose-title').value.trim();
  const abstract = document.getElementById('compose-abstract').value.trim();
  const author = document.getElementById('compose-author').value.trim();
  const category = document.getElementById('compose-category').value;
  const tagsStr = document.getElementById('compose-tags').value.trim();
  const body = document.getElementById('compose-body').value;

  if (!title || !abstract || !author || !category || !body) {
    showToast('Please fill in all required fields');
    return;
  }

  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  const article = {
    id: generateId(),
    title,
    abstract,
    author,
    category,
    tags,
    date: new Date().toISOString().split('T')[0],
    body
  };

  articles.unshift(article);
  saveArticles(articles);
  clearCompose();
  showToast('Article published successfully');
  navigateTo('home');
}

function clearCompose() {
  document.getElementById('compose-form').reset();
}

// ---- Utilities ----

function escapeForHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}

function setupScrollListener() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}
