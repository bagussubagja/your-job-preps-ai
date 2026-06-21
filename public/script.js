// ============================================
// YOUR JOB PREPARATION AI - Main Script
// ============================================

const API_URL = '/api/chat';

// ============================================
// PERSONA & RAG SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `Kamu adalah "Your Job Preparation AI", asisten AI yang HANYA membahas topik seputar persiapan kerja dan karir profesional.

ATURAN KETAT:
1. Kamu HANYA boleh menjawab pertanyaan yang berkaitan dengan persiapan kerja, karir, dan profesionalisme.
2. Jika pengguna bertanya di luar topik persiapan kerja, tolak dengan sopan dan arahkan kembali ke topik yang relevan.
3. JANGAN PERNAH menggunakan emoticon atau emoji dalam respons apapun.
4. Gunakan bahasa yang profesional, jelas, dan mudah dipahami.
5. Berikan jawaban yang terstruktur dengan poin-poin jika diperlukan.
6. Jika pengguna mengirim gambar atau PDF, analisis kontennya HANYA dalam konteks persiapan kerja (misal: review CV, review portfolio, analisis job posting).

TOPIK YANG BOLEH DIBAHAS:
- Pembuatan dan review CV/Resume
- Persiapan wawancara kerja (behavioral, technical, HR)
- Tips negosiasi gaji dan benefit
- Pengembangan skill dan kompetensi
- Personal branding dan LinkedIn optimization
- Portfolio profesional
- Cover letter dan email profesional
- Career switching dan career planning
- Persiapan tes psikologi dan assessment center
- Networking dan relationship building
- Workplace etiquette dan soft skills
- Remote work best practices
- Freelancing dan side hustle profesional
- Sertifikasi profesional dan pelatihan
- Job search strategy dan platform pencarian kerja

TOPIK YANG HARUS DITOLAK:
- Coding/programming (kecuali dalam konteks persiapan interview teknis)
- Topik non-karir (politik, agama, hiburan, dll)
- Pertanyaan pribadi atau curhat non-karir
- Meminta menulis kode atau debug

