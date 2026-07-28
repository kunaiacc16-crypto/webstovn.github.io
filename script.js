/* ==========================================================================
   Roleplay Official — script.js
   Toàn bộ logic giao diện: điều hướng, hiệu ứng, quản trị, dữ liệu.
   Lớp dữ liệu thực tế nằm trong firebase.js — file này chỉ gọi các hàm đó.
   ========================================================================== */

import {
  loadAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  loadRecruitments,
  saveRecruitment,
  deleteRecruitment,
  saveApplication,
  loadApplications,
  approveApplication,
  rejectApplication,
  deleteApplication,
  loadSettings,
  saveSettings,
} from "./firebase.js";

/* --------------------------------------------------------------------------
   Hằng số & trạng thái toàn cục
   -------------------------------------------------------------------------- */
const ADMIN_CREDENTIALS = {
  username: "BaovaChuotDz",
  password: "BaoKoDz",
};

const DEFAULT_SETTINGS = {
  siteName: "Roleplay Official",
  logo: "",
  banner: "",
  background: "",
  version: "v1.0.0",
  color: "#2f7dfa",
};

const COLOR_OPTIONS = [
  { name: "Xanh dương", value: "#2f7dfa" },
  { name: "Chàm", value: "#5b6bf5" },
  { name: "Xanh da trời", value: "#0ea5e9" },
  { name: "Ngọc lam", value: "#14b8a6" },
  { name: "Tím", value: "#8b5cf6" },
  { name: "Hồng đỏ", value: "#f43f5e" },
];

const state = {
  announcements: [],
  recruitments: [],
  applications: [],
  settings: { ...DEFAULT_SETTINGS },
  isAdmin: false,
};

/* --------------------------------------------------------------------------
   Tiện ích chung
   -------------------------------------------------------------------------- */
