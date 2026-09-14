/**
 * Book Swap Platform - Frontend Application Logic
 */

// Application State
const state = {
  currentUser: localStorage.getItem('bookswap_user') || 'Rahul',
  currentView: 'home',
  books: [],
  searchTimeout: null,
  activeModalBook: null
};

// Gradient palette for book covers
const COVER_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #3b82f6, #2dd4bf)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)'
];

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  updateUserDisplay();
  loadStats();
  fetchAndRenderHomeBooks();
  fetchAndRenderBooks();
  updateIncomingRequestBadge();
});

/* ===================================================
   USER IDENTITY MANAGEMENT
   =================================================== */

function setActiveUser(name) {
  state.currentUser = name;
  localStorage.setItem('bookswap_user', name);
  updateUserDisplay();
  showToast(`Active profile switched to "${name}"`, 'info');

  // Refresh view contents if in requests view
  if (state.currentView === 'requests') {
    fetchReceivedRequests();
    fetchSentRequests();
  }
  updateIncomingRequestBadge();
}

function setCustomActiveUser() {
  const input = document.getElementById('customUserInput');
  const name = input.value.trim();
  if (name) {
    setActiveUser(name);
    input.value = '';
    // Close dropdown
    const dropdownEl = document.getElementById('activeUserNameDisplay');
    const dropdown = bootstrap.Dropdown.getInstance(dropdownEl);
    if (dropdown) dropdown.hide();
  }
}

function updateUserDisplay() {
  const avatar = document.getElementById('currentUserAvatar');
  const nameDisplay = document.getElementById('activeUserNameDisplay');
  const dashboardUser = document.getElementById('requestsDashboardUser');

  if (avatar) avatar.textContent = state.currentUser.charAt(0).toUpperCase();
  if (nameDisplay) nameDisplay.textContent = state.currentUser;
  if (dashboardUser) dashboardUser.textContent = state.currentUser;

  // Pre-fill owner in post form
  const postOwnerInput = document.getElementById('postOwnerName');
  if (postOwnerInput && !postOwnerInput.value) {
    postOwnerInput.value = state.currentUser;
  }
}

/* ===================================================
   VIEW NAVIGATION
   =================================================== */

function navigateView(viewName) {
  state.currentView = viewName;

  // Update navbar links
  document.querySelectorAll('.nav-item-link').forEach(link => link.classList.remove('active'));
  const activeNavLink = document.getElementById(`nav-${viewName}`);
  if (activeNavLink) activeNavLink.classList.add('active');

  // Update views
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.add('d-none');
    view.classList.remove('active-view');
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.remove('d-none');
    targetView.classList.add('active-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Action based on view
  if (viewName === 'home') {
    loadStats();
    fetchAndRenderHomeBooks();
  } else if (viewName === 'browse') {
    fetchAndRenderBooks();
  } else if (viewName === 'requests') {
    fetchReceivedRequests();
    fetchSentRequests();
  }
}

/* ===================================================
   STATISTICS & COUNTERS
   =================================================== */

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success) {
      document.getElementById('statTotalBooks').textContent = json.data.totalBooks;
      document.getElementById('statAvailableBooks').textContent = json.data.availableBooks;
      document.getElementById('statTotalRequests').textContent = json.data.totalRequests;
      document.getElementById('statCompletedSwaps').textContent = json.data.swappedBooks;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function updateIncomingRequestBadge() {
  try {
    const res = await fetch(`/api/requests?owner_name=${encodeURIComponent(state.currentUser)}&status=Pending`);
    const json = await res.json();
    const navBadge = document.getElementById('navRequestBadge');
    if (json.success && json.count > 0) {
      navBadge.textContent = json.count;
      navBadge.classList.remove('d-none');
    } else {
      navBadge.classList.add('d-none');
    }
  } catch (e) {
    // Ignore silent badge failure
  }
}

/* ===================================================
   BOOK FETCHING & RENDERING (BROWSE & HOME)
   =================================================== */

function debounceSearch() {
  clearTimeout(state.searchTimeout);
  state.searchTimeout = setTimeout(() => {
    fetchAndRenderBooks();
  }, 300);
}

function handleHeroSearch(event) {
  event.preventDefault();
  const heroInput = document.getElementById('heroSearchInput').value.trim();
  const browseInput = document.getElementById('browseSearchInput');
  if (browseInput) browseInput.value = heroInput;
  navigateView('browse');
}

function resetBrowseFilters() {
  document.getElementById('browseSearchInput').value = '';
  document.getElementById('browseLanguageFilter').value = 'All';
  document.getElementById('browseConditionFilter').value = 'All';
  document.getElementById('browseStatusFilter').value = 'Available';
  fetchAndRenderBooks();
}

async function fetchAndRenderHomeBooks() {
  const container = document.getElementById('homeRecentBooksContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/books?status=Available');
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      const recent = json.data.slice(0, 3);
      container.innerHTML = recent.map((book, idx) => renderBookCardHTML(book, idx)).join('');
    } else {
      container.innerHTML = `
        <div class="col-12 text-center text-muted py-4">
          <p>No available books listed yet. Be the first to post a book!</p>
          <button class="btn btn-sm btn-outline-primary" onclick="navigateView('post')">Post a Book</button>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load recent books.</div>`;
  }
}