FORMAT RESPONS:
- Gunakan format yang jelas dan terstruktur
- Gunakan paragraf pendek
- Gunakan bullet points atau numbered list untuk langkah-langkah
- Gunakan bold (**text**) untuk penekanan penting
- Jangan gunakan heading markdown (# atau ##), langsung tulis poin-poinnya
- Jawab dalam bahasa yang sama dengan pertanyaan pengguna (Indonesia atau English)`;

// ============================================
// SUGGESTION QUESTIONS
// ============================================

const SUGGESTION_POOL = [
  "Bagaimana cara membuat CV ATS-friendly yang menarik perhatian rekruter?",
  "Apa saja pertanyaan interview yang paling sering ditanyakan dan cara menjawabnya?",
  "Bagaimana strategi negosiasi gaji yang efektif untuk fresh graduate?",
  "Tips membangun portfolio profesional yang kuat untuk career switcher",
  "Bagaimana cara menjawab pertanyaan 'ceritakan tentang diri Anda' dengan baik?",
  "Apa yang harus disiapkan seminggu sebelum interview kerja?",
  "Bagaimana cara menulis cover letter yang meyakinkan?",
  "Tips optimasi profil LinkedIn agar dilirik rekruter",
  "Bagaimana cara menjelaskan gap year dalam CV?",
  "Apa saja red flag yang harus dihindari saat interview?",
  "Bagaimana strategi job search yang efektif di era digital?",
  "Tips mempersiapkan diri untuk technical interview",
  "Bagaimana cara follow up setelah interview tanpa terkesan memaksa?",
  "Apa saja soft skill yang paling dicari perusahaan saat ini?",
  "Bagaimana cara membangun personal branding yang kuat untuk profesional muda?",
  "Tips menghadapi tes psikologi dan assessment center",
  "Bagaimana cara menentukan career path yang tepat?",
  "Apa yang harus dilakukan jika ditolak setelah interview?",
  "Bagaimana cara menjawab pertanyaan tentang kelemahan diri saat interview?",
  "Tips networking efektif untuk introvert"
];

// ============================================
// STATE MANAGEMENT
// ============================================

let conversations = JSON.parse(localStorage.getItem('jobprep_conversations') || '[]');
let activeConversationId = localStorage.getItem('jobprep_active_conversation') || null;
let attachedFiles = [];
let isGenerating = false;

// ============================================
// DOM ELEMENTS
// ============================================

const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const chatContainer = document.getElementById('chat-container');
const welcomeScreen = document.getElementById('welcome-screen');
const suggestionsEl = document.getElementById('suggestions');
const conversationList = document.getElementById('conversation-list');
const btnNewChat = document.getElementById('btn-new-chat');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const sidebar = document.getElementById('sidebar');
const fileImageInput = document.getElementById('file-image');
const filePdfInput = document.getElementById('file-pdf');
const attachmentPreview = document.getElementById('attachment-preview');
const btnSend = document.getElementById('btn-send');

// ============================================
// INITIALIZATION
// ============================================

function init() {
  loadTheme();
  renderSuggestions();
  renderConversationList();

  if (activeConversationId) {
    const conv = conversations.find(c => c.id === activeConversationId);
    if (conv) {
      renderMessages(conv);
    }
  }

  setupEventListeners();
  autoResizeTextarea();
}

// ============================================
// THEME MANAGEMENT
// ============================================

function loadTheme() {
  const savedTheme = localStorage.getItem('jobprep_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('jobprep_theme', next);
}

// ============================================
// SUGGESTIONS
// ============================================

function renderSuggestions() {
  const shuffled = [...SUGGESTION_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);

  suggestionsEl.innerHTML = selected.map(q =>
    `<div class="suggestion-chip">${q}</div>`
  ).join('');

  suggestionsEl.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      userInput.value = chip.textContent;
      userInput.focus();
      handleSubmit();
    });
  });
}

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

function createNewConversation() {
  // Jika sudah ada conversation aktif yang masih kosong, gunakan itu saja
  if (activeConversationId) {
    const current = conversations.find(c => c.id === activeConversationId);
    if (current && current.messages.length === 0) {
      // Sudah di conversation kosong, tidak perlu buat baru
      clearChatArea();
      welcomeScreen.style.display = 'flex';
      renderSuggestions();
      return current;
    }
  }

  const conv = {
    id: Date.now().toString(),
    title: 'Percakapan Baru',
    messages: [],
    createdAt: new Date().toISOString()
  };
  conversations.unshift(conv);
  activeConversationId = conv.id;
  saveConversations();
  renderConversationList();
  clearChatArea();
  welcomeScreen.style.display = 'flex';
  renderSuggestions();
  return conv;
}

function switchConversation(id) {
  activeConversationId = id;
  localStorage.setItem('jobprep_active_conversation', id);
  const conv = conversations.find(c => c.id === id);
  if (conv) {
    renderMessages(conv);
    renderConversationList();
  }
}

function deleteConversation(id, event) {
  event.stopPropagation();
  conversations = conversations.filter(c => c.id !== id);
  if (activeConversationId === id) {
    activeConversationId = conversations.length > 0 ? conversations[0].id : null;
    if (activeConversationId) {
      switchConversation(activeConversationId);
    } else {
      clearChatArea();
      welcomeScreen.style.display = 'flex';
      renderSuggestions();
    }
  }
  saveConversations();
  renderConversationList();
}

function saveConversations() {
  localStorage.setItem('jobprep_conversations', JSON.stringify(conversations));
  localStorage.setItem('jobprep_active_conversation', activeConversationId || '');
}

function renderConversationList() {
  conversationList.innerHTML = conversations.map(conv => `
    <div class="conversation-item ${conv.id === activeConversationId ? 'active' : ''}" data-id="${conv.id}">
      <span class="conversation-item-title">${escapeHtml(conv.title)}</span>
      <button class="conversation-item-delete" data-id="${conv.id}" title="Hapus">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');

  conversationList.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.conversation-item-delete')) {
        switchConversation(item.dataset.id);
      }
    });
  });

  conversationList.querySelectorAll('.conversation-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => deleteConversation(btn.dataset.id, e));
  });
}

// ============================================
// CHAT RENDERING
// ============================================

function clearChatArea() {
  chatMessages.innerHTML = '';
  chatMessages.appendChild(welcomeScreen);
}

