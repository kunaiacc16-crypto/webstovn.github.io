/* ==========================================================================
   Roleplay Official — script.js
   Toàn bộ logic giao diện: điều hướng, hiệu ứng, đăng nhập, chat, quản trị.
   Lớp dữ liệu thực tế (Firestore/Auth/Storage) nằm trong firebase.js —
   file này chỉ gọi các hàm đó và luôn lắng nghe REALTIME (onSnapshot),
   không có bước "load 1 lần rồi thôi" nào nữa.
   ========================================================================== */

import {
  loginAdmin,
  logoutAdmin,
  loginWithGoogle,
  watchAuthState,
  checkIsAdmin,
  getUserProfile,
  updateUserProfile,
  watchAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  watchRecruitments,
  saveRecruitment,
  deleteRecruitment,
  saveApplication,
  watchApplications,
  approveApplication,
  rejectApplication,
  deleteApplication,
  watchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
} from "./firebase.js";

const DEFAULT_SETTINGS = {
  siteName: "Roleplay Official",
  version: "v1.0.0",
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😢", "😮", "🎉"];

const state = {
  announcements: [],
  recruitments: [],
  applications: [],
  messages: [],
  settings: { ...DEFAULT_SETTINGS },
  isAdmin: false,
  dashboardOpen: false,
  currentUser: null, // Firebase Auth user object
  profile: null, // { uid, shortId, displayName, avatarUrl, email, createdAt }
  chatPendingImageFile: null,
  chatFirstRenderDone: false,
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

function fallbackAvatar(name) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='#133b8a'/><text x='50%' y='54%' font-family='Arial' font-size='34' fill='#f5f8fc' text-anchor='middle'>${initial}</text></svg>`
    )
  );
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
   Hiệu ứng nền mạng lưới trong Trang chủ
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
   Cấu hình cơ bản (tên website / phiên bản)
   -------------------------------------------------------------------------- */
function applySettingsToUI() {
  const s = state.settings;
  document.title = s.siteName;

  $all("#brand-name-header").forEach((el) => (el.textContent = s.siteName));
  $all("#hero-site-name").forEach((el) => (el.textContent = s.siteName));
  $all("#footer-site-name").forEach((el) => (el.textContent = s.siteName));
  $all("#brand-version-header, #hero-version").forEach((el) => (el.textContent = s.version));
  $("#footer-version").textContent = `Phiên bản ${s.version}`;

  const initials =
    s.siteName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "RO";

  $all(".brand-mark span").forEach((span) => {
    span.textContent = initials;
  });
}

/* --------------------------------------------------------------------------
   Render: Thông báo
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

  updateHeroStats();
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
   Đăng nhập Google & hồ sơ người dùng (header)
   -------------------------------------------------------------------------- */
function initGoogleLogin() {
  $("#google-login-btn").addEventListener("click", async () => {
    try {
      await loginWithGoogle();
      showToast("Đăng nhập thành công.", "success");
    } catch (error) {
      console.error("[Đăng nhập Google] Lỗi:", error.code || error);
      if (error.code !== "auth/popup-closed-by-user") {
        showToast("Đăng nhập thất bại, vui lòng thử lại.", "error");
      }
    }
  });
}

function initUserChip() {
  const chip = $("#user-chip");
  chip.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    chip.classList.toggle("open");
  });
  document.addEventListener("click", (event) => {
    if (!chip.contains(event.target)) chip.classList.remove("open");
  });

  $("#user-chip-edit").addEventListener("click", () => {
    chip.classList.remove("open");
    openEditProfileModal();
  });

  $("#user-chip-logout").addEventListener("click", async () => {
    chip.classList.remove("open");
    await logoutAdmin();
    showToast("Đã đăng xuất.", "success");
  });
}

// Cập nhật toàn bộ giao diện phụ thuộc trạng thái đăng nhập: chip header,
// khả năng gửi chat, và cờ isAdmin dùng cho bảng điều khiển.
function applyAuthStateToUI({ user, profile, isAdmin }) {
  state.currentUser = user;
  state.profile = profile;
  state.isAdmin = isAdmin;

  const loginBtn = $("#google-login-btn");
  const chip = $("#user-chip");

  if (user && profile) {
    loginBtn.style.display = "none";
    chip.style.display = "flex";
    $("#user-chip-avatar").src = profile.avatarUrl || fallbackAvatar(profile.displayName);
    $("#user-chip-name").textContent = profile.displayName || "Người dùng";
  } else {
    loginBtn.style.display = "inline-flex";
    chip.style.display = "none";
    chip.classList.remove("open");
  }

  updateChatComposerAvailability();

  if (state.dashboardOpen && !isAdmin) {
    // Người dùng đã đăng xuất hoặc mất quyền trong lúc đang mở dashboard.
    closeDashboard();
  }
}

/* --------------------------------------------------------------------------
   Chỉnh sửa hồ sơ
   -------------------------------------------------------------------------- */
function openEditProfileModal() {
  if (!state.profile) {
    showToast("Bạn cần đăng nhập trước.", "error");
    return;
  }
  const form = $("#edit-profile-form");
  form.reset();
  $("#edit-profile-name").value = state.profile.displayName || "";
  $("#edit-profile-shortid").textContent = state.profile.shortId || "------";
  $("#edit-profile-avatar-preview").src = state.profile.avatarUrl || fallbackAvatar(state.profile.displayName);
  openModal("modal-edit-profile");
}

function initEditProfileForm() {
  let pendingAvatarFile = null;

  $("#edit-profile-avatar-input").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    pendingAvatarFile = file;
    $("#edit-profile-avatar-preview").src = URL.createObjectURL(file);
  });

  $("#edit-profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser) return;
    const submitBtn = $("#edit-profile-submit");
    submitBtn.disabled = true;
    try {
      await updateUserProfile(state.currentUser.uid, {
        displayName: $("#edit-profile-name").value,
        avatarFile: pendingAvatarFile,
      });
      const fresh = await getUserProfile(state.currentUser.uid);
      state.profile = fresh;
      $("#user-chip-avatar").src = fresh.avatarUrl || fallbackAvatar(fresh.displayName);
      $("#user-chip-name").textContent = fresh.displayName || "Người dùng";
      pendingAvatarFile = null;
      closeModal("modal-edit-profile");
      showToast("Đã cập nhật hồ sơ.", "success");
    } catch (error) {
      console.error(error);
      showToast("Cập nhật thất bại, vui lòng thử lại.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* --------------------------------------------------------------------------
   Xem hồ sơ người khác
   -------------------------------------------------------------------------- */
async function openViewProfileModal(uid) {
  if (!uid) return;
  try {
    const profile = await getUserProfile(uid);
    if (!profile) {
      showToast("Không tìm thấy hồ sơ này.", "error");
      return;
    }
    $("#view-profile-avatar").src = profile.avatarUrl || fallbackAvatar(profile.displayName);
    $("#view-profile-name").textContent = profile.displayName || "Người dùng";
    $("#view-profile-id").textContent = profile.shortId || "------";
    $("#view-profile-created").textContent = formatTime(profile.createdAt);

    const isOwnProfile = state.currentUser && state.currentUser.uid === uid;
    $("#view-profile-email-row").style.display = isOwnProfile ? "flex" : "none";
    if (isOwnProfile) $("#view-profile-email").textContent = profile.email || "—";

    openModal("modal-view-profile");
  } catch (error) {
    console.error(error);
    showToast("Không thể tải hồ sơ.", "error");
  }
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

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("#login-username").value.trim();
    const password = $("#login-password").value;
    const submitBtn = $("#login-submit-btn");

    submitBtn.disabled = true;
    $("#login-error").classList.remove("show");

    try {
      const user = await loginAdmin(email, password);
      const isAdmin = await checkIsAdmin(user.uid);

      if (!isAdmin) {
        $("#login-error").textContent = "Tài khoản này không có quyền quản trị.";
        $("#login-error").classList.add("show");
        await logoutAdmin();
        return;
      }

      // Không chờ watchAuthState (tránh race condition khiến dashboard
      // không mở được) — cập nhật cờ và mở dashboard ngay tại đây.
      state.isAdmin = true;
      closeModal("modal-login");
      showToast("Đăng nhập quản trị thành công.", "success");
      openDashboard();
    } catch (error) {
      console.error("[Đăng nhập quản trị] Lỗi:", error.code || error);
      $("#login-error").textContent = "Email hoặc mật khẩu không đúng.";
      $("#login-error").classList.add("show");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function openDashboard() {
  if (!state.isAdmin) {
    showToast("Bạn cần đăng nhập quản trị trước.", "error");
    return;
  }
  state.dashboardOpen = true;
  $("#admin-dashboard").classList.add("open");
  document.body.classList.add("no-scroll");
  renderAdminOverview();
  renderAdminAnnouncements();
  renderAdminRecruitments();
  renderAdminApplications();
}

function closeDashboard() {
  state.dashboardOpen = false;
  $("#admin-dashboard").classList.remove("open");
  document.body.classList.remove("no-scroll");
}

function initDashboardShell() {
  $("#dash-close-btn").addEventListener("click", closeDashboard);
  $("#dash-logout-btn").addEventListener("click", async () => {
    await logoutAdmin();
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
      try {
        await deleteAnnouncement(btn.dataset.deleteAnnouncement);
        showToast("Đã xóa thông báo.", "success");
      } catch (error) {
        console.error(error);
        showToast("Xóa thất bại, kiểm tra lại đăng nhập.", "error");
      }
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
    try {
      await saveAnnouncement({
        id,
        title: $("#announcement-title").value.trim(),
        content: $("#announcement-content").value.trim(),
        type: $("#announcement-type").value,
        author: state.profile?.displayName || "Quản trị viên",
      });
      closeModal("modal-announcement");
      showToast(id ? "Đã cập nhật thông báo." : "Đã thêm thông báo mới.", "success");
    } catch (error) {
      console.error(error);
      showToast("Lưu thất bại, kiểm tra lại đăng nhập.", "error");
    }
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
      try {
        await deleteRecruitment(btn.dataset.deleteRecruitment);
        showToast("Đã xóa tin tuyển dụng.", "success");
      } catch (error) {
        console.error(error);
        showToast("Xóa thất bại, kiểm tra lại đăng nhập.", "error");
      }
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
    try {
      await saveRecruitment({
        id,
        position: $("#recruitment-position").value.trim(),
        requirements: $("#recruitment-requirements").value.trim(),
        benefits: $("#recruitment-benefits").value.trim(),
        deadline: $("#recruitment-deadline").value,
        status: $("#recruitment-status").value,
      });
      closeModal("modal-recruitment");
      showToast(id ? "Đã cập nhật tin tuyển dụng." : "Đã thêm tin tuyển dụng mới.", "success");
    } catch (error) {
      console.error(error);
      showToast("Lưu thất bại, kiểm tra lại đăng nhập.", "error");
    }
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
      try {
        await approveApplication(btn.dataset.approve);
        showToast("Đã duyệt đơn đăng ký.", "success");
      } catch (error) {
        console.error(error);
        showToast("Thao tác thất bại, kiểm tra lại đăng nhập.", "error");
      }
    })
  );
  $all("[data-reject]", tbody).forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        await rejectApplication(btn.dataset.reject);
        showToast("Đã từ chối đơn đăng ký.", "success");
      } catch (error) {
        console.error(error);
        showToast("Thao tác thất bại, kiểm tra lại đăng nhập.", "error");
      }
    })
  );
  $all("[data-delete-application]", tbody).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Xóa đơn đăng ký này?")) return;
      try {
        await deleteApplication(btn.dataset.deleteApplication);
        showToast("Đã xóa đơn đăng ký.", "success");
      } catch (error) {
        console.error(error);
        showToast("Xóa thất bại, kiểm tra lại đăng nhập.", "error");
      }
    })
  );
}

/* --------------------------------------------------------------------------
   Biểu mẫu công khai: Đăng ký tuyển dụng & Liên hệ
   -------------------------------------------------------------------------- */
function initApplyForm() {
  $("#apply-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveApplication({
        robloxName: $("#apply-roblox").value.trim(),
        discordName: $("#apply-discord").value.trim(),
        rank: $("#apply-rank").value.trim(),
        age: Number($("#apply-age").value),
        reason: $("#apply-reason").value.trim(),
      });
      $("#apply-form").style.display = "none";
      $("#apply-success").style.display = "flex";
    } catch (error) {
      console.error(error);
      showToast("Gửi đơn thất bại, vui lòng thử lại.", "error");
    }
  });
}

function initContactForm() {
  $("#contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    $("#contact-form").reset();
    showToast("Gửi liên hệ thành công. Cảm ơn bạn đã liên hệ.", "success");
  });
}

/* ==========================================================================
   CHAT TOÀN CỤC
   ========================================================================== */
function isChatNearBottom(container) {
  return container.scrollHeight - container.scrollTop - container.clientHeight < 80;
}

function scrollChatToBottom(smooth = false) {
  const container = $("#chat-messages");
  container.scrollTo({ top: container.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  $("#chat-scroll-jump").classList.remove("show");
}

function reactionChipsHtml(message) {
  const uid = state.currentUser?.uid;
  const reactions = message.reactions || {};
  return Object.entries(reactions)
    .filter(([, uids]) => uids && uids.length)
    .map(([emoji, uids]) => {
      const mine = uid && uids.includes(uid) ? "mine" : "";
      return `<button type="button" class="chat-reaction-chip ${mine}" data-react="${message.id}" data-emoji="${emoji}">${emoji} ${uids.length}</button>`;
    })
    .join("");
}

function chatMessageHtml(message) {
  const isMine = state.currentUser && state.currentUser.uid === message.uid;
  const avatar = message.avatarUrl || fallbackAvatar(message.displayName);
  const imageBlock = message.imageUrl
    ? `<div class="chat-msg-image" data-view-image="${message.imageUrl}"><img src="${message.imageUrl}" alt="Ảnh đính kèm" loading="lazy" /></div>`
    : "";
  const textBlock = message.text ? `<p class="chat-msg-text" data-msg-text="${message.id}">${escapeHtml(message.text)}</p>` : "";
  const editedBlock = message.editedAt ? `<span class="chat-msg-edited">(đã chỉnh sửa)</span>` : "";

  const reactionButtons = REACTION_EMOJIS.map(
    (emoji) => `<button type="button" data-pick-emoji="${message.id}" data-emoji="${emoji}">${emoji}</button>`
  ).join("");

  const ownerActions = isMine
    ? `
      <button type="button" data-edit-msg="${message.id}">Sửa</button>
      <button type="button" data-delete-msg="${message.id}">Xóa</button>
    `
    : "";

  return `
    <div class="chat-msg" data-message-id="${message.id}">
      <img class="chat-msg-avatar" src="${avatar}" alt="" data-view-profile="${message.uid}" />
      <div class="chat-msg-body">
        <div class="chat-msg-head">
          <span class="chat-msg-name" data-view-profile="${message.uid}">${escapeHtml(message.displayName || "Người dùng")}</span>
          <span class="chat-msg-time">${formatTime(message.timestamp)}</span>
          ${editedBlock}
        </div>
        ${textBlock}
        ${imageBlock}
        <div class="chat-reactions">${reactionChipsHtml(message)}</div>
        <div class="chat-msg-actions">
          <div class="chat-reaction-picker">
            <button type="button" class="chat-reaction-add" data-toggle-picker="${message.id}">😊+</button>
            <div class="chat-reaction-options" id="picker-${message.id}">${reactionButtons}</div>
          </div>
          ${ownerActions}
        </div>
      </div>
    </div>
  `;
}

function renderChatMessages() {
  const container = $("#chat-messages");
  const wasAtBottom = !state.chatFirstRenderDone || isChatNearBottom(container);

  container.innerHTML = state.messages.length
    ? state.messages.map(chatMessageHtml).join("")
    : `
      <div class="empty-state" id="chat-empty">
        <div class="empty-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h3>Chưa có tin nhắn</h3>
        <p>Hãy là người đầu tiên bắt đầu cuộc trò chuyện.</p>
      </div>
    `;

  attachChatMessageHandlers(container);

  if (wasAtBottom) {
    scrollChatToBottom();
  } else {
    $("#chat-scroll-jump").classList.add("show");
  }
  state.chatFirstRenderDone = true;
}

function attachChatMessageHandlers(container) {
  $all("[data-view-profile]", container).forEach((el) =>
    el.addEventListener("click", () => openViewProfileModal(el.dataset.viewProfile))
  );

  $all("[data-view-image]", container).forEach((el) =>
    el.addEventListener("click", () => {
      $("#image-view-full").src = el.dataset.viewImage;
      openModal("modal-image-view");
    })
  );

  $all("[data-toggle-picker]", container).forEach((btn) =>
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const picker = $(`#picker-${btn.dataset.togglePicker}`);
      const wasOpen = picker.classList.contains("open");
      $all(".chat-reaction-options.open", container).forEach((el) => el.classList.remove("open"));
      if (!wasOpen) picker.classList.add("open");
    })
  );

  $all("[data-pick-emoji]", container).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!state.currentUser) {
        showToast("Đăng nhập Google để thả cảm xúc.", "error");
        return;
      }
      try {
        await toggleReaction(btn.dataset.pickEmoji, btn.dataset.emoji, state.currentUser.uid);
      } catch (error) {
        console.error(error);
        showToast("Không thể thả cảm xúc lúc này.", "error");
      }
    })
  );

  $all("[data-react]", container).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!state.currentUser) {
        showToast("Đăng nhập Google để thả cảm xúc.", "error");
        return;
      }
      try {
        await toggleReaction(btn.dataset.react, btn.dataset.emoji, state.currentUser.uid);
      } catch (error) {
        console.error(error);
        showToast("Không thể thả cảm xúc lúc này.", "error");
      }
    })
  );

  $all("[data-delete-msg]", container).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Xóa tin nhắn này?")) return;
      try {
        await deleteMessage(btn.dataset.deleteMsg);
      } catch (error) {
        console.error(error);
        showToast("Xóa thất bại.", "error");
      }
    })
  );

  $all("[data-edit-msg]", container).forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.editMsg;
      const textEl = $(`[data-msg-text="${id}"]`, container);
      if (!textEl) return;
      const currentText = textEl.textContent;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "chat-msg-edit-input";
      input.value = currentText;
      textEl.replaceWith(input);
      input.focus();
      input.select();

      async function commit() {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
          try {
            await editMessage(id, newText);
          } catch (error) {
            console.error(error);
            showToast("Sửa tin nhắn thất bại.", "error");
          }
        }
      }

      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.blur();
        }
        if (event.key === "Escape") {
          renderChatMessages();
        }
      });
      input.addEventListener("blur", commit);
    })
  );

  // Đóng picker reaction khi bấm ra ngoài.
  document.addEventListener(
    "click",
    () => $all(".chat-reaction-options.open", container).forEach((el) => el.classList.remove("open")),
    { once: true }
  );
}

