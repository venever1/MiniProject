// Mini Kanban Board — script.js

// ============================================================
// DATA LAYER
// ============================================================

/**
 * Membaca daftar tugas dari localStorage.
 * @returns {Array} Array of task objects, atau [] jika tidak ada data atau terjadi error.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem("kanban-tasks");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Gagal memuat data tersimpan. Memulai dengan board kosong.", e);
    return [];
  }
}

/**
 * Menyimpan daftar tugas ke localStorage.
 * @param {Array} tasks - Array of task objects yang akan disimpan.
 */
function saveTasks(tasks) {
  try {
    localStorage.setItem("kanban-tasks", JSON.stringify(tasks));
  } catch (e) {
    // QuotaExceededError atau SecurityError
    showErrorBanner("Gagal menyimpan data. localStorage tidak tersedia atau penuh.");
  }
}

/**
 * Menampilkan banner error di bagian atas halaman, lalu menyembunyikannya secara otomatis.
 * @param {string} message - Pesan error yang akan ditampilkan.
 */
function showErrorBanner(message) {
  let banner = document.getElementById("error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "error-banner";
    banner.className = "fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-sm font-medium";
    document.body.appendChild(banner);
  }
  banner.textContent = message;
  banner.classList.remove("hidden");
  // Auto-hide setelah 5 detik
  clearTimeout(banner._hideTimeout);
  banner._hideTimeout = setTimeout(() => {
    banner.classList.add("hidden");
  }, 5000);
}

// ============================================================
// LOGIC LAYER
// ============================================================

/**
 * Memvalidasi judul tugas.
 * @param {string} title - Judul yang akan divalidasi.
 * @returns {boolean} true jika title tidak kosong setelah di-trim, false jika tidak.
 */
function validateInput(title) {
  return title.trim().length > 0;
}

/**
 * Menambahkan tugas baru ke board.
 * @param {string} title - Judul tugas yang akan ditambahkan.
 */
function addTask(title) {
  const task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    status: "todo",
    createdAt: Date.now(),
  };
  tasks.push(task);
  saveTasks(tasks);
  renderBoard();
}

/**
 * Memindahkan task ke status berikutnya atau sebelumnya.
 * @param {string} id - ID task yang akan dipindahkan.
 * @param {"next"|"prev"} direction - Arah perpindahan status.
 */
function moveTask(id, direction) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const transitions = {
    next: { "todo": "in-progress", "in-progress": "done" },
    prev: { "in-progress": "todo", "done": "in-progress" },
  };

  const newStatus = transitions[direction]?.[task.status];
  if (!newStatus) return;

  task.status = newStatus;
  saveTasks(tasks);
  renderBoard();
}

/**
 * Menghapus task berdasarkan ID setelah konfirmasi pengguna.
 * @param {string} id - ID task yang akan dihapus.
 */
function deleteTask(id) {
  const confirmed = window.confirm("Hapus tugas ini? Tindakan tidak dapat dibatalkan.");
  if (!confirmed) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  renderBoard();
}

// ============================================================
// STATE
// ============================================================

/** Single source of truth — daftar semua tugas di memori. */
let tasks = [];

// ============================================================
// VIEW LAYER
// ============================================================

/**
 * Membuat elemen DOM kartu untuk satu task.
 * @param {Object} task - Objek task dengan properti id, title, status, createdAt.
 * @returns {HTMLElement} Elemen div kartu yang sudah dibuat.
 */
function createCardElement(task) {
  // Mapping warna border berdasarkan status
  const borderColorMap = {
    "todo": "border-gray-400",
    "in-progress": "border-yellow-400",
    "done": "border-green-400",
  };
  const borderColor = borderColorMap[task.status] || "border-gray-400";

  // Elemen kartu utama
  const card = document.createElement("div");
  card.className = `bg-white rounded border-l-4 p-3 mb-2 shadow-sm ${borderColor}`;

  // Judul task
  const title = document.createElement("p");
  title.className = "text-sm text-gray-800 font-medium mb-2";
  title.textContent = task.title;
  card.appendChild(title);

  // Area tombol navigasi
  const btnArea = document.createElement("div");
  btnArea.className = "flex items-center gap-1 mt-2";

  // Tombol "←" — hanya tampil jika status bukan "todo"
  if (task.status !== "todo") {
    const btnPrev = document.createElement("button");
    btnPrev.className = "text-sm px-2 py-1 rounded hover:bg-gray-200 transition-colors";
    btnPrev.textContent = "←";
    btnPrev.addEventListener("click", () => moveTask(task.id, "prev"));
    btnArea.appendChild(btnPrev);
  }

  // Tombol "→" — hanya tampil jika status bukan "done"
  if (task.status !== "done") {
    const btnNext = document.createElement("button");
    btnNext.className = "text-sm px-2 py-1 rounded hover:bg-gray-200 transition-colors";
    btnNext.textContent = "→";
    btnNext.addEventListener("click", () => moveTask(task.id, "next"));
    btnArea.appendChild(btnNext);
  }

  // Tombol hapus — selalu tampil
  const btnDelete = document.createElement("button");
  btnDelete.className = "ml-auto text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors";
  btnDelete.textContent = "🗑️";
  btnDelete.addEventListener("click", () => deleteTask(task.id));
  btnArea.appendChild(btnDelete);

  card.appendChild(btnArea);

  return card;
}

