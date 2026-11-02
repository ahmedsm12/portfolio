/**
 * Science Box - Modern Educational Portal Script
 * Interactive filtering, instant live search, audio feedback, modal viewer,
 * and robust new-tab link management.
 */

// Educational Games Data Collection
const GAMES_DATA = [
  {
    id: "reflection",
    title: "انعكاس الضوء وتوليد الطاقة",
    englishTitle: "Light Reflection & Solar Power",
    category: "physics",
    categoryLabel: "فيزياء وبصريات",
    thumb: "thumb/01.png",
    fallbackThumb: "https://ahmedsm12.github.io/portfolio/thumb/e01.png",
    url: "https://ahmedsm12.github.io/portfolio/projects/reflection/",
    grade: "الصفوف 4 - 8",
    description: "تجربة علمية بصرية وتفاعلية ممتعة لاستكشاف انعكاس الضوء باستخدام المرايا وتوجيه حزم الأشعة نحو الألواح الشمسية لشحن البطارية بالكامل 100%.",
    concepts: ["انعكاس الضوء", "زاوية السقوط والانعكاس", "المواد العاكسة", "الطاقة الشمسية"],
    objectives: [
      "فهم قانون انعكاس الضوء وكيف يسير الضوء في خطوط مستقيمة.",
      "التمييز بين المواد العاكسة (المرايا والفضة) والمواد الماصة للضوء (الخشب والقماش).",
      "تطبيق عملي لكيفية تحويل الطاقة الضوئية إلى طاقة كهربائية لتشغيل الأجهزة."
    ],
    badgeIcon: "⚡",
    themeColor: "#06b6d4"
  },
  {
    id: "vertebrate",
    title: "كائنات البيئة الصحراوية وتكيفها",
    englishTitle: "Desert Organisms & Adaptation",
    category: "biology",
    categoryLabel: "أحياء وبيئة",
    thumb: "thumb/02.png",
    fallbackThumb: "https://ahmedsm12.github.io/portfolio/thumb/e02.png",
    url: "https://ahmedsm12.github.io/portfolio/projects/vertebrate/",
    grade: "الصفوف 3 - 7",
    description: "انطلق في رحلة استكشاف شيقة داخل البيئة الصحراوية بالعدسة المكبرة للبحث عن الحيوانات والنباتات واكتشاف أسرار تكيفها في البيئة القاسية.",
    concepts: ["البيئة الصحراوية", "تكيف الكائنات الحية", "الفقاريات", "السلاسل الغذائية"],
    objectives: [
      "التعرف على الكائنات التي تعيش في البيئات الجافة مثل الجمل والغزال والعقرب والأفعى.",
      "استيعاب مفهوم التكيف السلوكي والجسدي للتعايش مع قلة المياه ودرجات الحرارة العالية.",
      "تنمية مهارات الملاحظة والبحث الاستقصائي الدقيق بالعدسة المكبرة."
    ],
    badgeIcon: "🌿",
    themeColor: "#10b981"
  },
  {
    id: "light",
    title: "مصادر الضوء: الطبيعية والصناعية",
    englishTitle: "Light Sources: Natural & Artificial",
    category: "light-sources",
    categoryLabel: "طاقة ومواد",
    thumb: "thumb/03.png",
    fallbackThumb: "https://ahmedsm12.github.io/portfolio/thumb/e03.png",
    url: "https://ahmedsm12.github.io/portfolio/projects/light/",
    grade: "الصفوف 2 - 6",
    description: "لعبة تصنيف ذكية وممتعة داخل متجر للألعاب؛ قم بفرز العناصر بدقة واكتشف الفرق الجوهري بين مصادر الضوء الطبيعية والمصادر الصناعية.",
    concepts: ["مصادر الضوء الطبيعية", "مصادر الضوء الصناعية", "الإضاءة الحيوية", "الطاقة الضوئية"],
    objectives: [
      "التمييز الواضح بين المصادر الطبيعية كالشمس وقناديل البحر واليراعات، والمصادر الصناعية.",
      "اكتشاف ظاهرة الإضاءة الحيوية لدى بعض الكائنات البحرية والحشرات.",
      "تعزيز سرعة البديهة والقدرة على التصنيف العلمي السليم."
    ],
    badgeIcon: "💡",
    themeColor: "#f59e0b"
  },
  {
    id: "classi",
    title: "تصنيف الكائنات الحية والمجموعات",
    englishTitle: "Living Organisms Classification",
    category: "biology",
    categoryLabel: "علم الحيوان",
    thumb: "thumb/04.png",
    fallbackThumb: "https://ahmedsm12.github.io/portfolio/thumb/e04.png",
    url: "https://ahmedsm12.github.io/portfolio/projects/classi/",
    grade: "الصفوف 3 - 8",
    description: "تحدي الجزر الطافية لتصنيف الحيوانات المتنوعة إلى فئاتها الحيوية الست الأساسية: الثدييات، الطيور، الزواحف، البرمائيات، الأسماك، والحشرات.",
    concepts: ["تصنيف الكائنات", "مجموعات الفقاريات", "اللافقاريات والحشرات", "خصائص الكائنات"],
    objectives: [
      "تصنيف الكائنات الحية بناءً على الخصائص المشتركة كطريقة التكاثر وغطاء الجسم وبيئة العيش.",
      "الربط بين الحيوان ومجموعته الصحيحة (مثل: البطريق من الطيور، السلحفاة من الزواحف، الجمل من الثدييات).",
      "بناء أساس علمي قوي في علم التصنيف البيولوجي الحديث."
    ],
    badgeIcon: "🐾",
    themeColor: "#10b981"
  },
  {
    id: "planets",
    title: "كواكب المجموعة الشمسية: الصخرية والغازية",
    englishTitle: "Solar System: Terrestrial & Gas Giants",
    category: "space",
    categoryLabel: "فضاء وفلك",
    thumb: "thumb/05.png",
    fallbackThumb: "https://ahmedsm12.github.io/portfolio/thumb/e05.png",
    url: "https://ahmedsm12.github.io/portfolio/projects/planets/",
    grade: "الصفوف 4 - 9",
    description: "حلق في رحلة كونية عبر النظام الشمسي وصنّف الكواكب الثمانية إلى كواكب صخرية داخلية قريبة من الشمس وكواكب غازية عملاقة وباردة في أطراف المنظومة.",
    concepts: ["المجموعة الشمسية", "الكواكب الصخرية", "العمالقة الغازية", "المدارات والأحجام"],
    objectives: [
      "التعرف على أسماء ومواقع كواكب المجموعة الشمسية الثمانية ومميزات كل كوكب.",
      "فهم الفروق الجوهرية بين تكوين الكواكب الصخرية والغازية.",
      "إدراك أحجام الكواكب ومظاهر أغلفتها وحلقاتها المذهلة مثل حلقات زحل وأورانوس."
    ],
    badgeIcon: "🪐",
    themeColor: "#8b5cf6"
  },
  {
    id: "metals",
    title: "الفلزات واللافلزات في المختبر",
    englishTitle: "Metals & Non-Metals Classification",
    category: "chemistry",
    categoryLabel: "كيمياء ومواد",
    thumb: "thumb/06.png",
    fallbackThumb: "https://ahmedsm12.github.io/portfolio/thumb/e07.png",
    url: "https://ahmedsm12.github.io/portfolio/projects/metals/",
    grade: "الصفوف 6 - 10",
    description: "مختبر علمي مستقبلي مجهز لاختبار خواص المواد الكيميائية المختلفة؛ صنف العناصر بدقة إلى فلزات ولافلزات بناءً على البريق والتوصيل والصلابة.",
    concepts: ["الفلزات واللافلزات", "التوصيل الكهربائي والحراري", "البريق المعدني", "خصائص المواد"],
    objectives: [
      "التعرف على الخواص الفيزيائية والكيميائية المميزة للفلزات (اللمعان، التوصيل، القابلية للطرق).",
      "التمييز بين الفلزات واللافلزات وتطبيقاتها في حياتنا اليومية والصناعية.",
      "تطبيق الطريقة العلمية في الفحص والتجريب والفرز داخل بيئة افتراضية تفاعلية."
    ],
    badgeIcon: "⚗️",
    themeColor: "#f43f5e"
  }
];