function renderMessages(conv) {
  chatMessages.innerHTML = '';
  welcomeScreen.style.display = 'none';
  chatMessages.appendChild(welcomeScreen);

  if (conv.messages.length === 0) {
    welcomeScreen.style.display = 'flex';
    return;
  }

  conv.messages.forEach(msg => {
    appendMessageToDOM(msg.role, msg.content, msg.attachments, false);
  });

  scrollToBottom();
}

function appendMessageToDOM(role, content, attachments = [], animate = true) {
  welcomeScreen.style.display = 'none';

  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}`;
  if (animate) {
    msgEl.style.animation = 'fadeInUp 0.4s ease';
  }

  const avatarLabel = role === 'user' ? 'U' : 'AI';

  let attachmentHtml = '';
  if (attachments && attachments.length > 0) {
    attachmentHtml = '<div class="message-attachment">';
    attachments.forEach(att => {
      if (att.type === 'image') {
        attachmentHtml += `<img src="${att.preview}" alt="Attached image" />`;
      } else if (att.type === 'pdf') {
        attachmentHtml += `<div class="message-attachment-file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          ${escapeHtml(att.name)}
        </div>`;
      }
    });
    attachmentHtml += '</div>';
  }

  const formattedContent = formatMessage(content);

  msgEl.innerHTML = `
    <div class="message-avatar">${avatarLabel}</div>
    <div class="message-bubble">
      ${attachmentHtml}
      ${formattedContent}
    </div>
  `;

  chatMessages.appendChild(msgEl);
  scrollToBottom();
}

function formatMessage(text) {
  if (!text) return '';

  let formatted = escapeHtml(text);

  // Bold
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Code blocks
  formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Unordered lists
  formatted = formatted.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Numbered lists
  formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs
  formatted = formatted.replace(/\n\n/g, '</p><p>');
  formatted = formatted.replace(/\n/g, '<br>');

  if (!formatted.startsWith('<')) {
    formatted = '<p>' + formatted + '</p>';
  }

  return formatted;
}

// ============================================
// LOADING & TYPING ANIMATION
// ============================================

function showLoadingIndicator() {
  const loader = document.createElement('div');
  loader.className = 'loading-indicator';
  loader.id = 'loading-indicator';
  loader.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="loading-bubble">
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
    </div>
  `;
  chatMessages.appendChild(loader);
  scrollToBottom();
}

function removeLoadingIndicator() {
  const loader = document.getElementById('loading-indicator');
  if (loader) loader.remove();
}