function updateChatComposerAvailability() {
  const composer = $("#chat-composer");
  const hint = $("#chat-login-hint");
  const loggedIn = Boolean(state.currentUser);
  composer.classList.toggle("disabled", !loggedIn);
  hint.style.display = loggedIn ? "none" : "block";
}

function initChatComposer() {
  const attachBtn = $("#chat-attach-btn");
  const fileInput = $("#chat-image-input");
  const preview = $("#chat-image-preview");
  const previewImg = $("#chat-image-preview-img");
  const textInput = $("#chat-text-input");
  const composer = $("#chat-composer");

  attachBtn.addEventListener("click", () => {
    if (!state.currentUser) {
      showToast("Đăng nhập Google để gửi ảnh.", "error");
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    state.chatPendingImageFile = file;
    previewImg.src = URL.createObjectURL(file);
    preview.style.display = "flex";
  });

  $("#chat-image-preview-remove").addEventListener("click", () => {
    state.chatPendingImageFile = null;
    fileInput.value = "";
    preview.style.display = "none";
  });

  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser || !state.profile) {
      showToast("Đăng nhập Google để gửi tin nhắn.", "error");
      return;
    }
    const text = textInput.value.trim();
    const imageFile = state.chatPendingImageFile;
    if (!text && !imageFile) return; // Text rỗng và không có ảnh => không gửi.

    const sendBtn = $("#chat-send-btn");
    sendBtn.disabled = true;
    try {
      await sendMessage({
        uid: state.currentUser.uid,
        displayName: state.profile.displayName,
        avatarUrl: state.profile.avatarUrl,
        text,
        imageFile,
      });
      textInput.value = "";
      state.chatPendingImageFile = null;
      fileInput.value = "";
      preview.style.display = "none";
    } catch (error) {
      console.error(error);
      showToast("Gửi tin nhắn thất bại.", "error");
    } finally {
      sendBtn.disabled = false;
    }
  });

  $("#chat-scroll-jump").addEventListener("click", () => scrollChatToBottom(true));

  $("#chat-messages").addEventListener("scroll", () => {
    if (isChatNearBottom($("#chat-messages"))) {
      $("#chat-scroll-jump").classList.remove("show");
    }
  });
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
   Footer năm hiện tại
   -------------------------------------------------------------------------- */