// App State
const state = {
  activeCategory: "all",
  searchQuery: "",
  soundEnabled: true,
  theme: localStorage.getItem("sb_theme") || "dark"
};

// Web Audio Synthesized Sound Effects (zero external files required)
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "launch") {
      // Cosmic joyful chime
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.26);
      });
    }
  } catch (err) {
    console.warn("Audio playback not supported or blocked by user gesture:", err);
  }
}

// DOM Elements
const gamesGrid = document.getElementById("gamesGrid");
const searchInput = document.getElementById("searchInput");
const searchClearBtn = document.getElementById("searchClearBtn");
const filterPillsContainer = document.getElementById("filterPills");
const gameModal = document.getElementById("gameModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const randomGameBtn = document.getElementById("randomGameBtn");
const toastNotice = document.getElementById("toastNotice");

// Initialize Theme
function initTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = state.theme === "dark" 
      ? `<span>☀️</span><span>الوضع النهاري</span>` 
      : `<span>🌙</span><span>الوضع الليلي</span>`;
  }
}

function toggleTheme() {
  playSound("click");
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("sb_theme", state.theme);
  document.documentElement.setAttribute("data-theme", state.theme);
  updateThemeIcon();
}

// Sound Toggle
function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  if (soundToggleBtn) {
    soundToggleBtn.innerHTML = state.soundEnabled 
      ? `<span>🔊</span><span>المؤثرات: تشغيل</span>` 
      : `<span>🔇</span><span>المؤثرات: كتم</span>`;
  }
  if (state.soundEnabled) playSound("click");
}