async function fetchAndRenderBooks() {
  const container = document.getElementById('booksGridContainer');
  const countLabel = document.getElementById('browseResultCount');
  if (!container) return;

  const search = document.getElementById('browseSearchInput')?.value || '';
  const language = document.getElementById('browseLanguageFilter')?.value || 'All';
  const condition = document.getElementById('browseConditionFilter')?.value || 'All';
  const status = document.getElementById('browseStatusFilter')?.value || 'Available';

  const params = new URLSearchParams();
  if (search.trim()) params.append('search', search.trim());
  if (language !== 'All') params.append('language', language);
  if (condition !== 'All') params.append('condition', condition);
  if (status !== 'All') params.append('status', status);

  try {
    const res = await fetch(`/api/books?${params.toString()}`);
    const json = await res.json();

    if (json.success) {
      state.books = json.data;
      if (countLabel) countLabel.textContent = `Showing ${json.data.length} book${json.data.length === 1 ? '' : 's'}`;

      if (json.data.length === 0) {
        container.innerHTML = `
          <div class="col-12">
            <div class="empty-state">
              <i class="bi bi-journal-x empty-state-icon"></i>
              <h4 class="fw-bold">No books found</h4>
              <p class="text-muted">Try adjusting your search keywords or clearing filters.</p>
              <button class="btn btn-primary-custom btn-sm px-3" onclick="resetBrowseFilters()">Reset Filters</button>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = json.data.map((book, idx) => renderBookCardHTML(book, idx)).join('');
    } else {
      container.innerHTML = `<div class="col-12 text-danger text-center py-5">Error: ${json.message}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-danger text-center py-5">Unable to connect to the server.</div>`;
  }
}

function renderBookCardHTML(book, index) {
  const gradient = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const isAvailable = book.status === 'Available';
  const isOwner = book.owner_name.toLowerCase() === state.currentUser.toLowerCase();

  return `
    <div class="col-md-6 col-lg-4">
      <div class="book-card">
        <div class="book-card-header d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <span class="badge ${isAvailable ? 'badge-available' : 'badge-swapped'}">
              <i class="bi ${isAvailable ? 'bi-check-circle' : 'bi-arrow-left-right'} me-1"></i> ${book.status}
            </span>
            <span class="badge bg-secondary-subtle text-secondary-emphasis">${escapeHTML(book.language)}</span>
          </div>
          <span class="badge bg-dark-subtle text-light border border-secondary-subtle">${escapeHTML(book.condition)}</span>
        </div>

        <div class="book-card-body">
          <div class="d-flex gap-3 align-items-start mb-3">
            <div class="book-cover-accent shadow-sm" style="background: ${gradient};">
              <i class="bi bi-book text-white"></i>
            </div>
            <div>
              <h4 class="book-title">${escapeHTML(book.title)}</h4>
              <p class="book-author"><i class="bi bi-feather me-1"></i> ${escapeHTML(book.author)}</p>
            </div>
          </div>

          <div class="p-2 rounded-3 bg-dark-subtle border border-secondary-subtle small mb-2">
            <div class="d-flex justify-content-between text-muted">
              <span>Owner: <strong class="text-white">${escapeHTML(book.owner_name)}</strong> ${isOwner ? '<span class="badge bg-primary-subtle text-primary ms-1">You</span>' : ''}</span>
              ${book.request_count > 0 ? `<span class="text-warning"><i class="bi bi-bell-fill"></i> ${book.request_count} request${book.request_count > 1 ? 's' : ''}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="book-card-footer d-flex gap-2">
          ${
            isAvailable
              ? isOwner
                ? `<button class="btn btn-outline-secondary w-100 btn-sm disabled" title="You own this book">
                     <i class="bi bi-person-check me-1"></i> Your Listing
                   </button>`
                : `<button class="btn btn-gradient-primary w-100 btn-sm fw-semibold" onclick="openSwapRequestModal(${book.id})">
                     <i class="bi bi-arrow-left-right me-1"></i> Request Swap
                   </button>`
              : `<button class="btn btn-secondary w-100 btn-sm disabled" disabled>
                   <i class="bi bi-check2-all me-1"></i> Swapped
                 </button>`
          }
          <button class="btn btn-outline-secondary btn-sm px-3" title="View details" onclick="viewBookDetails(${book.id})">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ===================================================
   MODAL: REQUEST SWAP
   =================================================== */

async function openSwapRequestModal(bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}`);
    const json = await res.json();
    if (!json.success) {
      showToast(json.message, 'danger');
      return;
    }

    const book = json.data;
    state.activeModalBook = book;

    document.getElementById('modalBookId').value = book.id;
    document.getElementById('modalBookTitle').textContent = book.title;
    document.getElementById('modalBookAuthor').textContent = `By ${book.author}`;
    document.getElementById('modalBookOwner').textContent = book.owner_name;

    // Pre-fill requester info
    document.getElementById('modalRequesterName').value = state.currentUser;
    document.getElementById('modalRequesterContact').value = `${state.currentUser.toLowerCase()}@reader.com`;
    document.getElementById('modalMessage').value = '';

    const modal = new bootstrap.Modal(document.getElementById('requestSwapModal'));
    modal.show();
  } catch (err) {
    showToast('Failed to load book details for swap', 'danger');
  }
}

async function handleSwapRequestSubmit(event) {
  event.preventDefault();

  const bookId = document.getElementById('modalBookId').value;
  const requesterName = document.getElementById('modalRequesterName').value.trim();
  const requesterContact = document.getElementById('modalRequesterContact').value.trim();
  const message = document.getElementById('modalMessage').value.trim();
  const btn = document.getElementById('submitRequestBtn');

  if (!requesterName || !message) {
    showToast('Please provide your name and swap offer message.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Submitting...`;

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        requester_name: requesterName,
        requester_contact: requesterContact,
        message: message
      })
    });

    const json = await res.json();
    if (json.success) {
      // Close modal
      const modalEl = document.getElementById('requestSwapModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      showToast(`Swap request sent to ${state.activeModalBook ? state.activeModalBook.owner_name : 'the owner'}!`, 'success');
      loadStats();
      fetchAndRenderBooks();
      updateIncomingRequestBadge();
    } else {
      showToast(json.message || 'Could not submit swap request.', 'danger');
    }
  } catch (err) {
    showToast('Error submitting request. Please try again.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-send me-1"></i> Send Swap Request`;
  }
}

