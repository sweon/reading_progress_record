import html2canvas from 'html2canvas';
import Chart from 'chart.js/auto';

// DOM Elements
const bookSelect = document.getElementById('bookSelect');
const deleteBookBtn = document.getElementById('deleteBookBtn');
const newBookTitle = document.getElementById('newBookTitle');
const newBookTotal = document.getElementById('newBookTotal');
const newBookDate = document.getElementById('newBookDate');
const addBookBtn = document.getElementById('addBookBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

const currentPageInput = document.getElementById('currentPage');
const updatePageBtn = document.getElementById('updatePageBtn');
const pageDisplay = document.getElementById('pageDisplay');
const currentDateEl = document.getElementById('currentDate');
const currentTimeEl = document.getElementById('currentTime');
const cardBookTitle = document.getElementById('cardBookTitle');
const cardStartDate = document.getElementById('cardStartDate');
const cardLastRead = document.getElementById('cardLastRead');
const congratsMessage = document.getElementById('congratsMessage');
const downloadBtn = document.getElementById('downloadBtn');
const captureCard = document.getElementById('capture-card');
const progressChartCanvas = document.getElementById('progressChart');

// Delete Modal Elements
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Import Modal Elements
const importModal = document.getElementById('importModal');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const confirmImportBtn = document.getElementById('confirmImportBtn');

// Settings Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const githubTokenInput = document.getElementById('githubToken');
const syncUploadBtn = document.getElementById('syncUploadBtn');
const syncDownloadBtn = document.getElementById('syncDownloadBtn');
const syncStatus = document.getElementById('syncStatus');

// State
let books = JSON.parse(localStorage.getItem('books')) || [];
let selectedBookId = localStorage.getItem('selectedBookId') || null;
let chartInstance = null;
const GIST_FILENAME = 'reading-progress-data.json';

// Functions
function saveState() {
  localStorage.setItem('books', JSON.stringify(books));
  if (selectedBookId) {
    localStorage.setItem('selectedBookId', selectedBookId);
  } else {
    localStorage.removeItem('selectedBookId');
  }
}

function renderBookList() {
  bookSelect.innerHTML = '<option value="" disabled>Select a book...</option>';
  books.forEach(book => {
    const option = document.createElement('option');
    option.value = book.id;
    option.textContent = book.title;
    if (book.id === selectedBookId) {
      option.selected = true;
    }
    // Check for completion
    if (book.totalPages > 0 && book.currentPage >= book.totalPages) {
      option.classList.add('book-completed');
    }
    bookSelect.appendChild(option);
  });

  if (!selectedBookId) {
    bookSelect.value = "";
  }

  // Update delete button state
  deleteBookBtn.disabled = !selectedBookId;
  deleteBookBtn.style.opacity = selectedBookId ? '1' : '0.5';
  deleteBookBtn.style.cursor = selectedBookId ? 'pointer' : 'not-allowed';
}

function updateProgressUI(current, total) {
  // Clamp current page
  const safeCurrent = Math.min(Math.max(current, 0), total);

  // Calculate percentage
  let percentage = 0;
  if (total > 0) {
    percentage = Math.round((safeCurrent / total) * 100);
  }

  // Update text with percentage
  pageDisplay.textContent = `${safeCurrent} / ${total} (${percentage}%)`;

  // Show/Hide Congratulatory Message
  if (total > 0 && safeCurrent >= total) {
    congratsMessage.classList.remove('hidden');
  } else {
    congratsMessage.classList.add('hidden');
  }
}

function renderChart(book) {
  if (chartInstance) {
    chartInstance.destroy();
  }

  if (!book || !book.history || book.history.length === 0) {
    // Render empty or placeholder if no data
    return;
  }

  // Sort history by date just in case
  const sortedHistory = [...book.history].sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = sortedHistory.map(h => h.date);
  const data = sortedHistory.map(h => h.page);

  chartInstance = new Chart(progressChartCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Pages Read',
        data: data,
        borderColor: '#0071e3',
        backgroundColor: 'rgba(0, 113, 227, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: book.totalPages || undefined,
          grid: {
            color: '#f0f0f0'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function loadSelectedBook() {
  const book = books.find(b => b.id === selectedBookId);
  if (book) {
    // Initialize history if missing
    if (!book.history) {
      book.history = [];
      // Add start date entry if not present
      if (book.startDate) {
        book.history.push({ date: book.startDate, page: 0 });
      }
      // Add current state if different from start
      const today = getTodayString();
      if (book.startDate !== today && book.currentPage > 0) {
        book.history.push({ date: today, page: book.currentPage });
      }
      saveState();
    }

    currentPageInput.value = book.currentPage;
    cardBookTitle.textContent = book.title;
    cardStartDate.textContent = book.startDate || '-';
    cardLastRead.textContent = book.lastReadDate || '-';
    updateProgressUI(book.currentPage, book.totalPages);
    renderChart(book);
  } else {
    currentPageInput.value = '';
    cardBookTitle.textContent = 'Book Title';
    cardStartDate.textContent = '-';
    cardLastRead.textContent = '-';
    updateProgressUI(0, 0);
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  // Update delete button visibility/state
  renderBookList();
}

function handleAddBook() {
  const title = newBookTitle.value.trim();
  const total = parseInt(newBookTotal.value);
  const date = newBookDate.value;

  if (!title || !total || !date) {
    alert('Please fill in all fields');
    return;
  }

  const newBook = {
    id: Date.now().toString(),
    title,
    totalPages: total,
    startDate: date,
    currentPage: 0,
    lastReadDate: null,
    history: [
      { date: date, page: 0 }
    ]
  };

  books.push(newBook);
  selectedBookId = newBook.id;
  saveState();
  renderBookList();
  loadSelectedBook();

  // Reset form
  newBookTitle.value = '';
  newBookTotal.value = '';
  newBookDate.value = '';

  // Close details
  document.querySelector('details').removeAttribute('open');
}

function showDeleteModal() {
  deleteModal.classList.remove('hidden');
}

function hideDeleteModal() {
  deleteModal.classList.add('hidden');
}

function confirmDelete() {
  if (!selectedBookId) return;

  books = books.filter(b => b.id !== selectedBookId);
  selectedBookId = books.length > 0 ? books[books.length - 1].id : null;
  saveState();
  renderBookList();
  loadSelectedBook();
  hideDeleteModal();
}

function showImportModal() {
  importModal.classList.remove('hidden');
}

function hideImportModal() {
  importModal.classList.add('hidden');
}

function confirmImport() {
  hideImportModal();
  importFile.click();
}

function handleInputUpdate() {
  if (!selectedBookId) return;

  const book = books.find(b => b.id === selectedBookId);
  if (!book) return;

  const current = parseInt(currentPageInput.value) || 0;

  // Update book state
  book.currentPage = current;

  // Update History
  const today = getTodayString();
  if (!book.history) book.history = [];

  const todayEntryIndex = book.history.findIndex(h => h.date === today);
  if (todayEntryIndex >= 0) {
    book.history[todayEntryIndex].page = current;
  } else {
    book.history.push({ date: today, page: current });
  }

  // Sort history to keep chart correct
  book.history.sort((a, b) => new Date(a.date) - new Date(b.date));

  saveState();

  updateProgressUI(current, book.totalPages);
  renderChart(book);

  // Re-render list to update green status if completed
  renderBookList();
}

function updateTime() {
  const now = new Date();

  // Format Date: YYYY.MM.DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  currentDateEl.textContent = `${year}.${month}.${day}`;

  // Format Time: HH:mm
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  currentTimeEl.textContent = `${hours}:${minutes}`;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Export Data
async function handleExport() {
  const data = {
    books,
    selectedBookId
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = `reading-progress-backup-${getTodayString()}.json`;

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('File System Access API failed, falling back to download:', err);
    }
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
}

// Import Data
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data.books)) {
        books = data.books;
        selectedBookId = data.selectedBookId || null;
        saveState();
        renderBookList();
        loadSelectedBook();
        alert('Data imported successfully!');
      } else {
        alert('Invalid data format.');
      }
    } catch (err) {
      console.error('Error importing data:', err);
      alert('Failed to import data. Please ensure the file is valid JSON.');
    }
    // Reset input
    importFile.value = '';
  };
  reader.readAsText(file);
}

// --- GitHub Gist Sync Logic ---

function showSettingsModal() {
  settingsModal.classList.remove('hidden');
  githubTokenInput.value = localStorage.getItem('githubToken') || '';
  syncStatus.textContent = '';
  syncStatus.className = 'sync-status';
}

function hideSettingsModal() {
  settingsModal.classList.add('hidden');
  // Save token on close
  localStorage.setItem('githubToken', githubTokenInput.value.trim());
}

function setSyncStatus(message, type) {
  syncStatus.textContent = message;
  syncStatus.className = `sync-status ${type}`;
}

async function getGistId(token) {
  try {
    const response = await fetch('https://api.github.com/gists', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch gists');

    const gists = await response.json();
    const targetGist = gists.find(gist => gist.files[GIST_FILENAME]);
    return targetGist ? targetGist.id : null;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function createGist(token, content) {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: 'Reading Progress Data',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: content
        }
      }
    })
  });

  if (!response.ok) throw new Error('Failed to create gist');
}