function $(selector, scope = document) {
  return scope.querySelector(selector);
}
function $all(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDeadline(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function showToast(message, type = "success") {
  const stack = $("#toast-stack");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(24px)";
    toast.style.transition = "opacity .3s ease, transform .3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* --------------------------------------------------------------------------
   Màn hình tải & nhận diện thiết bị
   -------------------------------------------------------------------------- */
function initLoadingScreen() {
  const loadingScreen = $("#loading-screen");
  const start = Date.now();
  const minDuration = 700;

  window.addEventListener("load", () => {
    const elapsed = Date.now() - start;
    const remaining = Math.max(minDuration - elapsed, 0);
    setTimeout(() => loadingScreen.classList.add("hidden"), remaining);
  });

  // An toàn: nếu sự kiện load đã bắn trước khi script chạy.
  if (document.readyState === "complete") {
    setTimeout(() => loadingScreen.classList.add("hidden"), minDuration);
  }
}

function detectDevice() {
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isNarrow = window.matchMedia("(max-width: 860px)").matches;
  const isMobile = isTouch && isNarrow;
  document.body.classList.toggle("device-mobile", isMobile);
  document.body.classList.toggle("device-desktop", !isMobile);
  return isMobile;
}

/* --------------------------------------------------------------------------
   Header, menu di động, cuộn trang
   -------------------------------------------------------------------------- */
function initHeaderScroll() {
  const header = $("#site-header");
  const backToTop = $("#back-to-top");

  function onScroll() {
    const scrolled = window.scrollY > 40;
    header.classList.toggle("scrolled", scrolled);
    backToTop.classList.toggle("visible", window.scrollY > 480);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function initMobileMenu() {
  const toggle = $("#menu-toggle");
  const menu = $("#mobile-menu");

  function close() {
    toggle.classList.remove("active");
    menu.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    toggle.classList.toggle("active", isOpen);
    document.body.classList.toggle("no-scroll", isOpen);
  });

  $all('[data-nav]', menu).forEach((link) => link.addEventListener("click", close));
}

function initNavHighlight() {
  const navLinks = $all("[data-nav]");
  const sections = $all("section[id]");

  function setActive(id) {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === id);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

function initRevealAnimations() {
  const targets = $all(".reveal, .card, .stat-card");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  targets.forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });
}

/* --------------------------------------------------------------------------
   Hiệu ứng nền mạng lưới trong Trang chủ (signature animation)
   -------------------------------------------------------------------------- */
function initHeroNetwork() {
  const canvas = $("#hero-network");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = document.body.classList.contains("device-mobile");

  let width, height, nodes;
  const nodeCount = prefersReducedMotion ? 0 : isMobile ? 28 : 60;
  const linkDistance = isMobile ? 110 : 150;

  function resize() {
    const hero = canvas.closest(".hero");
    width = canvas.width = hero.offsetWidth;
    height = canvas.height = hero.offsetHeight;
  }

  function createNodes() {
    nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
    }));
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    nodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDistance) {
          ctx.strokeStyle = `rgba(91, 155, 255, ${0.16 * (1 - dist / linkDistance)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    nodes.forEach((node) => {
      ctx.fillStyle = "rgba(143, 188, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!prefersReducedMotion) requestAnimationFrame(step);
  }

  resize();
  createNodes();
  if (!prefersReducedMotion && nodeCount > 0) requestAnimationFrame(step);

  window.addEventListener("resize", () => {
    resize();
    createNodes();
  });
}

/* --------------------------------------------------------------------------
   Modal dùng chung
   -------------------------------------------------------------------------- */
function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add("open");
  document.body.classList.add("no-scroll");
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.classList.remove("no-scroll");
}

function initModalGeneral() {
  $all("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });

  $all(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal(overlay.id);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $all(".modal-overlay.open").forEach((overlay) => closeModal(overlay.id));
    }
  });
}

/* --------------------------------------------------------------------------
   Áp dụng Cài đặt Website lên giao diện
   -------------------------------------------------------------------------- */
function applySettingsToUI() {
  const s = state.settings;

  document.documentElement.style.setProperty("--blue-500", s.color);
  document.title = s.siteName;

  $all("#brand-name-header").forEach((el) => (el.textContent = s.siteName));
  $all("#hero-site-name").forEach((el) => (el.textContent = s.siteName));
  $all("#footer-site-name").forEach((el) => (el.textContent = s.siteName));
  $all("#brand-version-header, #hero-version").forEach((el) => (el.textContent = s.version));
  $("#footer-version").textContent = `Phiên bản ${s.version}`;

  const initials = s.siteName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RO";

  $all(".brand-mark span").forEach((span) => {
    if (!span.closest(".brand-mark").querySelector("img")) span.textContent = initials;
  });

  [$("#brand-mark-header"), $("#brand-mark-footer")].forEach((mark) => {
    if (!mark) return;
    const existingImg = mark.querySelector("img");
    if (s.logo) {
      if (existingImg) {
        existingImg.src = s.logo;
      } else {
        mark.innerHTML = `<img src="${escapeHtml(s.logo)}" alt="${escapeHtml(s.siteName)}" />`;
      }
    } else if (existingImg) {
      mark.innerHTML = `<span>${initials}</span>`;
    }
  });

  const heroBanner = $("#hero-banner");
  const heroBannerEmpty = $("#hero-banner-empty");
  let bannerImg = heroBanner.querySelector("img");
  if (s.banner) {
    if (!bannerImg) {
      bannerImg = document.createElement("img");
      heroBanner.prepend(bannerImg);
    }
    bannerImg.src = s.banner;
    bannerImg.alt = s.siteName;
    heroBannerEmpty.style.display = "none";
  } else {
    if (bannerImg) bannerImg.remove();
    heroBannerEmpty.style.display = "flex";
  }

  if (s.background) {
    document.body.style.backgroundImage = `linear-gradient(rgba(5,7,12,0.86), rgba(5,7,12,0.92)), url('${s.background}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
  } else {
    document.body.style.backgroundImage = "";
  }
}

function fillSettingsForm() {
  const s = state.settings;
  $("#settings-name").value = s.siteName;
  $("#settings-logo").value = s.logo;
  $("#settings-banner").value = s.banner;
  $("#settings-background").value = s.background;
  $("#settings-version").value = s.version;

  const swatchWrap = $("#settings-color-swatches");
  swatchWrap.innerHTML = "";
  COLOR_OPTIONS.forEach((option) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch";
    swatch.style.background = option.value;
    swatch.title = option.name;
    swatch.dataset.color = option.value;
    if (option.value.toLowerCase() === s.color.toLowerCase()) swatch.classList.add("selected");
    swatch.addEventListener("click", () => {
      $all(".color-swatch", swatchWrap).forEach((el) => el.classList.remove("selected"));
      swatch.classList.add("selected");
    });
    swatchWrap.appendChild(swatch);
  });
}