// Show Toast
let toastTimeout;
function showToast(message, icon = "🚀") {
  if (!toastNotice) return;
  toastNotice.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toastNotice.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastNotice.classList.remove("show");
  }, 3200);
}

// Filter Games
function getFilteredGames() {
  return GAMES_DATA.filter((game) => {
    // Category filter
    const matchesCategory = state.activeCategory === "all" || game.category === state.activeCategory;

    // Search query filter
    const query = state.searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory;

    const matchesSearch = 
      game.title.toLowerCase().includes(query) ||
      game.englishTitle.toLowerCase().includes(query) ||
      game.description.toLowerCase().includes(query) ||
      game.concepts.some(c => c.toLowerCase().includes(query)) ||
      game.categoryLabel.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });
}

// Render Games Cards
function renderGames() {
  if (!gamesGrid) return;
  const filtered = getFilteredGames();

  if (filtered.length === 0) {
    gamesGrid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h3 class="no-results-title">لم نعثر على ألعاب مطابقة للبحث</h3>
        <p class="no-results-text">جرب البحث بكلمات أخرى أو اختر تصنيفاً علمياً مختلفاً.</p>
        <button class="btn-primary" onclick="resetFilters()">إعادة ضبط البحث والفلتر</button>
      </div>
    `;
    return;
  }

  gamesGrid.innerHTML = filtered.map((game) => `
    <article class="game-card" data-category="${game.category}" id="card-${game.id}">
      <div class="card-thumb-wrapper">
        <img 
          src="${game.thumb}" 
          alt="${game.title}" 
          class="card-thumb-img" 
          loading="lazy" 
          onerror="this.onerror=null; this.src='${game.fallbackThumb}';"
        >
        <div class="card-thumb-overlay"></div>
        
        <span class="card-badge">
          <span>${game.badgeIcon}</span>
          <span>${game.categoryLabel}</span>
        </span>

        <a 
          href="${game.url}" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="card-play-hover"
          onclick="handleGameLaunch('${game.id}', '${game.title}')"
          aria-label="العب ${game.title} في تبويب جديد"
        >
          <div class="play-circle-btn">▶</div>
        </a>
      </div>

      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-title">${game.title}</h3>
        </div>
        <div class="card-english-title">${game.englishTitle} • ${game.grade}</div>

        <p class="card-description">${game.description}</p>

        <div class="card-tags">
          ${game.concepts.map(tag => `<span class="tag-item">#${tag}</span>`).join("")}
        </div>

        <div class="card-actions">
          <a 
            href="${game.url}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn-card-play"
            onclick="handleGameLaunch('${game.id}', '${game.title}')"
          >
            <span>▶</span>
            <span>العب الآن</span>
            <span>↗</span>
          </a>

          <button 
            type="button" 
            class="btn-card-info" 
            onclick="openGameModal('${game.id}')"
            title="معلومات وتفاصيل اللعبة"
            aria-label="معلومات وتفاصيل اللعبة"
          >
            ℹ️
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

// Launch Game Event
function handleGameLaunch(gameId, gameTitle) {
  playSound("launch");
  showToast(`جارٍ فتح "${gameTitle}" في تبويب جديد...`, "🚀");
}

// Reset Filters
function resetFilters() {
  state.activeCategory = "all";
  state.searchQuery = "";
  if (searchInput) searchInput.value = "";
  if (searchClearBtn) searchClearBtn.classList.remove("visible");

  document.querySelectorAll(".filter-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.category === "all");
  });

  renderGames();
}
window.resetFilters = resetFilters;

// Render Category Filter Pills
function setupFilterPills() {
  if (!filterPillsContainer) return;

  const categories = [
    { id: "all", label: "الكل", icon: "✨" },
    { id: "physics", label: "فيزياء وبصريات", icon: "⚡" },
    { id: "biology", label: "أحياء وبيئة", icon: "🌿" },
    { id: "light-sources", label: "طاقة ومواد", icon: "💡" },
    { id: "space", label: "فضاء وفلك", icon: "🪐" },
    { id: "chemistry", label: "كيمياء ومواد", icon: "⚗️" }
  ];

  filterPillsContainer.innerHTML = categories.map(cat => {
    const count = cat.id === "all" 
      ? GAMES_DATA.length 
      : GAMES_DATA.filter(g => g.category === cat.id).length;

    return `
      <button 
        type="button" 
        class="filter-pill ${cat.id === state.activeCategory ? 'active' : ''}" 
        data-category="${cat.id}"
      >
        <span>${cat.icon}</span>
        <span>${cat.label}</span>
        <span class="pill-count">${count}</span>
      </button>
    `;
  }).join("");

  filterPillsContainer.querySelectorAll(".filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      playSound("click");
      filterPillsContainer.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      state.activeCategory = pill.dataset.category;
      renderGames();
    });
  });
}