async function updateGist(token, gistId, content) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: content
        }
      }
    })
  });

  if (!response.ok) throw new Error('Failed to update gist');
}

async function handleSyncUpload() {
  const token = githubTokenInput.value.trim();
  if (!token) {
    setSyncStatus('Please enter a GitHub Token.', 'error');
    return;
  }

  setSyncStatus('Uploading...', '');

  try {
    const data = {
      books,
      selectedBookId,
      lastUpdated: new Date().toISOString()
    };
    const content = JSON.stringify(data, null, 2);

    let gistId = await getGistId(token);

    if (gistId) {
      await updateGist(token, gistId, content);
    } else {
      await createGist(token, content);
    }

    setSyncStatus('Upload successful!', 'success');
    localStorage.setItem('githubToken', token);
  } catch (err) {
    setSyncStatus('Upload failed. Check console/token.', 'error');
    console.error(err);
  }
}

async function handleSyncDownload() {
  const token = githubTokenInput.value.trim();
  if (!token) {
    setSyncStatus('Please enter a GitHub Token.', 'error');
    return;
  }

  setSyncStatus('Downloading...', '');

  try {
    const gistId = await getGistId(token);

    if (!gistId) {
      setSyncStatus('No data found on GitHub.', 'error');
      return;
    }

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch gist');

    const gist = await response.json();
    const file = gist.files[GIST_FILENAME];

    if (!file || !file.content) {
      setSyncStatus('Gist file is empty.', 'error');
      return;
    }

    const data = JSON.parse(file.content);

    if (Array.isArray(data.books)) {
      books = data.books;
      selectedBookId = data.selectedBookId || null;
      saveState();
      renderBookList();
      loadSelectedBook();
      setSyncStatus('Download successful!', 'success');
      localStorage.setItem('githubToken', token);
    } else {
      setSyncStatus('Invalid data format.', 'error');
    }

  } catch (err) {
    setSyncStatus('Download failed. Check console/token.', 'error');
    console.error(err);
  }
}

