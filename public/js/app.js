const API_BASE = 'http://localhost:3000';
let currentPostId = null;
let editingCommentId = null;

const postForm = document.getElementById('postForm');
const postTitleInput = document.getElementById('postTitle');
const postPriceInput = document.getElementById('postPrice');
const postViewsInput = document.getElementById('postViews');
const postIdInput = document.getElementById('postId');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const postsList = document.getElementById('postsList');

const modalOverlay = document.getElementById('modalOverlay');
const modalCloseBtn = document.querySelector('.modal-close');
const modalPostTitle = document.getElementById('modalPostTitle');
const commentsList = document.getElementById('commentsList');
const commentText = document.getElementById('commentText');
const addCommentBtn = document.getElementById('addCommentBtn');

modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

postForm.addEventListener('submit', (e) => {
    e.preventDefault();
    savePost();
});

resetBtn.addEventListener('click', () => {
    postIdInput.value = '';
    postForm.reset();
    submitBtn.textContent = 'Add Product';
});

addCommentBtn.addEventListener('click', saveComment);

commentText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveComment();
});

async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE}/posts`);
        const posts = await response.json();
        renderPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

function renderPosts(posts) {
    postsList.innerHTML = '';
    
    if (posts.length === 0) {
        postsList.innerHTML = '<div class="empty-message">No products available</div>';
        return;
    }

    posts.forEach(post => {
        const postEl = createPostElement(post);
        postsList.appendChild(postEl);
    });
}

function createPostElement(post) {
    const div = document.createElement('div');
    const isDeleted = Boolean(post.isDeleted);
    const parsedPrice = Number(post.price);
    const parsedViews = Number(post.views);
    const price = Number.isFinite(parsedPrice) ? parsedPrice : 0;
    const views = Number.isFinite(parsedViews) ? parsedViews : 0;
    div.className = `post-item ${isDeleted ? 'deleted' : ''}`;
    div.dataset.postId = post.id;

    const header = document.createElement('div');
    header.className = 'post-header';

    const titlePrice = document.createElement('div');
    titlePrice.innerHTML = `
        <div class="post-title">${escapeHtml(post.title || 'Untitled')}</div>
        <div class="post-price">Price: ${formatCurrency(price)} đ</div>
        <div class="post-views">Views: ${views}</div>
        ${isDeleted ? '<span class="post-deleted-badge">Deleted</span>' : ''}
    `;
    header.appendChild(titlePrice);

    const actions = document.createElement('div');
    actions.className = 'post-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editPost(post));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = isDeleted ? 'btn-restore' : 'btn-delete';
    deleteBtn.textContent = isDeleted ? 'Restore' : 'Delete';
    deleteBtn.addEventListener('click', () => {
        isDeleted ? restorePost(post.id) : softDeletePost(post.id);
    });

    const commentsBtn = document.createElement('button');
    commentsBtn.className = 'btn-comments';
    commentsBtn.textContent = 'Comments';
    commentsBtn.addEventListener('click', () => openComments(post));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(commentsBtn);

    div.appendChild(header);
    div.appendChild(actions);

    return div;
}

async function savePost() {
    const id = postIdInput.value;
    const title = postTitleInput.value.trim();
    const price = Number(postPriceInput.value);
    const views = Number(postViewsInput.value);

    if (!title || Number.isNaN(price) || Number.isNaN(views)) {
        alert('Please fill all fields');
        return;
    }

    try {
        if (id) {
            await fetch(`${API_BASE}/posts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, price, views })
            });
            submitBtn.textContent = 'Add Product';
        } else {
            const response = await fetch(`${API_BASE}/posts`);
            const posts = await response.json();
            const maxId = posts.length > 0 ? Math.max(...posts.map(p => parseInt(p.id))) : 0;
            const newId = String(maxId + 1);

            await fetch(`${API_BASE}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: newId, title, price, views, isDeleted: false })
            });
        }

        postForm.reset();
        postIdInput.value = '';
        loadPosts();
    } catch (error) {
        console.error('Error saving post:', error);
    }
}

async function editPost(post) {
    postIdInput.value = post.id;
    postTitleInput.value = post.title || '';
    postPriceInput.value = post.price ?? '';
    postViewsInput.value = post.views ?? '';
    submitBtn.textContent = 'Update Product';
    postTitleInput.focus();
}

async function softDeletePost(postId) {
    try {
        await fetch(`${API_BASE}/posts/${postId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDeleted: true })
        });
        loadPosts();
    } catch (error) {
        console.error('Error deleting post:', error);
    }
}