function initFooterYear() {
  $("#footer-year").textContent = new Date().getFullYear();
}

/* --------------------------------------------------------------------------
   Đăng ký lắng nghe dữ liệu Firestore realtime
   -------------------------------------------------------------------------- */
function subscribeRealtimeData() {
  watchAnnouncements((items) => {
    state.announcements = items;
    renderAnnouncements();
    if (state.dashboardOpen) {
      renderAdminAnnouncements();
      renderAdminOverview();
    }
  });

  watchRecruitments((items) => {
    state.recruitments = items;
    renderRecruitments();
    if (state.dashboardOpen) {
      renderAdminRecruitments();
      renderAdminOverview();
    }
  });

  watchApplications((items) => {
    state.applications = items;
    if (state.dashboardOpen) {
      renderAdminApplications();
      renderAdminOverview();
    }
  });

  watchMessages((items) => {
    state.messages = items;
    renderChatMessages();
  });

  watchAuthState(applyAuthStateToUI);
}

/* --------------------------------------------------------------------------
   Khởi chạy ứng dụng
   -------------------------------------------------------------------------- */
function init() {
  initLoadingScreen();
  detectDevice();
  initHeaderScroll();
  initMobileMenu();
  initNavHighlight();
  initModalGeneral();
  initGoogleLogin();
  initUserChip();
  initEditProfileForm();
  initAdminLogin();
  initDashboardShell();
  initAnnouncementForm();
  initRecruitmentForm();
  initApplyForm();
  initContactForm();
  initChatComposer();
  initAnnouncementToolbar();
  initFooterYear();

  state.settings = { ...DEFAULT_SETTINGS };
  applySettingsToUI();

  subscribeRealtimeData();

  initRevealAnimations();
  initHeroNetwork();

  window.addEventListener("resize", detectDevice);
}

document.addEventListener("DOMContentLoaded", init);