// Event Listeners
addBookBtn.addEventListener('click', handleAddBook);

deleteBookBtn.addEventListener('click', () => {
  if (selectedBookId) {
    showDeleteModal();
  }
});

cancelDeleteBtn.addEventListener('click', hideDeleteModal);
confirmDeleteBtn.addEventListener('click', confirmDelete);

// Close modal when clicking outside
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    hideDeleteModal();
  }
});

importBtn.addEventListener('click', showImportModal);
cancelImportBtn.addEventListener('click', hideImportModal);
confirmImportBtn.addEventListener('click', confirmImport);

// Close import modal when clicking outside
importModal.addEventListener('click', (e) => {
  if (e.target === importModal) {
    hideImportModal();
  }
});

bookSelect.addEventListener('change', (e) => {
  selectedBookId = e.target.value;
  saveState();
  loadSelectedBook();
});

// Manual Update Listeners
updatePageBtn.addEventListener('click', handleInputUpdate);
currentPageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleInputUpdate();
  }
});

exportBtn.addEventListener('click', handleExport);
importFile.addEventListener('change', handleFileSelect);

// Settings Listeners
settingsBtn.addEventListener('click', showSettingsModal);
closeSettingsBtn.addEventListener('click', hideSettingsModal);
syncUploadBtn.addEventListener('click', handleSyncUpload);
syncDownloadBtn.addEventListener('click', handleSyncDownload);

// Close settings modal when clicking outside
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    hideSettingsModal();
  }
});

// Download Logic
downloadBtn.addEventListener('click', async () => {
  if (!captureCard) return;

  // Update Last Read Date before capturing
  if (selectedBookId) {
    const book = books.find(b => b.id === selectedBookId);
    if (book) {
      book.lastReadDate = getTodayString();
      cardLastRead.textContent = book.lastReadDate;
      saveState();
    }
  }

  // Wait a moment for DOM to update
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    const canvas = await html2canvas(captureCard, {
      scale: 2,
      backgroundColor: null,
      logging: false,
      useCORS: true
    });

    const filename = `reading-progress-${Date.now()}.png`;

    if ('showSaveFilePicker' in window) {
      try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'PNG Image',
            accept: { 'image/png': ['.png'] },
          }],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('File System Access API failed, falling back to download:', err);
      }
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
  } catch (err) {
    console.error('Error generating image:', err);
    alert('Failed to generate image. Please try again.');
  }
});

// Initial update
updateTime();
setInterval(updateTime, 60000);
renderBookList();
loadSelectedBook();