/* ===================================================
   MODAL: VIEW BOOK DETAILS
   =================================================== */

async function viewBookDetails(bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}`);
    const json = await res.json();
    if (!json.success) {
      showToast('Book details not found', 'danger');
      return;
    }

    const book = json.data;
    const content = document.getElementById('detailModalContent');
    const isAvailable = book.status === 'Available';
    const isOwner = book.owner_name.toLowerCase() === state.currentUser.toLowerCase();

    content.innerHTML = `
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h4 class="fw-bold mb-0">${escapeHTML(book.title)}</h4>
          <span class="badge ${isAvailable ? 'badge-available' : 'badge-swapped'}">${book.status}</span>
        </div>
        <p class="text-muted"><i class="bi bi-feather me-1"></i> Author: <strong>${escapeHTML(book.author)}</strong></p>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6">
          <div class="p-2 rounded bg-dark-subtle border border-secondary-subtle">
            <span class="text-muted small d-block">Language</span>
            <strong>${escapeHTML(book.language)}</strong>
          </div>
        </div>
        <div class="col-6">
          <div class="p-2 rounded bg-dark-subtle border border-secondary-subtle">
            <span class="text-muted small d-block">Condition</span>
            <strong>${escapeHTML(book.condition)}</strong>
          </div>
        </div>
      </div>

      <div class="p-3 rounded-3 bg-dark-subtle border border-secondary-subtle mb-4">
        <h6 class="fw-bold text-primary mb-1"><i class="bi bi-person-circle me-1"></i> Book Owner</h6>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">${escapeHTML(book.owner_name)}</div>
            <div class="text-muted small">${book.owner_contact ? escapeHTML(book.owner_contact) : 'Contact shared on swap agreement'}</div>
          </div>
          ${isOwner ? '<span class="badge bg-primary">You are the Owner</span>' : ''}
        </div>
      </div>

      ${
        book.swap_requests && book.swap_requests.length > 0
          ? `
            <div>
              <h6 class="fw-bold mb-2"><i class="bi bi-clock-history me-1"></i> Existing Requests (${book.swap_requests.length})</h6>
              <div class="list-group list-group-flush">
                ${book.swap_requests.map(r => `
                  <div class="list-group-item bg-transparent text-white px-0 py-2 border-secondary-subtle">
                    <div class="d-flex justify-content-between">
                      <strong>${escapeHTML(r.requester_name)}</strong>
                      <span class="badge badge-${r.status.toLowerCase()}">${r.status}</span>
                    </div>
                    <p class="small text-muted mb-0">"${escapeHTML(r.message)}"</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `
          : `<p class="small text-muted mb-0"><i class="bi bi-info-circle me-1"></i> No swap requests for this book yet.</p>`
      }

      <div class="mt-4 pt-3 border-top border-secondary-subtle d-flex gap-2 justify-content-end">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
        ${
          isAvailable && !isOwner
            ? `<button class="btn btn-gradient-primary" onclick="bootstrap.Modal.getInstance(document.getElementById('bookDetailsModal')).hide(); openSwapRequestModal(${book.id})">
                <i class="bi bi-arrow-left-right me-1"></i> Request Swap
              </button>`
            : ''
        }
      </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('bookDetailsModal'));
    modal.show();
  } catch (err) {
    showToast('Failed to load book details', 'danger');
  }
}

/* ===================================================
   POST A BOOK
   =================================================== */

async function handlePostBookSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('postTitle').value.trim();
  const author = document.getElementById('postAuthor').value.trim();
  const language = document.getElementById('postLanguage').value;
  const condition = document.getElementById('postCondition').value;
  const owner_name = document.getElementById('postOwnerName').value.trim();
  const owner_contact = document.getElementById('postOwnerContact').value.trim();
  const btn = document.getElementById('postBookBtn');

  if (!title || !author || !owner_name) {
    showToast('Please fill in all required fields (Title, Author, Owner Name).', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Posting...`;

  try {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        author,
        language,
        condition,
        owner_name,
        owner_contact
      })
    });

    const json = await res.json();
    if (json.success) {
      showToast(`🎉 "${title}" posted successfully for exchange!`, 'success');
      document.getElementById('postBookForm').reset();
      setActiveUser(owner_name);
      loadStats();
      navigateView('browse');
    } else {
      showToast(json.message || 'Failed to post book', 'danger');
    }
  } catch (err) {
    showToast('Network error while posting book.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-check-circle me-2"></i> Post Book for Swap`;
  }
}