/* --------------------------------------------------------------------------
   Render: Thông báo / Cập nhật / Nội quy
   -------------------------------------------------------------------------- */
function renderAnnouncementFilterOptions() {
  const filter = $("#announcement-filter");
  const types = Array.from(new Set(state.announcements.map((a) => a.type))).sort();
  const currentValue = filter.value;
  filter.innerHTML = '<option value="all">Tất cả loại</option>';
  types.forEach((type) => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    filter.appendChild(opt);
  });
  if (types.includes(currentValue)) filter.value = currentValue;
}

function announcementCardHtml(item) {
  return `
    <article class="card glass reveal in-view">
      <div class="card-top">
        <span class="badge">${escapeHtml(item.type)}</span>
        <span class="card-time">${formatTime(item.timestamp)}</span>
      </div>
      <h3 class="card-title">${escapeHtml(item.title)}</h3>
      <p class="card-body">${escapeHtml(item.content)}</p>
      <div class="card-foot">
        <span>Đăng bởi ${escapeHtml(item.author || "Quản trị viên")}</span>
      </div>
    </article>
  `;
}

function emptyStateHtml(title, desc) {
  return `
    <div class="empty-state glass">
      <div class="empty-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11 18 4v16l-15-7Z"/><path d="M3 11v6a2 2 0 0 0 2 2h2"/></svg>
      </div>
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>
  `;
}

function renderAnnouncements() {
  renderAnnouncementFilterOptions();

  const search = $("#announcement-search").value.trim().toLowerCase();
  const filterType = $("#announcement-filter").value;
  const sort = $("#announcement-sort").value;

  let list = state.announcements.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search) ||
      item.content.toLowerCase().includes(search);
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  if (sort === "oldest") list = [...list].sort((a, b) => a.timestamp - b.timestamp);
  else if (sort === "title-az") list = [...list].sort((a, b) => a.title.localeCompare(b.title, "vi"));
  else list = [...list].sort((a, b) => b.timestamp - a.timestamp);

  const container = $("#announcement-list");
  container.innerHTML = list.length
    ? list.map(announcementCardHtml).join("")
    : emptyStateHtml(
        "Chưa có thông báo",
        "Hiện chưa có thông báo nào phù hợp. Quản trị viên có thể thêm thông báo mới trong Bảng điều khiển."
      );

  renderUpdatesAndRules();
  updateHeroStats();
}

function renderUpdatesAndRules() {
  const updates = state.announcements
    .filter((a) => a.type === "Cập nhật")
    .sort((a, b) => b.timestamp - a.timestamp);
  const rules = state.announcements
    .filter((a) => a.type === "Nội quy")
    .sort((a, b) => b.timestamp - a.timestamp);

  $("#update-list").innerHTML = updates.length
    ? updates.map(announcementCardHtml).join("")
    : emptyStateHtml("Chưa có cập nhật", "Chưa có nội dung cập nhật nào được đăng tải.");

  $("#rule-list").innerHTML = rules.length
    ? rules.map(announcementCardHtml).join("")
    : emptyStateHtml("Chưa có nội quy", "Chưa có nội quy nào được đăng tải.");
}

/* --------------------------------------------------------------------------
   Render: Tuyển dụng
   -------------------------------------------------------------------------- */
