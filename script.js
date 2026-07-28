/* ==========================================================================
   STOVN — SCRIPT.JS
   Toàn bộ logic: điều hướng, dữ liệu mẫu, đăng nhập Roblox (mô phỏng),
   trang quản trị (CRUD), tìm kiếm/lọc, hiệu ứng cuộn, v.v.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     0. KHÓA LƯU TRỮ (localStorage)
  ------------------------------------------------------------------ */
  const STORAGE_KEY = "stovn_data_v1";
  const SESSION_KEY = "stovn_session_v1";
  const ADMIN_KEY = "stovn_admin_session_v1";

  /* ------------------------------------------------------------------
     1. DỮ LIỆU MẶC ĐỊNH (dùng khi chưa có dữ liệu trong localStorage)
  ------------------------------------------------------------------ */
  function getDefaultData() {
    return {
      announcements: [
        {
          id: "a1",
          title: "Bảo trì máy chủ định kỳ tuần này",
          date: "2026-07-25",
          author: "Ban Quản Trị STOVN",
          content:
            "Máy chủ STOVN sẽ tạm ngưng hoạt động để bảo trì định kỳ nhằm nâng cao hiệu năng và độ ổn định. Thời gian dự kiến từ 02:00 đến 05:00 sáng. Mong người chơi thông cảm.",
          tag: "bao-tri",
        },
        {
          id: "a2",
          title: "Cảnh báo: Xử lý nghiêm hành vi gian lận",
          date: "2026-07-22",
          author: "Đội Kiểm Duyệt",
          content:
            "STOVN sẽ khóa vĩnh viễn mọi tài khoản sử dụng phần mềm hack, script bên thứ ba hoặc lợi dụng lỗi hệ thống để trục lợi. Vui lòng chơi công bằng để bảo vệ cộng đồng.",
          tag: "quan-trong",
        },
        {
          id: "a3",
          title: "Ra mắt bản đồ mới: Thành Phố Bóng Đêm",
          date: "2026-07-18",
          author: "Đội Phát Triển",
          content:
            "Bản đồ mới với hệ thống ánh sáng động và nhiều thử thách ẩn đã chính thức ra mắt. Khám phá ngay để nhận phần thưởng giới hạn thời gian.",
          tag: "cap-nhat",
        },
        {
          id: "a4",
          title: "Sự kiện mùa hè: Săn Kho Báu STOVN",
          date: "2026-07-10",
          author: "Ban Sự Kiện",
          content:
            "Tham gia sự kiện săn kho báu mùa hè để nhận các vật phẩm trang trí độc quyền. Sự kiện kéo dài đến hết ngày 15/08.",
          tag: "su-kien",
        },
      ],
      recruitment: [
        {
          id: "r1",
          title: "Kiểm Duyệt Viên (Moderator)",
          status: "open",
          conditions: [
            "Từ 16 tuổi trở lên",
            "Có kinh nghiệm quản lý cộng đồng Roblox",
            "Online tối thiểu 10 giờ/tuần",
          ],
          benefits: [
            "Danh hiệu độc quyền trong game",
            "Trang phục Moderator giới hạn",
            "Tham gia họp đội ngũ hằng tuần",
          ],
        },
        {
          id: "r2",
          title: "Nhà Thiết Kế Bản Đồ (Map Builder)",
          status: "open",
          conditions: [
            "Thành thạo công cụ dựng bản đồ Roblox Studio",
            "Có portfolio bản đồ đã thực hiện",
            "Sáng tạo, chịu được deadline",
          ],
          benefits: [
            "Ghi công tên trong bản đồ phát hành",
            "Thưởng theo dự án",
            "Cơ hội trở thành thành viên chính thức",
          ],
        },
        {
          id: "r3",
          title: "Biên Tập Nội Dung Cộng Đồng",
          status: "closed",
          conditions: [
            "Viết nội dung tốt, sáng tạo",
            "Hiểu rõ văn hóa cộng đồng STOVN",
          ],
          benefits: ["Danh hiệu Content Creator", "Ưu tiên tham gia beta test"],
        },
      ],
      updates: [
        {
          id: "u1",
          version: "v3.2.0",
          date: "2026-07-25",
          changes: [
            "Thêm bản đồ Thành Phố Bóng Đêm",
            "Cân bằng lại hệ thống vũ khí cận chiến",
            "Sửa lỗi va chạm tại khu vực bến cảng",
          ],
        },
        {
          id: "u2",
          version: "v3.1.4",
          date: "2026-07-12",
          changes: [
            "Tối ưu hiệu năng cho thiết bị cấu hình thấp",
            "Sửa lỗi mất vật phẩm khi thoát đột ngột",
          ],
        },
        {
          id: "u3",
          version: "v3.1.0",
          date: "2026-06-28",
          changes: [
            "Ra mắt hệ thống bang hội (Guild)",
            "Thêm 12 trang phục mùa hè mới",
            "Cải thiện giao diện bảng xếp hạng",
          ],
        },
      ],
      events: [
        {
          id: "e1",
          title: "Giải Đấu STOVN Mùa Hè 2026",
          date: "2026-08-01",
          author: "Ban Tổ Chức",
          content:
            "Giải đấu xếp hạng dành cho tất cả người chơi với tổng giải thưởng lớn bằng vật phẩm giới hạn. Đăng ký ngay trong game.",
          tag: "su-kien",
        },
        {
          id: "e2",
          title: "Đêm Hội Hóa Trang STOVN",
          date: "2026-08-10",
          author: "Ban Sự Kiện",
          content:
            "Hóa thân thành nhân vật yêu thích và tham gia diễu hành nhận thưởng trang phục độc quyền.",
          tag: "su-kien",
        },
      ],
      rules: [
        {
          title: "Tôn trọng cộng đồng",
          desc: "Không sử dụng ngôn từ thù ghét, phân biệt đối xử hoặc quấy rối người chơi khác dưới mọi hình thức.",
        },
        {
          title: "Không gian lận, hack",
          desc: "Nghiêm cấm sử dụng phần mềm bên thứ ba, script hoặc khai thác lỗi hệ thống để trục lợi.",
        },
        {
          title: "Không giao dịch ngoài luồng",
          desc: "Mọi giao dịch vật phẩm, tiền tệ ngoài hệ thống chính thức của STOVN đều không được bảo vệ.",
        },
        {
          title: "Tuân thủ hướng dẫn quản trị viên",
          desc: "Người chơi cần tuân thủ hướng dẫn và quyết định của đội ngũ kiểm duyệt trong mọi tình huống.",
        },
        {
          title: "Bảo mật tài khoản",
          desc: "STOVN không chịu trách nhiệm nếu tài khoản bị mất do người chơi tự ý chia sẻ thông tin đăng nhập.",
        },
      ],
      guide: [
        {
          title: "Liên kết tài khoản Roblox",
          desc: "Nhấn 'Đăng nhập Roblox' ở góc phải thanh điều hướng để liên kết tài khoản của bạn với STOVN.",
        },
        {
          title: "Theo dõi thông báo",
          desc: "Ghé trang Thông báo thường xuyên để không bỏ lỡ tin tức, sự kiện và lịch bảo trì.",
        },
        {
          title: "Tham gia sự kiện",
          desc: "Kiểm tra trang Sự kiện để tham gia các hoạt động giới hạn thời gian và nhận phần thưởng.",
        },
        {
          title: "Cập nhật phiên bản mới",
          desc: "Xem trang Cập nhật game để nắm rõ các thay đổi mới nhất trước khi vào chơi.",
        },
        {
          title: "Cần hỗ trợ?",
          desc: "Sử dụng trang Liên hệ hoặc tham gia Discord cộng đồng để được đội ngũ STOVN hỗ trợ nhanh nhất.",
        },
        {
          title: "Ứng tuyển đội ngũ",
          desc: "Xem trang Thông báo tuyển dụng nếu bạn muốn trở thành một phần chính thức của đội ngũ STOVN.",
        },
      ],
      users: [], // Danh sách tài khoản Roblox đã từng liên kết (dành cho quản trị)
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Không thể đọc dữ liệu STOVN, dùng dữ liệu mặc định.", e);
    }
    const def = getDefaultData();
    saveData(def);
    return def;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let DB = loadData();

  /* ------------------------------------------------------------------
     2. TIỆN ÍCH CHUNG
  ------------------------------------------------------------------ */
  function genId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function formatDate(isoStr) {
    if (!isoStr) return "—";
    const d = new Date(isoStr);
    if (isNaN(d)) return isoStr;
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const TAG_LABELS = {
    "quan-trong": "Quan trọng",
    "bao-tri": "Bảo trì",
    "cap-nhat": "Cập nhật",
    "su-kien": "Sự kiện",
  };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function linesToList(text) {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function showToast(message, type) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast" + (type ? " toast-" + type : "");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast-out");
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  }

  /* ------------------------------------------------------------------
     3. MÔ PHỎNG ĐĂNG NHẬP ROBLOX OAUTH
     ------------------------------------------------------------------
     Đây là bản MÔ PHỎNG để tiện phát triển giao diện trước.
     Khi tích hợp API Roblox thật, chỉ cần thay nội dung hàm này bằng
     luồng OAuth thật (redirect tới Roblox, nhận access_token, gọi
     https://users.roblox.com/v1/users/{userId} để lấy thông tin, và
     https://thumbnails.roblox.com/v1/users/avatar-headshot để lấy avatar).
  ------------------------------------------------------------------ */
  function mockRobloxOAuth(username) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const userId = 900000000 + Math.floor(Math.random() * 99999999);
        const profile = {
          username: username,
          displayName: username,
          userId: userId,
          // Avatar giả lập — thay bằng API Roblox Thumbnails khi có backend thật
          avatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=" + encodeURIComponent(username + userId),
          role: "Thành viên",
          linkDate: new Date().toISOString(),
        };
        resolve(profile);
      }, 1400); // giả lập độ trễ mạng khi ủy quyền OAuth
    });
  }

  /* ------------------------------------------------------------------
     4. QUẢN LÝ PHIÊN ĐĂNG NHẬP (SESSION)
  ------------------------------------------------------------------ */
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isAdminLoggedIn() {
    return sessionStorage.getItem(ADMIN_KEY) === "true";
  }

  /* ------------------------------------------------------------------
     5. ĐIỀU HƯỚNG GIỮA CÁC TRANG (SPA ROUTING)
  ------------------------------------------------------------------ */
  const PAGE_IDS = [
    "home", "announcements", "recruitment", "updates",
    "events", "rules", "guide", "contact", "profile", "admin",
  ];

  function navigateTo(pageName, skipHash) {
    if (!PAGE_IDS.includes(pageName)) pageName = "home";

    document.querySelectorAll(".page").forEach((el) => el.classList.remove("is-active"));
    const target = document.getElementById("page-" + pageName);
    if (target) target.classList.add("is-active");

    document.querySelectorAll(".nav-link").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.page === pageName);
    });

    if (!skipHash) {
      history.replaceState(null, "", "#" + pageName);
    }

    // Đóng menu mobile nếu đang mở
    document.getElementById("nav-links").classList.remove("is-open");
    document.getElementById("hamburger").classList.remove("is-active");

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Gọi hàm render riêng cho từng trang khi cần
    if (pageName === "profile") renderProfile();
    if (pageName === "admin") renderAdminGate();

    initRevealObserver(); // quan sát lại các phần tử .reveal mới xuất hiện
  }

  function initRouterEvents() {
    document.body.addEventListener("click", (e) => {
      const link = e.target.closest("[data-page]");
      if (!link) return;
      e.preventDefault();
      navigateTo(link.dataset.page);
    });

    window.addEventListener("hashchange", () => {
      const page = location.hash.replace("#", "") || "home";
      navigateTo(page, true);
    });
  }

  /* ------------------------------------------------------------------
     6. RENDER: TRANG CHỦ
  ------------------------------------------------------------------ */
  function renderHome() {
    document.getElementById("stat-announcements").textContent = DB.announcements.length;
    document.getElementById("stat-version").textContent = DB.updates[0] ? DB.updates[0].version : "—";

    const wrap = document.getElementById("home-recent-announcements");
    const recent = [...DB.announcements]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
    wrap.innerHTML = recent.map(announcementCardHtml).join("");
  }

  /* ------------------------------------------------------------------
     7. RENDER: THÔNG BÁO
  ------------------------------------------------------------------ */
  function announcementCardHtml(item) {
    return `
      <article class="card glass-card reveal">
        <div class="card-top">
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          <span class="tag tag-${item.tag}">${TAG_LABELS[item.tag] || item.tag}</span>
        </div>
        <div class="card-meta">
          <span>${formatDate(item.date)}</span>
          <span>${escapeHtml(item.author)}</span>
        </div>
        <p class="card-body">${escapeHtml(item.content)}</p>
      </article>`;
  }

  let currentAnnFilter = "all";
  let currentAnnSearch = "";

  function renderAnnouncements() {
    const list = document.getElementById("announcements-list");
    const emptyState = document.getElementById("announcements-empty");

    let items = [...DB.announcements].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (currentAnnFilter !== "all") {
      items = items.filter((i) => i.tag === currentAnnFilter);
    }
    if (currentAnnSearch.trim()) {
      const q = currentAnnSearch.trim().toLowerCase();
      items = items.filter(
        (i) => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q)
      );
    }

    list.innerHTML = items.map(announcementCardHtml).join("");
    emptyState.hidden = items.length !== 0;
    initRevealObserver();
  }

  /* ------------------------------------------------------------------
     8. RENDER: TUYỂN DỤNG
  ------------------------------------------------------------------ */
  function renderRecruitment() {
    const wrap = document.getElementById("recruitment-list");
    wrap.innerHTML = DB.recruitment
      .map(
        (item) => `
      <article class="recruit-card glass-card reveal">
        <div class="recruit-head">
          <h3 class="recruit-title">${escapeHtml(item.title)}</h3>
          <span class="status-pill status-${item.status}">${item.status === "open" ? "Còn tuyển" : "Đã đóng"}</span>
        </div>
        <div>
          <p class="recruit-sub">Điều kiện</p>
          <ul class="recruit-list">${item.conditions.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
        </div>
        <div>
          <p class="recruit-sub">Quyền lợi</p>
          <ul class="recruit-list">${item.benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
        </div>
        <button class="btn ${item.status === "open" ? "btn-primary" : "btn-ghost"} btn-block" ${item.status !== "open" ? "disabled" : ""} data-apply="${item.id}">
          ${item.status === "open" ? "Đăng ký" : "Đã đóng tuyển"}
        </button>
      </article>`
      )
      .join("");

    wrap.querySelectorAll("[data-apply]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const session = getSession();
        if (!session) {
          showToast("Vui lòng đăng nhập Roblox trước khi đăng ký.", "error");
          openLoginModal();
          return;
        }
        showToast("Đã gửi đăng ký ứng tuyển thành công!", "success");
      });
    });
    initRevealObserver();
  }

  /* ------------------------------------------------------------------
     9. RENDER: CẬP NHẬT GAME (TIMELINE)
  ------------------------------------------------------------------ */
  function renderUpdates() {
    const wrap = document.getElementById("updates-timeline");
    const items = [...DB.updates].sort((a, b) => new Date(b.date) - new Date(a.date));
    wrap.innerHTML = items
      .map(
        (u) => `
      <div class="timeline-item reveal">
        <div class="timeline-card glass-card">
          <div class="timeline-version">${escapeHtml(u.version)}</div>
          <div class="timeline-date">${formatDate(u.date)}</div>
          <ul class="timeline-changes">${u.changes.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
        </div>
      </div>`
      )
      .join("");
    initRevealObserver();
  }

  /* ------------------------------------------------------------------
     10. RENDER: SỰ KIỆN
  ------------------------------------------------------------------ */
  function renderEvents() {
    const wrap = document.getElementById("events-list");
    wrap.innerHTML = DB.events.map(announcementCardHtml).join("");
    initRevealObserver();
  }

  /* ------------------------------------------------------------------
     11. RENDER: NỘI QUY & HƯỚNG DẪN
  ------------------------------------------------------------------ */
  function renderRules() {
    const wrap = document.getElementById("rules-list");
    wrap.innerHTML = DB.rules
      .map(
        (r, idx) => `
      <div class="rule-item glass-card reveal">
        <span class="rule-num">${String(idx + 1).padStart(2, "0")}</span>
        <div class="rule-text">
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.desc)}</p>
        </div>
      </div>`
      )
      .join("");
    initRevealObserver();
  }

  function renderGuide() {
    const wrap = document.getElementById("guide-list");
    wrap.innerHTML = DB.guide
      .map(
        (g, idx) => `
      <div class="guide-card glass-card reveal">
        <div class="guide-step">${idx + 1}</div>
        <h3>${escapeHtml(g.title)}</h3>
        <p>${escapeHtml(g.desc)}</p>
      </div>`
      )
      .join("");
    initRevealObserver();
  }

  /* ------------------------------------------------------------------
     12. RENDER: HỒ SƠ NGƯỜI DÙNG
  ------------------------------------------------------------------ */
  function renderProfile() {
    const session = getSession();
    const guest = document.getElementById("profile-guest");
    const content = document.getElementById("profile-content");

    if (!session) {
      guest.hidden = false;
      content.hidden = true;
      return;
    }

    guest.hidden = true;
    content.hidden = false;

    document.getElementById("profile-avatar").src = session.avatar;
    document.getElementById("profile-displayname").textContent = session.displayName;
    document.getElementById("profile-username").textContent = "@" + session.username;
    document.getElementById("profile-userid").textContent = session.userId;
    document.getElementById("profile-linkdate").textContent = formatDate(session.linkDate);
    document.getElementById("profile-role").textContent = session.role;
    document.getElementById("profile-logincount").textContent = session.loginCount;
    initRevealObserver();
  }

  function updateNavbarUserChip() {
    const session = getSession();
    const chip = document.getElementById("user-chip");
    const loginBtn = document.getElementById("btn-open-login");

    if (session) {
      chip.hidden = false;
      loginBtn.hidden = true;
      document.getElementById("user-chip-avatar").src = session.avatar;
      document.getElementById("user-chip-name").textContent = session.displayName;
    } else {
      chip.hidden = true;
      loginBtn.hidden = false;
    }
  }

  /* ------------------------------------------------------------------
     13. ĐĂNG NHẬP / ĐĂNG XUẤT ROBLOX
  ------------------------------------------------------------------ */
  function openLoginModal() {
    document.getElementById("login-modal").classList.add("is-open");
  }
  function closeLoginModal() {
    document.getElementById("login-modal").classList.remove("is-open");
  }

  function handleRobloxLoginSubmit(e) {
    e.preventDefault();
    const usernameInput = document.getElementById("roblox-username");
    const username = usernameInput.value.trim();
    if (!username) return;

    const submitBtn = document.getElementById("btn-roblox-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang ủy quyền...";

    mockRobloxOAuth(username).then((profile) => {
      // Kiểm tra người dùng đã từng liên kết trước đó chưa (theo username)
      let existing = DB.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
      let loginCount = 1;
      let linkDate = profile.linkDate;

      if (existing) {
        loginCount = (existing.loginCount || 0) + 1;
        linkDate = existing.linkDate; // giữ ngày liên kết ban đầu
        existing.loginCount = loginCount;
        existing.online = true;
      } else {
        existing = {
          username: profile.username,
          displayName: profile.displayName,
          userId: profile.userId,
          avatar: profile.avatar,
          role: profile.role,
          linkDate: linkDate,
          loginCount: loginCount,
          online: true,
        };
        DB.users.push(existing);
      }
      saveData(DB);

      const session = {
        username: existing.username,
        displayName: existing.displayName,
        userId: existing.userId,
        avatar: existing.avatar,
        role: existing.role,
        linkDate: existing.linkDate,
        loginCount: existing.loginCount,
      };
      setSession(session);

      submitBtn.disabled = false;
      submitBtn.textContent = "Ủy quyền đăng nhập";
      usernameInput.value = "";
      closeLoginModal();
      updateNavbarUserChip();
      showToast("Liên kết tài khoản Roblox thành công!", "success");
      navigateTo("profile");
    });
  }

  function handleLogout() {
    const session = getSession();
    if (session) {
      const u = DB.users.find((x) => x.username === session.username);
      if (u) u.online = false;
      saveData(DB);
    }
    clearSession();
    updateNavbarUserChip();
    showToast("Đã đăng xuất khỏi STOVN.", "success");
    navigateTo("home");
  }

  /* ------------------------------------------------------------------
     14. TRANG QUẢN TRỊ (ADMIN)
  ------------------------------------------------------------------ */
  const ADMIN_CREDENTIALS = { user: "admin", pass: "stovn2026" };

  function renderAdminGate() {
    const guest = document.getElementById("admin-guest");
    const content = document.getElementById("admin-content");
    if (isAdminLoggedIn()) {
      guest.hidden = true;
      content.hidden = false;
      renderAdminAnnouncements();
      renderAdminRecruitment();
      renderAdminUpdates();
      renderAdminUsers();
    } else {
      guest.hidden = false;
      content.hidden = true;
    }
  }

  function handleAdminLoginSubmit(e) {
    e.preventDefault();
    const user = document.getElementById("admin-user").value.trim();
    const pass = document.getElementById("admin-pass").value.trim();
    if (user === ADMIN_CREDENTIALS.user && pass === ADMIN_CREDENTIALS.pass) {
      sessionStorage.setItem(ADMIN_KEY, "true");
      showToast("Đăng nhập quản trị thành công!", "success");
      renderAdminGate();
    } else {
      showToast("Sai tài khoản hoặc mật khẩu quản trị.", "error");
    }
  }

  function handleAdminLogout() {
    sessionStorage.removeItem(ADMIN_KEY);
    showToast("Đã đăng xuất khỏi trang quản trị.", "success");
    renderAdminGate();
  }

  /* --- Quản lý Thông báo (Admin) --- */
  function renderAdminAnnouncements() {
    const wrap = document.getElementById("admin-announcements-list");
    const items = [...DB.announcements].sort((a, b) => new Date(b.date) - new Date(a.date));
    wrap.innerHTML = items
      .map(
        (item) => `
      <div class="admin-list-item glass-card">
        <div class="admin-list-item-info">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${formatDate(item.date)} · ${escapeHtml(item.author)} · ${TAG_LABELS[item.tag]}</span>
        </div>
        <div class="admin-list-item-actions">
          <button class="btn btn-outline btn-sm" data-edit-ann="${item.id}">Sửa</button>
          <button class="btn btn-danger btn-sm" data-del-ann="${item.id}">Xóa</button>
        </div>
      </div>`
      )
      .join("");

    wrap.querySelectorAll("[data-edit-ann]").forEach((btn) =>
      btn.addEventListener("click", () => loadAnnouncementIntoForm(btn.dataset.editAnn))
    );
    wrap.querySelectorAll("[data-del-ann]").forEach((btn) =>
      btn.addEventListener("click", () => {
        DB.announcements = DB.announcements.filter((a) => a.id !== btn.dataset.delAnn);
        saveData(DB);
        renderAdminAnnouncements();
        showToast("Đã xóa thông báo.", "success");
      })
    );
  }

  function loadAnnouncementIntoForm(id) {
    const item = DB.announcements.find((a) => a.id === id);
    if (!item) return;
    document.getElementById("ann-id").value = item.id;
    document.getElementById("ann-title").value = item.title;
    document.getElementById("ann-author").value = item.author;
    document.getElementById("ann-tag").value = item.tag;
    document.getElementById("ann-content").value = item.content;
    document.getElementById("ann-title").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetAnnouncementForm() {
    document.getElementById("form-announcement").reset();
    document.getElementById("ann-id").value = "";
  }

  function handleAnnouncementSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("ann-id").value;
    const title = document.getElementById("ann-title").value.trim();
    const author = document.getElementById("ann-author").value.trim();
    const tag = document.getElementById("ann-tag").value;
    const content = document.getElementById("ann-content").value.trim();
    if (!title || !author || !content) return;

    if (id) {
      const item = DB.announcements.find((a) => a.id === id);
      if (item) Object.assign(item, { title, author, tag, content });
      showToast("Đã cập nhật thông báo.", "success");
    } else {
      DB.announcements.unshift({
        id: genId("ann"),
        title, author, tag, content,
        date: new Date().toISOString().slice(0, 10),
      });
      showToast("Đã đăng thông báo mới.", "success");
    }
    saveData(DB);
    resetAnnouncementForm();
    renderAdminAnnouncements();
  }

  /* --- Quản lý Tuyển dụng (Admin) --- */
  function renderAdminRecruitment() {
    const wrap = document.getElementById("admin-recruitment-list");
    wrap.innerHTML = DB.recruitment
      .map(
        (item) => `
      <div class="admin-list-item glass-card">
        <div class="admin-list-item-info">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${item.status === "open" ? "Còn tuyển" : "Đã đóng"}</span>
        </div>
        <div class="admin-list-item-actions">
          <button class="btn btn-outline btn-sm" data-edit-rec="${item.id}">Sửa</button>
          <button class="btn btn-danger btn-sm" data-del-rec="${item.id}">Xóa</button>
        </div>
      </div>`
      )
      .join("");

    wrap.querySelectorAll("[data-edit-rec]").forEach((btn) =>
      btn.addEventListener("click", () => loadRecruitmentIntoForm(btn.dataset.editRec))
    );
    wrap.querySelectorAll("[data-del-rec]").forEach((btn) =>
      btn.addEventListener("click", () => {
        DB.recruitment = DB.recruitment.filter((r) => r.id !== btn.dataset.delRec);
        saveData(DB);
        renderAdminRecruitment();
        showToast("Đã xóa vị trí tuyển dụng.", "success");
      })
    );
  }

  function loadRecruitmentIntoForm(id) {
    const item = DB.recruitment.find((r) => r.id === id);
    if (!item) return;
    document.getElementById("rec-id").value = item.id;
    document.getElementById("rec-title").value = item.title;
    document.getElementById("rec-status").value = item.status;
    document.getElementById("rec-conditions").value = item.conditions.join("\n");
    document.getElementById("rec-benefits").value = item.benefits.join("\n");
    document.getElementById("rec-title").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetRecruitmentForm() {
    document.getElementById("form-recruitment").reset();
    document.getElementById("rec-id").value = "";
  }

  function handleRecruitmentSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("rec-id").value;
    const title = document.getElementById("rec-title").value.trim();
    const status = document.getElementById("rec-status").value;
    const conditions = linesToList(document.getElementById("rec-conditions").value);
    const benefits = linesToList(document.getElementById("rec-benefits").value);
    if (!title || !conditions.length || !benefits.length) return;

    if (id) {
      const item = DB.recruitment.find((r) => r.id === id);
      if (item) Object.assign(item, { title, status, conditions, benefits });
      showToast("Đã cập nhật vị trí tuyển dụng.", "success");
    } else {
      DB.recruitment.unshift({ id: genId("rec"), title, status, conditions, benefits });
      showToast("Đã đăng vị trí tuyển dụng mới.", "success");
    }
    saveData(DB);
    resetRecruitmentForm();
    renderAdminRecruitment();
  }

  /* --- Quản lý Cập nhật Game (Admin) --- */
  function renderAdminUpdates() {
    const wrap = document.getElementById("admin-updates-list");
    const items = [...DB.updates].sort((a, b) => new Date(b.date) - new Date(a.date));
    wrap.innerHTML = items
      .map(
        (item) => `
      <div class="admin-list-item glass-card">
        <div class="admin-list-item-info">
          <strong>${escapeHtml(item.version)}</strong>
          <span>${formatDate(item.date)} · ${item.changes.length} thay đổi</span>
        </div>
        <div class="admin-list-item-actions">
          <button class="btn btn-outline btn-sm" data-edit-upd="${item.id}">Sửa</button>
          <button class="btn btn-danger btn-sm" data-del-upd="${item.id}">Xóa</button>
        </div>
      </div>`
      )
      .join("");

    wrap.querySelectorAll("[data-edit-upd]").forEach((btn) =>
      btn.addEventListener("click", () => loadUpdateIntoForm(btn.dataset.editUpd))
    );
    wrap.querySelectorAll("[data-del-upd]").forEach((btn) =>
      btn.addEventListener("click", () => {
        DB.updates = DB.updates.filter((u) => u.id !== btn.dataset.delUpd);
        saveData(DB);
        renderAdminUpdates();
        showToast("Đã xóa bản cập nhật.", "success");
      })
    );
  }

  function loadUpdateIntoForm(id) {
    const item = DB.updates.find((u) => u.id === id);
    if (!item) return;
    document.getElementById("upd-id").value = item.id;
    document.getElementById("upd-version").value = item.version;
    document.getElementById("upd-date").value = item.date;
    document.getElementById("upd-changes").value = item.changes.join("\n");
    document.getElementById("upd-version").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetUpdateForm() {
    document.getElementById("form-update").reset();
    document.getElementById("upd-id").value = "";
  }

  function handleUpdateSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("upd-id").value;
    const version = document.getElementById("upd-version").value.trim();
    const date = document.getElementById("upd-date").value;
    const changes = linesToList(document.getElementById("upd-changes").value);
    if (!version || !date || !changes.length) return;

    if (id) {
      const item = DB.updates.find((u) => u.id === id);
      if (item) Object.assign(item, { version, date, changes });
      showToast("Đã cập nhật phiên bản.", "success");
    } else {
      DB.updates.unshift({ id: genId("upd"), version, date, changes });
      showToast("Đã đăng phiên bản mới.", "success");
    }
    saveData(DB);
    resetUpdateForm();
    renderAdminUpdates();
    renderHome();
  }

  /* --- Quản lý Người dùng (Admin) --- */
  function renderAdminUsers() {
    const body = document.getElementById("admin-users-body");
    if (!DB.users.length) {
      body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">Chưa có người dùng nào liên kết tài khoản.</td></tr>`;
      return;
    }
    body.innerHTML = DB.users
      .map(
        (u) => `
      <tr>
        <td><img class="table-avatar" src="${u.avatar}" alt="${escapeHtml(u.username)}"></td>
        <td>${escapeHtml(u.displayName)} <br><span style="color:var(--muted-2);font-size:0.78rem;">@${escapeHtml(u.username)}</span></td>
        <td>${u.userId}</td>
        <td>${escapeHtml(u.role)}</td>
        <td>${u.loginCount}</td>
        <td><span class="status-dot ${u.online ? "status-online" : "status-offline"}"></span> ${u.online ? "Online" : "Offline"}</td>
        <td><button class="btn btn-danger btn-sm" data-remove-user="${u.username}">Xóa</button></td>
      </tr>`
      )
      .join("");

    body.querySelectorAll("[data-remove-user]").forEach((btn) =>
      btn.addEventListener("click", () => {
        DB.users = DB.users.filter((u) => u.username !== btn.dataset.removeUser);
        saveData(DB);
        renderAdminUsers();
        showToast("Đã xóa người dùng khỏi hệ thống.", "success");
      })
    );
  }

  /* Chuyển tab trong bảng quản trị */
  function initAdminTabs() {
    document.querySelectorAll(".admin-tab[data-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab[data-tab]").forEach((t) => t.classList.remove("is-active"));
        document.querySelectorAll(".admin-tab-panel").forEach((p) => p.classList.remove("is-active"));
        tab.classList.add("is-active");
        document.getElementById(tab.dataset.tab).classList.add("is-active");
      });
    });
  }

  /* ------------------------------------------------------------------
     15. HIỆU ỨNG XUẤT HIỆN KHI CUỘN (SCROLL REVEAL)
  ------------------------------------------------------------------ */
  let revealObserver;
  function initRevealObserver() {
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
    }
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el, i) => {
      el.style.transitionDelay = Math.min(i * 40, 240) + "ms";
      revealObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     16. NÚT VỀ ĐẦU TRANG
  ------------------------------------------------------------------ */
  function initBackToTop() {
    const btn = document.getElementById("back-to-top");
    window.addEventListener("scroll", () => {
      btn.classList.toggle("is-visible", window.scrollY > 420);
    });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ------------------------------------------------------------------
     17. MENU DI ĐỘNG (HAMBURGER)
  ------------------------------------------------------------------ */
  function initMobileMenu() {
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("nav-links");
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("is-active");
      navLinks.classList.toggle("is-open");
    });
  }

  /* ------------------------------------------------------------------
     18. FORM LIÊN HỆ (GIẢ LẬP GỬI)
  ------------------------------------------------------------------ */
  function initContactForm() {
    document.getElementById("contact-form").addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Đã gửi liên hệ! Đội ngũ STOVN sẽ phản hồi sớm nhất.", "success");
      e.target.reset();
    });
  }

  /* ------------------------------------------------------------------
     19. TÌM KIẾM & LỌC THÔNG BÁO
  ------------------------------------------------------------------ */
  function initAnnouncementFilters() {
    document.getElementById("search-announcements").addEventListener("input", (e) => {
      currentAnnSearch = e.target.value;
      renderAnnouncements();
    });

    document.getElementById("filter-announcements").addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      document.querySelectorAll("#filter-announcements .filter-chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      currentAnnFilter = chip.dataset.filter;
      renderAnnouncements();
    });
  }

  /* ------------------------------------------------------------------
     20. FOOTER: ĐIỀU KHOẢN / BẢO MẬT / QUẢN TRỊ
  ------------------------------------------------------------------ */
  function initFooterLinks() {
    document.getElementById("link-terms").addEventListener("click", () =>
      showToast("Điều khoản sử dụng STOVN: chơi công bằng, tôn trọng cộng đồng.", "success")
    );
    document.getElementById("link-privacy").addEventListener("click", () =>
      showToast("STOVN cam kết bảo mật thông tin tài khoản Roblox của bạn.", "success")
    );
    document.getElementById("link-admin").addEventListener("click", () => navigateTo("admin"));
  }

  /* ------------------------------------------------------------------
     21. KHỞI TẠO TOÀN BỘ SỰ KIỆN GIAO DIỆN
  ------------------------------------------------------------------ */
  function initEventListeners() {
    document.getElementById("btn-open-login").addEventListener("click", openLoginModal);
    document.getElementById("btn-login-from-profile").addEventListener("click", openLoginModal);
    document.getElementById("login-modal-close").addEventListener("click", closeLoginModal);
    document.getElementById("login-modal").addEventListener("click", (e) => {
      if (e.target.id === "login-modal") closeLoginModal();
    });
    document.getElementById("roblox-login-form").addEventListener("submit", handleRobloxLoginSubmit);
    document.getElementById("btn-logout").addEventListener("click", handleLogout);
    document.getElementById("btn-join").addEventListener("click", () => {
      const session = getSession();
      if (session) navigateTo("guide");
      else openLoginModal();
    });

    document.getElementById("admin-login-form").addEventListener("submit", handleAdminLoginSubmit);
    document.getElementById("btn-admin-logout").addEventListener("click", handleAdminLogout);

    document.getElementById("form-announcement").addEventListener("submit", handleAnnouncementSubmit);
    document.getElementById("ann-cancel-edit").addEventListener("click", resetAnnouncementForm);

    document.getElementById("form-recruitment").addEventListener("submit", handleRecruitmentSubmit);
    document.getElementById("rec-cancel-edit").addEventListener("click", resetRecruitmentForm);

    document.getElementById("form-update").addEventListener("submit", handleUpdateSubmit);
    document.getElementById("upd-cancel-edit").addEventListener("click", resetUpdateForm);

    initAdminTabs();
    initAnnouncementFilters();
    initContactForm();
    initFooterLinks();
    initBackToTop();
    initMobileMenu();
    initRouterEvents();

    // Đóng modal bằng phím Esc
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLoginModal();
    });
  }

  /* ------------------------------------------------------------------
     22. KHỞI CHẠY ỨNG DỤNG
  ------------------------------------------------------------------ */
  function renderAllStaticPages() {
    renderHome();
    renderAnnouncements();
    renderRecruitment();
    renderUpdates();
    renderEvents();
    renderRules();
    renderGuide();
  }

  function init() {
    renderAllStaticPages();
    updateNavbarUserChip();
    initEventListeners();

    const initialPage = location.hash.replace("#", "") || "home";
    navigateTo(initialPage, true);

    // Ẩn màn hình loading sau khi mọi thứ đã sẵn sàng
    window.addEventListener("load", () => {
      setTimeout(() => {
        document.getElementById("loading-screen").classList.add("is-hidden");
      }, 500);
    });
    // Dự phòng trường hợp sự kiện 'load' đã trôi qua
    setTimeout(() => {
      document.getElementById("loading-screen").classList.add("is-hidden");
    }, 2200);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