/* ===================================================
   MY REQUESTS DASHBOARD
   =================================================== */

async function fetchReceivedRequests() {
  const container = document.getElementById('receivedRequestsContainer');
  const countBadge = document.getElementById('receivedCountBadge');
  if (!container) return;

  try {
    const res = await fetch(`/api/requests?owner_name=${encodeURIComponent(state.currentUser)}`);
    const json = await res.json();

    if (json.success) {
      if (countBadge) countBadge.textContent = json.data.length;

      if (json.data.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-inbox empty-state-icon"></i>
            <h4 class="fw-bold">No Incoming Swap Requests</h4>
            <p class="text-muted">When other readers request to swap books you posted (${escapeHTML(state.currentUser)}), they'll appear here.</p>
            <button class="btn btn-gradient-primary btn-sm px-3" onclick="navigateView('post')">Post a Book</button>
          </div>
        `;
        return;
      }

      container.innerHTML = json.data.map(req => renderReceivedRequestHTML(req)).join('');
    } else {
      container.innerHTML = `<div class="text-danger py-4 text-center">${json.message}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div class="text-danger py-4 text-center">Failed to load received requests.</div>`;
  }
}

function renderReceivedRequestHTML(req) {
  const isPending = req.status === 'Pending';
  const isAccepted = req.status === 'Accepted';

  return `
    <div class="request-card shadow-sm">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="badge badge-${req.status.toLowerCase()}">${req.status}</span>
            <span class="text-muted small"><i class="bi bi-clock me-1"></i> ${new Date(req.created_at).toLocaleDateString()}</span>
          </div>
          <h4 class="fw-bold mb-1">Book: ${escapeHTML(req.book_title)}</h4>
          <p class="text-muted small mb-0">By ${escapeHTML(req.book_author)}</p>
        </div>

        <div class="text-end">
          <span class="small text-muted d-block">Requested by</span>
          <div class="d-flex align-items-center gap-2 justify-content-end">
            <div class="avatar-circle-sm bg-primary text-white fw-bold">${escapeHTML(req.requester_name.charAt(0).toUpperCase())}</div>
            <strong class="text-white">${escapeHTML(req.requester_name)}</strong>
          </div>
          ${req.requester_contact ? `<div class="text-muted small"><i class="bi bi-envelope me-1"></i> ${escapeHTML(req.requester_contact)}</div>` : ''}
        </div>
      </div>

      <div class="request-message-bubble mb-3">
        <span class="small text-muted d-block mb-1">Swap Proposal / Offered Exchange:</span>
        "${escapeHTML(req.message)}"
      </div>

      ${
        isPending
          ? `
            <div class="d-flex gap-2 justify-content-end pt-2 border-top border-secondary-subtle">
              <button class="btn btn-outline-danger btn-sm px-3" onclick="updateRequestStatus(${req.id}, 'Rejected')">
                <i class="bi bi-x-circle me-1"></i> Decline
              </button>
              <button class="btn btn-success btn-sm px-4 fw-bold" onclick="updateRequestStatus(${req.id}, 'Accepted')">
                <i class="bi bi-check-circle me-1"></i> Accept Swap Offer
              </button>
            </div>
          `
          : `
            <div class="pt-2 border-top border-secondary-subtle d-flex justify-content-between align-items-center">
              <span class="small text-muted">Status finalized</span>
              <span class="badge ${isAccepted ? 'bg-success' : 'bg-danger'}">${req.status}</span>
            </div>
          `
      }
    </div>
  `;
}

async function fetchSentRequests() {
  const container = document.getElementById('sentRequestsContainer');
  const countBadge = document.getElementById('sentCountBadge');
  if (!container) return;

  try {
    const res = await fetch(`/api/requests?requester_name=${encodeURIComponent(state.currentUser)}`);
    const json = await res.json();

    if (json.success) {
      if (countBadge) countBadge.textContent = json.data.length;

      if (json.data.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-send empty-state-icon"></i>
            <h4 class="fw-bold">No Swap Requests Sent</h4>
            <p class="text-muted">You haven't requested any books yet. Browse the catalog to find books you want to read!</p>
            <button class="btn btn-primary-custom btn-sm px-3" onclick="navigateView('browse')">Browse Books</button>
          </div>
        `;
        return;
      }

      container.innerHTML = json.data.map(req => renderSentRequestHTML(req)).join('');
    } else {
      container.innerHTML = `<div class="text-danger py-4 text-center">${json.message}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div class="text-danger py-4 text-center">Failed to load sent requests.</div>`;
  }
}

function renderSentRequestHTML(req) {
  const isPending = req.status === 'Pending';
  return `
    <div class="request-card shadow-sm">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="badge badge-${req.status.toLowerCase()}">${req.status}</span>
            <span class="text-muted small"><i class="bi bi-clock me-1"></i> ${new Date(req.created_at).toLocaleDateString()}</span>
          </div>
          <h4 class="fw-bold mb-1">${escapeHTML(req.book_title)}</h4>
          <p class="text-muted small mb-0">By ${escapeHTML(req.book_author)}</p>
        </div>

        <div class="text-end">
          <span class="small text-muted d-block">Book Owner</span>
          <strong class="text-white"><i class="bi bi-person me-1"></i> ${escapeHTML(req.book_owner)}</strong>
          ${req.book_owner_contact ? `<div class="text-muted small">${escapeHTML(req.book_owner_contact)}</div>` : ''}
        </div>
      </div>

      <div class="request-message-bubble mb-3">
        <span class="small text-muted d-block mb-1">Your Proposed Swap:</span>
        "${escapeHTML(req.message)}"
      </div>

      ${
        isPending
          ? `
            <div class="d-flex justify-content-end pt-2 border-top border-secondary-subtle">
              <button class="btn btn-outline-secondary btn-sm" onclick="cancelSwapRequest(${req.id})">
                <i class="bi bi-trash me-1"></i> Cancel Request
              </button>
            </div>
          `
          : ''
      }
    </div>
  `;
}

async function updateRequestStatus(requestId, newStatus) {
  try {
    const res = await fetch(`/api/requests/${requestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const json = await res.json();
    if (json.success) {
      showToast(`Request marked as "${newStatus}"!`, newStatus === 'Accepted' ? 'success' : 'info');
      fetchReceivedRequests();
      updateIncomingRequestBadge();
      loadStats();
    } else {
      showToast(json.message || 'Failed to update request', 'danger');
    }
  } catch (err) {
    showToast('Error communicating with server', 'danger');
  }
}

async function cancelSwapRequest(requestId) {
  if (!confirm('Are you sure you want to cancel this swap request?')) return;

  try {
    const res = await fetch(`/api/requests/${requestId}`, {
      method: 'DELETE'
    });

    const json = await res.json();
    if (json.success) {
      showToast('Swap request cancelled.', 'info');
      fetchSentRequests();
      loadStats();
    } else {
      showToast(json.message || 'Failed to cancel request', 'danger');
    }
  } catch (err) {
    showToast('Error cancelling request', 'danger');
  }
}

/* ===================================================
   UTILITY HELPERS
   =================================================== */

function showToast(message, type = 'info') {
  const toastEl = document.getElementById('appToast');
  const toastMsg = document.getElementById('toastMessage');
  if (!toastEl || !toastMsg) return;

  // Set color class
  toastEl.className = 'toast align-items-center text-white border-0 shadow-lg';
  if (type === 'success') {
    toastEl.classList.add('bg-success');
    toastMsg.innerHTML = `<i class="bi bi-check-circle-fill fs-5"></i> <span>${escapeHTML(message)}</span>`;
  } else if (type === 'danger') {
    toastEl.classList.add('bg-danger');
    toastMsg.innerHTML = `<i class="bi bi-exclamation-triangle-fill fs-5"></i> <span>${escapeHTML(message)}</span>`;
  } else if (type === 'warning') {
    toastEl.classList.add('bg-warning', 'text-dark');
    toastMsg.innerHTML = `<i class="bi bi-exclamation-circle-fill fs-5"></i> <span>${escapeHTML(message)}</span>`;
  } else {
    toastEl.classList.add('bg-primary');
    toastMsg.innerHTML = `<i class="bi bi-info-circle-fill fs-5"></i> <span>${escapeHTML(message)}</span>`;
  }

  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