function recruitmentCardHtml(item) {
  const isOpen = item.status === "open";
  return `
    <article class="card glass reveal in-view">
      <div class="card-top">
        <span class="badge ${isOpen ? "status-open" : "status-closed"}">${isOpen ? "Đang mở" : "Đã đóng"}</span>
        <span class="card-time">Hạn: ${formatDeadline(item.deadline)}</span>
      </div>
      <h3 class="card-title">${escapeHtml(item.position)}</h3>
      <div class="card-fields">
        <div><b>Điều kiện:</b> ${escapeHtml(item.requirements)}</div>
        <div><b>Quyền lợi:</b> ${escapeHtml(item.benefits)}</div>
      </div>
      <div class="card-foot">
        <span></span>
        <button class="btn btn-primary btn-sm" data-apply="${item.id}" ${isOpen ? "" : "disabled"}>Đăng ký</button>
      </div>
    </article>
  `;
}

function renderRecruitments() {
  const list = [...state.recruitments].sort((a, b) => b.timestamp - a.timestamp);
  const container = $("#recruitment-list");
  container.innerHTML = list.length
    ? list.map(recruitmentCardHtml).join("")
    : emptyStateHtml(
        "Chưa có tin tuyển dụng",
        "Hiện chưa có vị trí tuyển dụng nào. Vui lòng quay lại sau."
      );

  $all("[data-apply]", container).forEach((btn) => {
    btn.addEventListener("click", () => openApplyModal(btn.dataset.apply));
  });

  updateHeroStats();
}

function openApplyModal(recruitmentId) {
  const recruitment = state.recruitments.find((r) => r.id === recruitmentId);
  if (!recruitment) return;
  $("#apply-form").reset();
  $("#apply-form").style.display = "flex";
  $("#apply-success").style.display = "none";
  $("#apply-recruitment-id").value = recruitmentId;
  $("#apply-position-label").textContent = `Ứng tuyển vị trí: ${recruitment.position}`;
  openModal("modal-apply");
}

function updateHeroStats() {
  $("#stat-announcements-count").textContent = state.announcements.length;
  $("#stat-recruitments-count").textContent = state.recruitments.filter((r) => r.status === "open").length;
}

/* --------------------------------------------------------------------------
   Đăng nhập quản trị & Bảng điều khiển
   -------------------------------------------------------------------------- */
function initAdminLogin() {
  $("#footer-admin-btn").addEventListener("click", () => {
    $("#login-form").reset();
    $("#login-error").classList.remove("show");
    openModal("modal-login");
  });

  $("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const username = $("#login-username").value.trim();
    const password = $("#login-password").value;

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      state.isAdmin = true;
      closeModal("modal-login");
      showToast("Đăng nhập thành công.", "success");
      openDashboard();
    } else {
      $("#login-error").classList.add("show");
    }
  });
}

function openDashboard() {
  $("#admin-dashboard").classList.add("open");
  document.body.classList.add("no-scroll");
  renderAdminOverview();
  renderAdminAnnouncements();
  renderAdminRecruitments();
  renderAdminApplications();
  fillSettingsForm();
}

function closeDashboard() {
  $("#admin-dashboard").classList.remove("open");
  document.body.classList.remove("no-scroll");
}

function initDashboardShell() {
  $("#dash-close-btn").addEventListener("click", closeDashboard);
  $("#dash-logout-btn").addEventListener("click", () => {
    state.isAdmin = false;
    closeDashboard();
    showToast("Đã đăng xuất khỏi quản trị.", "success");
  });

  $("#dash-menu-toggle").addEventListener("click", () => {
    $("#dash-sidebar").classList.toggle("open");
  });

  $all(".dash-link[data-panel]").forEach((link) => {
    link.addEventListener("click", () => {
      $all(".dash-link[data-panel]").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      $all(".dash-panel").forEach((panel) => panel.classList.remove("active"));
      $(`#panel-${link.dataset.panel}`).classList.add("active");
      $("#dash-sidebar").classList.remove("open");
    });
  });
}

function renderAdminOverview() {
  $("#ov-announcements").textContent = state.announcements.length;
  $("#ov-recruitments").textContent = state.recruitments.length;
  $("#ov-applications").textContent = state.applications.length;
}