// Modal Logic
function openGameModal(gameId) {
  playSound("click");
  const game = GAMES_DATA.find(g => g.id === gameId);
  if (!game || !gameModal) return;

  const modalBody = document.getElementById("modalBody");
  if (!modalBody) return;

  modalBody.innerHTML = `
    <img 
      src="${game.thumb}" 
      alt="${game.title}" 
      class="modal-header-img"
      onerror="this.onerror=null; this.src='${game.fallbackThumb}';"
    >
    <div class="modal-content-body">
      <span class="modal-game-badge">${game.badgeIcon} ${game.categoryLabel} • ${game.grade}</span>
      <h2 class="modal-game-title">${game.title}</h2>
      <div class="modal-game-subtitle">${game.englishTitle}</div>

      <div class="modal-section-title">
        <span>📖</span>
        <span>نظرة عامة على اللعبة</span>
      </div>
      <p class="modal-game-desc">${game.description}</p>

      <div class="modal-section-title">
        <span>🎯</span>
        <span>مخرجات التعلم والأهداف العلمية</span>
      </div>
      <ul class="modal-objectives-list">
        ${game.objectives.map(obj => `<li>${obj}</li>`).join("")}
      </ul>

      <div class="modal-section-title">
        <span>🔬</span>
        <span>المفاهيم العلمية المرتبطة</span>
      </div>
      <div class="card-tags" style="margin-top: 6px;">
        ${game.concepts.map(tag => `<span class="tag-item">#${tag}</span>`).join("")}
      </div>

      <div class="modal-footer-actions">
        <a 
          href="${game.url}" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="btn-primary" 
          style="flex: 1; justify-content: center;"
          onclick="handleGameLaunch('${game.id}', '${game.title}')"
        >
          <span>▶</span>
          <span>تشغيل اللعبة الآن في تبويب جديد</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  `;

  gameModal.classList.add("open");
  document.body.style.overflow = "hidden";
}
window.openGameModal = openGameModal;

function closeGameModal() {
  if (!gameModal) return;
  playSound("click");
  gameModal.classList.remove("open");
  document.body.style.overflow = "";
}

// Random Game
function playRandomGame() {
  playSound("click");
  const randomIndex = Math.floor(Math.random() * GAMES_DATA.length);
  const randomGame = GAMES_DATA[randomIndex];
  handleGameLaunch(randomGame.id, randomGame.title);
  window.open(randomGame.url, "_blank", "noopener,noreferrer");
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupFilterPills();
  renderGames();

  // Search Input Handler
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.classList.toggle("visible", state.searchQuery.length > 0);
      }
      renderGames();
    });
  }

  // Clear Search
  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      playSound("click");
      if (searchInput) searchInput.value = "";
      state.searchQuery = "";
      searchClearBtn.classList.remove("visible");
      renderGames();
    });
  }

  // Header Scroll Shadow
  const siteHeader = document.querySelector(".site-header");
  window.addEventListener("scroll", () => {
    if (siteHeader) {
      siteHeader.classList.toggle("scrolled", window.scrollY > 20);
    }
  });

  // Modal Close Events
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeGameModal);
  }
  if (gameModal) {
    gameModal.addEventListener("click", (e) => {
      if (e.target === gameModal) closeGameModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && gameModal && gameModal.classList.contains("open")) {
      closeGameModal();
    }
  });

  // Toggles
  if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
  if (soundToggleBtn) soundToggleBtn.addEventListener("click", toggleSound);
  if (randomGameBtn) randomGameBtn.addEventListener("click", playRandomGame);
});