/**
 * Me-render ulang seluruh board dari data tasks terkini.
 * Menghapus dan membangun ulang konten semua kolom berdasarkan array tasks.
 */
function renderBoard() {
  const columns = [
    { id: "col-todo", status: "todo", label: "To Do", emptyText: "Belum ada tugas" },
    { id: "col-in-progress", status: "in-progress", label: "In Progress", emptyText: "Tidak ada tugas berjalan" },
    { id: "col-done", status: "done", label: "Done", emptyText: "Belum ada tugas selesai" },
  ];

  columns.forEach(column => {
    const colEl = document.getElementById(column.id);
    if (!colEl) return;

    const filteredTasks = tasks.filter(t => t.status === column.status);

    // Update counter badge
    const badge = colEl.querySelector(".badge");
    if (badge) {
      badge.textContent = filteredTasks.length;
    }

    // Bersihkan area kartu
    const cardsContainer = colEl.querySelector(".cards-container");
    if (!cardsContainer) return;
    cardsContainer.innerHTML = "";

    if (filteredTasks.length === 0) {
      // Tampilkan empty state
      const emptyEl = document.createElement("p");
      emptyEl.className = "text-gray-400 italic text-center text-sm py-4";
      emptyEl.textContent = column.emptyText;
      cardsContainer.appendChild(emptyEl);
    } else {
      // Render kartu untuk setiap task
      filteredTasks.forEach(task => {
        const cardEl = createCardElement(task);
        cardsContainer.appendChild(cardEl);
      });
    }
  });
}

// ============================================================
// MODAL
// ============================================================

/**
 * Membuka modal tambah tugas dan mereset state-nya.
 */
function openModal() {
  const modal = document.getElementById("modal");
  const taskInput = document.getElementById("task-input");
  const errorMsg = document.getElementById("error-msg");
  modal.classList.remove("hidden");
  taskInput.value = "";
  taskInput.classList.remove("border-red-500", "focus:ring-red-500");
  errorMsg.classList.add("hidden");
  taskInput.focus();
}

/**
 * Menutup modal tambah tugas dan mereset state-nya.
 */
function closeModal() {
  const modal = document.getElementById("modal");
  const taskInput = document.getElementById("task-input");
  const errorMsg = document.getElementById("error-msg");
  modal.classList.add("hidden");
  taskInput.value = "";
  taskInput.classList.remove("border-red-500", "focus:ring-red-500");
  errorMsg.classList.add("hidden");
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  tasks = loadTasks();
  renderBoard();

  // Tombol "+ Tambah Tugas" → buka modal
  document.getElementById("btn-add-task").addEventListener("click", openModal);

  // Tombol "Batal" → tutup modal
  document.getElementById("btn-cancel").addEventListener("click", closeModal);

  // Klik area overlay (bukan konten modal) → tutup modal
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal")) {
      closeModal();
    }
  });

  // Tekan Escape → tutup modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("modal");
      if (!modal.classList.contains("hidden")) {
        closeModal();
      }
    }
  });

  // Fungsi submit tugas
  function handleSubmit() {
    const taskInput = document.getElementById("task-input");
    const errorMsg = document.getElementById("error-msg");
    const value = taskInput.value;

    if (!validateInput(value)) {
      // Tampilkan error
      taskInput.classList.add("border-red-500");
      taskInput.classList.remove("focus:ring-blue-500");
      taskInput.classList.add("focus:ring-red-500");
      errorMsg.classList.remove("hidden");
      taskInput.focus();
      return;
    }

    addTask(value);
    closeModal();
  }

  // Tombol "Simpan"
  document.getElementById("btn-save").addEventListener("click", handleSubmit);

  // Enter key di input
  document.getElementById("task-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  });

  // Hapus error saat pengguna mulai mengetik
  document.getElementById("task-input").addEventListener("input", () => {
    const taskInput = document.getElementById("task-input");
    const errorMsg = document.getElementById("error-msg");
    taskInput.classList.remove("border-red-500", "focus:ring-red-500");
    taskInput.classList.add("focus:ring-blue-500");
    errorMsg.classList.add("hidden");
  });
});