async function restorePost(postId) {
    try {
        await fetch(`${API_BASE}/posts/${postId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDeleted: false })
        });
        loadPosts();
    } catch (error) {
        console.error('Error restoring post:', error);
    }
}

async function openComments(post) {
    currentPostId = post.id;
    modalPostTitle.textContent = escapeHtml(post.title || 'Untitled');
    editingCommentId = null;
    commentText.value = '';
    addCommentBtn.textContent = 'Add Comment';
    await loadComments();
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
    currentPostId = null;
    editingCommentId = null;
}

async function loadComments() {
    try {
        const response = await fetch(`${API_BASE}/comments`);
        const comments = await response.json();
        const postComments = comments.filter(c => c.postId === currentPostId);
        renderComments(postComments);
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function renderComments(comments) {
    commentsList.innerHTML = '';

    if (comments.length === 0) {
        commentsList.innerHTML = '<div class="empty-message">No comments yet</div>';
        return;
    }

    comments.forEach(comment => {
        const commentEl = createCommentElement(comment);
        commentsList.appendChild(commentEl);
    });
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    const isDeleted = Boolean(comment.isDeleted);
    div.className = `comment-item ${isDeleted ? 'deleted' : ''}`;
    div.dataset.commentId = comment.id;

    const text = document.createElement('div');
    text.className = 'comment-text';
    text.textContent = escapeHtml(comment.text || '');

    const actions = document.createElement('div');
    actions.className = 'comment-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-comment-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editComment(comment));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = isDeleted ? 'btn-comment-restore' : 'btn-comment-delete';
    deleteBtn.textContent = isDeleted ? 'Restore' : 'Delete';
    deleteBtn.addEventListener('click', () => {
        isDeleted ? restoreComment(comment.id) : softDeleteComment(comment.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    div.appendChild(text);
    div.appendChild(actions);

    return div;
}

async function saveComment() {
    const text = commentText.value.trim();

    if (!text) {
        alert('Please enter a comment');
        return;
    }

    try {
        if (editingCommentId) {
            await fetch(`${API_BASE}/comments/${editingCommentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            editingCommentId = null;
            addCommentBtn.textContent = 'Add Comment';
        } else {
            const response = await fetch(`${API_BASE}/comments`);
            const comments = await response.json();
            const maxId = comments.length > 0 ? Math.max(...comments.map(c => parseInt(c.id))) : 0;
            const newId = String(maxId + 1);

            await fetch(`${API_BASE}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: newId, text, postId: currentPostId, isDeleted: false })
            });
        }

        commentText.value = '';
        loadComments();
    } catch (error) {
        console.error('Error saving comment:', error);
    }
}

async function editComment(comment) {
    editingCommentId = comment.id;
    commentText.value = comment.text || '';
    addCommentBtn.textContent = 'Update Comment';
    commentText.focus();
}

async function softDeleteComment(commentId) {
    try {
        await fetch(`${API_BASE}/comments/${commentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDeleted: true })
        });
        loadComments();
    } catch (error) {
        console.error('Error deleting comment:', error);
    }
}

async function restoreComment(commentId) {
    try {
        await fetch(`${API_BASE}/comments/${commentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDeleted: false })
        });
        loadComments();
    } catch (error) {
        console.error('Error restoring comment:', error);
    }
}

function formatCurrency(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString('vi-VN') : '0';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadPosts();