async function typeMessage(content, attachments = []) {
  welcomeScreen.style.display = 'none';

  const msgEl = document.createElement('div');
  msgEl.className = 'message ai';
  msgEl.style.animation = 'fadeInUp 0.4s ease';

  let attachmentHtml = '';
  if (attachments && attachments.length > 0) {
    attachmentHtml = '<div class="message-attachment">';
    attachments.forEach(att => {
      if (att.type === 'image') {
        attachmentHtml += `<img src="${att.preview}" alt="Attached image" />`;
      }
    });
    attachmentHtml += '</div>';
  }

  msgEl.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-bubble">
      ${attachmentHtml}
      <span class="typing-text"></span><span class="typing-cursor"></span>
    </div>
  `;

  chatMessages.appendChild(msgEl);
  scrollToBottom();

  const typingText = msgEl.querySelector('.typing-text');
  const cursor = msgEl.querySelector('.typing-cursor');

  // Type character by character
  let i = 0;
  const speed = 12;

  await new Promise(resolve => {
    function typeChar() {
      if (i < content.length) {
        // Handle chunks for smoother rendering
        const chunk = content.slice(i, i + 3);
        i += 3;
        typingText.innerHTML = formatMessage(content.slice(0, i));
        scrollToBottom();
        setTimeout(typeChar, speed);
      } else {
        typingText.innerHTML = formatMessage(content);
        cursor.remove();
        scrollToBottom();
        resolve();
      }
    }
    typeChar();
  });
}

// ============================================
// FILE HANDLING
// ============================================

function handleFileSelect(file, type) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const fileData = {
      type: type,
      name: file.name,
      data: e.target.result,
      preview: type === 'image' ? e.target.result : null,
      mimeType: file.type
    };
    attachedFiles.push(fileData);
    renderAttachmentPreview();
  };

  if (type === 'image') {
    reader.readAsDataURL(file);
  } else {
    reader.readAsDataURL(file);
  }
}

function renderAttachmentPreview() {
  attachmentPreview.innerHTML = attachedFiles.map((file, idx) => {
    if (file.type === 'image') {
      return `<div class="attachment-preview-item">
        <img src="${file.preview}" alt="${file.name}" />
        <span>${file.name}</span>
        <button class="attachment-preview-remove" data-idx="${idx}">x</button>
      </div>`;
    } else {
      return `<div class="attachment-preview-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span>${file.name}</span>
        <button class="attachment-preview-remove" data-idx="${idx}">x</button>
      </div>`;
    }
  }).join('');

  attachmentPreview.querySelectorAll('.attachment-preview-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      attachedFiles.splice(parseInt(btn.dataset.idx), 1);
      renderAttachmentPreview();
    });
  });
}

// ============================================
// API COMMUNICATION
// ============================================

async function sendToGemini(userMessage, attachments = []) {
  const conv = conversations.find(c => c.id === activeConversationId);
  if (!conv) return '';

  // Build conversation array for backend
  const conversation = [];

  const history = conv.messages.slice(-10); // Keep last 10 messages for context

  history.forEach(msg => {
    if (msg.content) {
      conversation.push({
        role: msg.role === 'user' ? 'user' : 'model',
        text: msg.content
      });
    }
  });

  // Build current message parts
  const currentParts = [];

  // Add attachments
  if (attachments.length > 0) {
    for (const att of attachments) {
      if (att.data) {
        const base64Data = att.data.split(',')[1];
        currentParts.push({
          inline_data: {
            mime_type: att.mimeType,
            data: base64Data
          }
        });
      }
    }
  }

  // Add text
  currentParts.push({ text: userMessage });

  conversation.push({
    role: 'user',
    parts: currentParts
  });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: conversation,
        systemInstruction: SYSTEM_PROMPT
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API request failed');
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('API Error:', error);
    return `Maaf, terjadi kesalahan saat memproses permintaan. Silakan coba lagi.\n\nDetail: ${error.message}`;
  }
}

// ============================================
// MESSAGE SUBMISSION
// ============================================

async function handleSubmit() {
  const message = userInput.value.trim();
  if (!message && attachedFiles.length === 0) return;
  if (isGenerating) return;

  isGenerating = true;
  btnSend.disabled = true;

  // Create conversation if needed
  if (!activeConversationId) {
    createNewConversation();
  }

  const conv = conversations.find(c => c.id === activeConversationId);
  if (!conv) return;

  // Prepare attachments for storage (without heavy data for localStorage)
  const attachmentsForStorage = attachedFiles.map(f => ({
    type: f.type,
    name: f.name,
    preview: f.type === 'image' ? f.preview : null
  }));

  const attachmentsForAPI = [...attachedFiles];

  // Add user message
  conv.messages.push({
    role: 'user',
    content: message,
    attachments: attachmentsForStorage
  });

  // Update title from first message
  if (conv.messages.length === 1 && message) {
    conv.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
  }

  saveConversations();
  renderConversationList();

  // Display user message
  appendMessageToDOM('user', message, attachmentsForStorage);

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';
  attachedFiles = [];
  renderAttachmentPreview();

  // Show loading
  showLoadingIndicator();

  // Get AI response
  const aiResponse = await sendToGemini(message, attachmentsForAPI);

  // Remove loading
  removeLoadingIndicator();

  // Type AI response
  await typeMessage(aiResponse);

  // Save AI response
  conv.messages.push({
    role: 'ai',
    content: aiResponse,
    attachments: []
  });

  saveConversations();

  isGenerating = false;
  btnSend.disabled = false;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Form submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit();
  });

  // Enter to send (Shift+Enter for new line)
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });

  // New chat
  btnNewChat.addEventListener('click', () => {
    createNewConversation();
  });

  // Toggle sidebar
  btnToggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // Theme toggle
  btnThemeToggle.addEventListener('click', toggleTheme);

  // File inputs
  fileImageInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleFileSelect(e.target.files[0], 'image');
      e.target.value = '';
    }
  });

  filePdfInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleFileSelect(e.target.files[0], 'pdf');
      e.target.value = '';
    }
  });
}

// ============================================
// UTILITIES
// ============================================

function autoResizeTextarea() {
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
  });
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// START
// ============================================

document.addEventListener('DOMContentLoaded', init);