/* ----- Quản lý thông báo (admin) ----- */
function renderAdminAnnouncements() {
  const tbody = $("#admin-announcement-table");
  if (!state.announcements.length) {
    tbody.innerHTML = `<tr><td colspan="5">Chưa có thông báo nào. Nhấn "Thêm thông báo" để tạo mới.</td></tr>`;
    return;
  }
  tbody.innerHTML = [...state.announcements]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.author || "")}</td>
        <td>${formatTime(item.timestamp)}</td>
        <td class="col-actions">
          <button class="btn btn-ghost btn-sm" data-edit-announcement="${item.id}">Sửa</button>
          <button class="btn btn-danger btn-sm" data-delete-announcement="${item.id}">Xóa</button>
        </td>
      </tr>`
    )
    .join("");

  $all("[data-edit-announcement]", tbody).forEach((btn) =>
    btn.addEventListener("click", () => openAnnouncementModal(btn.dataset.editAnnouncement))
  );
  $all("[data-delete-announcement]", tbody).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Xóa thông báo này?")) return;
      await deleteAnnouncement(btn.dataset.deleteAnnouncement);
      await refreshAnnouncements();
      renderAdminAnnouncements();
      renderAdminOverview();
      showToast("Đã xóa thông báo.", "success");
    })
  );
}

function openAnnouncementModal(id) {
  const form = $("#announcement-form");
  form.reset();
  if (id) {
    const item = state.announcements.find((a) => a.id === id);
    if (!item) return;
    $("#announcement-modal-title").textContent = "Chỉnh sửa thông báo";
    $("#announcement-id").value = item.id;
    $("#announcement-title").value = item.title;
    $("#announcement-content").value = item.content;
    $("#announcement-type").value = item.type;
  } else {
    $("#announcement-modal-title").textContent = "Thêm thông báo";
    $("#announcement-id").value = "";
  }
  openModal("modal-announcement");
}

function initAnnouncementForm() {
  $("#add-announcement-btn").addEventListener("click", () => openAnnouncementModal(null));

  $("#announcement-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("#announcement-id").value || null;
    await saveAnnouncement({
      id,
      title: $("#announcement-title").value.trim(),
      content: $("#announcement-content").value.trim(),
      type: $("#announcement-type").value,
      author: ADMIN_CREDENTIALS.username,
    });
    await refreshAnnouncements();
    renderAdminAnnouncements();
    renderAdminOverview();
    closeModal("modal-announcement");
    showToast(id ? "Đã cập nhật thông báo." : "Đã thêm thông báo mới.", "success");
  });
}

/* ----- Quản lý tuyển dụng (admin) ----- */
function renderAdminRecruitments() {
  const tbody = $("#admin-recruitment-table");
  if (!state.recruitments.length) {
    tbody.innerHTML = `<tr><td colspan="4">Chưa có tin tuyển dụng nào. Nhấn "Thêm tuyển dụng" để tạo mới.</td></tr>`;
    return;
  }
  tbody.innerHTML = [...state.recruitments]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((item) => {
      const isOpen = item.status === "open";
      return `
      <tr>
        <td>${escapeHtml(item.position)}</td>
        <td>${formatDeadline(item.deadline)}</td>
        <td><span class="badge ${isOpen ? "status-open" : "status-closed"}">${isOpen ? "Đang mở" : "Đã đóng"}</span></td>
        <td class="col-actions">
          <button class="btn btn-ghost btn-sm" data-edit-recruitment="${item.id}">Sửa</button>
          <button class="btn btn-danger btn-sm" data-delete-recruitment="${item.id}">Xóa</button>
        </td>
      </tr>`;
    })
    .join("");

  $all("[data-edit-recruitment]", tbody).forEach((btn) =>
    btn.addEventListener("click", () => openRecruitmentModal(btn.dataset.editRecruitment))
  );
  $all("[data-delete-recruitment]", tbody).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Xóa tin tuyển dụng này?")) return;
      await deleteRecruitment(btn.dataset.deleteRecruitment);
      await refreshRecruitments();
      renderAdminRecruitments();
      renderAdminOverview();
      showToast("Đã xóa tin tuyển dụng.", "success");
    })
  );
}

function openRecruitmentModal(id) {
  const form = $("#recruitment-form");
  form.reset();
  if (id) {
    const item = state.recruitments.find((r) => r.id === id);
    if (!item) return;
    $("#recruitment-modal-title").textContent = "Chỉnh sửa tuyển dụng";
    $("#recruitment-id").value = item.id;
    $("#recruitment-position").value = item.position;
    $("#recruitment-requirements").value = item.requirements;
    $("#recruitment-benefits").value = item.benefits;
    $("#recruitment-deadline").value = item.deadline;
    $("#recruitment-status").value = item.status;
  } else {
    $("#recruitment-modal-title").textContent = "Thêm tuyển dụng";
    $("#recruitment-id").value = "";
  }
  openModal("modal-recruitment");
}

function initRecruitmentForm() {
  $("#add-recruitment-btn").addEventListener("click", () => openRecruitmentModal(null));

  $("#recruitment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("#recruitment-id").value || null;
    await saveRecruitment({
      id,
      position: $("#recruitment-position").value.trim(),
      requirements: $("#recruitment-requirements").value.trim(),
      benefits: $("#recruitment-benefits").value.trim(),
      deadline: $("#recruitment-deadline").value,
      status: $("#recruitment-status").value,
    });
    await refreshRecruitments();
    renderAdminRecruitments();
    renderAdminOverview();
    closeModal("modal-recruitment");
    showToast(id ? "Đã cập nhật tin tuyển dụng." : "Đã thêm tin tuyển dụng mới.", "success");
  });
}

/* ----- Quản lý đơn đăng ký (admin) ----- */
const APPLICATION_STATUS_LABEL = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
};

function renderAdminApplications() {
  const tbody = $("#admin-application-table");
  if (!state.applications.length) {
    tbody.innerHTML = `<tr><td colspan="7">Chưa có đơn đăng ký nào.</td></tr>`;
    return;
  }
  tbody.innerHTML = [...state.applications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((item) => {
      const statusClass =
        item.status === "approved" ? "status-open" : item.status === "rejected" ? "status-closed" : "status-pending";
      return `
      <tr>
        <td>${escapeHtml(item.robloxName)}</td>
        <td>${escapeHtml(item.discordName)}</td>
        <td>${escapeHtml(item.rank)}</td>
        <td>${escapeHtml(String(item.age))}</td>
        <td>${escapeHtml(item.reason)}</td>
        <td><span class="badge ${statusClass}">${APPLICATION_STATUS_LABEL[item.status] || item.status}</span></td>
        <td class="col-actions">
          <button class="btn btn-ghost btn-sm" data-approve="${item.id}" ${item.status === "approved" ? "disabled" : ""}>Duyệt</button>
          <button class="btn btn-ghost btn-sm" data-reject="${item.id}" ${item.status === "rejected" ? "disabled" : ""}>Từ chối</button>
          <button class="btn btn-danger btn-sm" data-delete-application="${item.id}">Xóa</button>
        </td>
      </tr>`;
    })
    .join("");

  $all("[data-approve]", tbody).forEach((btn) =>
    btn.addEventListener("click", async () => {
      await approveApplication(btn.dataset.approve);
      await refreshApplications();
      renderAdminApplications();
      showToast("Đã duyệt đơn đăng ký.", "success");
    })
  );
  $all("[data-reject]", tbody).forEach((btn) =>
    btn.addEventListener("click", async () => {
      await rejectApplication(btn.dataset.reject);
      await refreshApplications();
      renderAdminApplications();
      showToast("Đã từ chối đơn đăng ký.", "success");
    })
  );
  $all("[data-delete-application]", tbody).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Xóa đơn đăng ký này?")) return;
      await deleteApplication(btn.dataset.deleteApplication);
      await refreshApplications();
      renderAdminApplications();
      renderAdminOverview();
      showToast("Đã xóa đơn đăng ký.", "success");
    })
  );
}

/* ----- Cài đặt Website (admin) ----- */
function initSettingsForm() {
  $("#settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const selectedSwatch = $(".color-swatch.selected");
    const newSettings = {
      siteName: $("#settings-name").value.trim() || DEFAULT_SETTINGS.siteName,
      logo: $("#settings-logo").value.trim(),
      banner: $("#settings-banner").value.trim(),
      background: $("#settings-background").value.trim(),
      version: $("#settings-version").value.trim() || DEFAULT_SETTINGS.version,
      color: selectedSwatch ? selectedSwatch.dataset.color : state.settings.color,
    };
    await saveSettings(newSettings);
    state.settings = newSettings;
    applySettingsToUI();
    showToast("Đã lưu cài đặt website.", "success");
  });
}

/* --------------------------------------------------------------------------
   Biểu mẫu công khai: Đăng ký tuyển dụng & Liên hệ
   -------------------------------------------------------------------------- */
function initApplyForm() {
  $("#apply-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveApplication({
      robloxName: $("#apply-roblox").value.trim(),
      discordName: $("#apply-discord").value.trim(),
      rank: $("#apply-rank").value.trim(),
      age: Number($("#apply-age").value),
      reason: $("#apply-reason").value.trim(),
    });
    await refreshApplications();
    if (state.isAdmin) {
      renderAdminApplications();
      renderAdminOverview();
    }
    $("#apply-form").style.display = "none";
    $("#apply-success").style.display = "flex";
  });
}

function initContactForm() {
  $("#contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    $("#contact-form").reset();
    showToast("Gửi liên hệ thành công. Cảm ơn bạn đã liên hệ.", "success");
  });
}

/* --------------------------------------------------------------------------
   Tải & làm mới dữ liệu
   -------------------------------------------------------------------------- */
async function refreshAnnouncements() {
  state.announcements = await loadAnnouncements();
  renderAnnouncements();
}

async function refreshRecruitments() {
  state.recruitments = await loadRecruitments();
  renderRecruitments();
}

async function refreshApplications() {
  state.applications = await loadApplications();
}

async function loadInitialData() {
  const [announcements, recruitments, applications, settings] = await Promise.all([
    loadAnnouncements(),
    loadRecruitments(),
    loadApplications(),
    loadSettings(),
  ]);
  state.announcements = announcements;
  state.recruitments = recruitments;
  state.applications = applications;
  state.settings = settings ? { ...DEFAULT_SETTINGS, ...settings } : { ...DEFAULT_SETTINGS };

  applySettingsToUI();
  renderAnnouncements();
  renderRecruitments();
}

/* --------------------------------------------------------------------------
   Bộ lọc / tìm kiếm thông báo — sự kiện
   -------------------------------------------------------------------------- */
function initAnnouncementToolbar() {
  $("#announcement-search").addEventListener("input", renderAnnouncements);
  $("#announcement-filter").addEventListener("change", renderAnnouncements);
  $("#announcement-sort").addEventListener("change", renderAnnouncements);
}

/* --------------------------------------------------------------------------
   Menu "Cập nhật" / "Nội quy" điều hướng tới bộ lọc tương ứng trong Thông báo
   -------------------------------------------------------------------------- */
function initCrossNav() {
  // Không cần xử lý thêm: hai mục này có section riêng render trực tiếp
  // từ dữ liệu Thông báo theo Loại, nên chỉ cần cuộn trang (đã xử lý bởi CSS).
}

/* --------------------------------------------------------------------------
   Footer năm hiện tại
   -------------------------------------------------------------------------- */
function initFooterYear() {
  $("#footer-year").textContent = new Date().getFullYear();
}

/* --------------------------------------------------------------------------
   Khởi chạy ứng dụng
   -------------------------------------------------------------------------- */
async function init() {
  initLoadingScreen();
  detectDevice();
  initHeaderScroll();
  initMobileMenu();
  initNavHighlight();
  initBackToTopFallback();
  initModalGeneral();
  initAdminLogin();
  initDashboardShell();
  initAnnouncementForm();
  initRecruitmentForm();
  initSettingsForm();
  initApplyForm();
  initContactForm();
  initAnnouncementToolbar();
  initCrossNav();
  initFooterYear();

  await loadInitialData();

  initRevealAnimations();
  initHeroNetwork();

  window.addEventListener("resize", detectDevice);
}

// Nút lên đầu trang đã có logic trong initHeaderScroll; hàm này giữ chỗ để
// đảm bảo phần tử luôn được gắn sự kiện dù thứ tự khởi tạo thay đổi.
function initBackToTopFallback() {}

document.addEventListener("DOMContentLoaded", init);
