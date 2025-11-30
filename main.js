import html2canvas from 'html2canvas';

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

const totalPagesInput = document.getElementById('totalPages');
const currentPageInput = document.getElementById('currentPage');
const progressPath = document.getElementById('progressPath');
const percentageText = document.getElementById('percentageText');
const pageDisplay = document.getElementById('pageDisplay');
const currentDateEl = document.getElementById('currentDate');
const currentTimeEl = document.getElementById('currentTime');
const cardBookTitle = document.getElementById('cardBookTitle');
const cardStartDate = document.getElementById('cardStartDate');
const cardLastRead = document.getElementById('cardLastRead');
const congratsMessage = document.getElementById('congratsMessage');
const downloadBtn = document.getElementById('downloadBtn');
const captureCard = document.getElementById('capture-card');

// Delete Modal Elements
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Import Modal Elements
const importModal = document.getElementById('importModal');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const confirmImportBtn = document.getElementById('confirmImportBtn');

// State
let books = JSON.parse(localStorage.getItem('books')) || [];
let selectedBookId = localStorage.getItem('selectedBookId') || null;

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

  // Update text
  pageDisplay.textContent = `${safeCurrent} / ${total}`;

  // Calculate percentage
  let percentage = 0;
  if (total > 0) {
    percentage = (safeCurrent / total) * 100;
  }

  // Update percentage text
  percentageText.textContent = `${Math.round(percentage)}%`;

  // Update circle stroke
  progressPath.setAttribute('stroke-dasharray', `${percentage}, 100`);

  // Show/Hide Congratulatory Message
  if (total > 0 && safeCurrent >= total) {
    congratsMessage.classList.remove('hidden');
  } else {
    congratsMessage.classList.add('hidden');
  }
}

function loadSelectedBook() {
  const book = books.find(b => b.id === selectedBookId);
  if (book) {
    totalPagesInput.value = book.totalPages;
    currentPageInput.value = book.currentPage;
    cardBookTitle.textContent = book.title;
    cardStartDate.textContent = book.startDate || '-';
    cardLastRead.textContent = book.lastReadDate || '-';
    updateProgressUI(book.currentPage, book.totalPages);
  } else {
    totalPagesInput.value = '';
    currentPageInput.value = '';
    cardBookTitle.textContent = 'Book Title';
    cardStartDate.textContent = '-';
    cardLastRead.textContent = '-';
    updateProgressUI(0, 0);
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
    lastReadDate: null
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

  const total = parseInt(totalPagesInput.value) || 0;
  const current = parseInt(currentPageInput.value) || 0;

  // Update book state
  book.totalPages = total;
  book.currentPage = current;
  saveState();

  updateProgressUI(current, total);

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

totalPagesInput.addEventListener('input', handleInputUpdate);
currentPageInput.addEventListener('input', handleInputUpdate);

exportBtn.addEventListener('click', handleExport);
importFile.addEventListener('change', handleFileSelect);

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
    link.href = canvas.toDataURL('image/png');
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
