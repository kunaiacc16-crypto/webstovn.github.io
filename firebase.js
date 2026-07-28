/* ==========================================================================
   firebase.js
   --------------------------------------------------------------------------
   Lớp xử lý dữ liệu (Data Layer) của Roleplay Official.

   Giai đoạn hiện tại: toàn bộ hàm bên dưới lưu trữ dữ liệu bằng localStorage.
   Mỗi hàm được viết ở dạng async và trả về Promise giống hệt cách Firebase
   Firestore hoạt động, để sau này chỉ cần thay phần THÂN HÀM (nội dung bên
   trong) bằng lệnh gọi Firestore thật (getDocs, addDoc, updateDoc, deleteDoc...)
   mà KHÔNG cần sửa bất kỳ nơi nào khác trong script.js.

   Khi tích hợp Firebase thật, thêm cấu hình dạng:
     import { initializeApp } from "firebase/app";
     import { getFirestore, collection, getDocs, addDoc,
              updateDoc, deleteDoc, doc } from "firebase/firestore";
     const firebaseConfig = { ... };
     const app = initializeApp(firebaseConfig);
     const db = getFirestore(app);
   rồi thay thế các thao tác localStorage bên dưới bằng thao tác Firestore
   tương ứng theo từng collection: "announcements", "recruitments",
   "applications", "settings".
   ========================================================================== */

/* --------------------------------------------------------------------------
   Khóa lưu trữ cục bộ (localStorage keys)
   -------------------------------------------------------------------------- */
const STORAGE_KEYS = {
  announcements: "ro_announcements",
  recruitments: "ro_recruitments",
  applications: "ro_applications",
  settings: "ro_settings",
};

/* --------------------------------------------------------------------------
   Hàm tiện ích nội bộ (không xuất ra ngoài)
   -------------------------------------------------------------------------- */

// Đọc mảng dữ liệu từ localStorage, trả về mảng rỗng nếu chưa có gì.
function _readCollection(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error(`[firebase.js] Lỗi đọc dữ liệu "${key}":`, error);
    return [];
  }
}

// Ghi mảng dữ liệu vào localStorage.
function _writeCollection(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`[firebase.js] Lỗi ghi dữ liệu "${key}":`, error);
    return false;
  }
}

// Sinh ID duy nhất cho bản ghi mới.
// TODO Firebase: khi dùng Firestore, addDoc() sẽ tự sinh ID, không cần hàm này.
function _generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Giả lập độ trễ mạng nhẹ để trải nghiệm loading nhất quán với môi trường
// Firebase thật (có thể xóa dòng này khi tích hợp Firebase thật).
function _tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/* ==========================================================================
   THÔNG BÁO (ANNOUNCEMENTS)
   TODO Firebase: thay bằng collection "announcements" trên Firestore.
   ========================================================================== */

// Tải toàn bộ thông báo, mới nhất lên trước.
export async function loadAnnouncements() {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.announcements);
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

// Thêm mới hoặc cập nhật thông báo (nếu truyền kèm id đã tồn tại).
export async function saveAnnouncement(announcement) {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.announcements);

  if (announcement.id) {
    const index = items.findIndex((item) => item.id === announcement.id);
    if (index !== -1) {
      items[index] = { ...items[index], ...announcement };
      _writeCollection(STORAGE_KEYS.announcements, items);
      return items[index];
    }
  }

  const newItem = {
    id: _generateId(),
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    author: announcement.author,
    timestamp: Date.now(),
  };
  items.push(newItem);
  _writeCollection(STORAGE_KEYS.announcements, items);
  return newItem;
}

// Xóa thông báo theo id.
export async function deleteAnnouncement(id) {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.announcements);
  const filtered = items.filter((item) => item.id !== id);
  return _writeCollection(STORAGE_KEYS.announcements, filtered);
}

/* ==========================================================================
   TUYỂN DỤNG (RECRUITMENTS)
   TODO Firebase: thay bằng collection "recruitments" trên Firestore.
   ========================================================================== */

// Tải toàn bộ tin tuyển dụng, mới nhất lên trước.
export async function loadRecruitments() {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.recruitments);
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

// Thêm mới hoặc cập nhật tin tuyển dụng.
export async function saveRecruitment(recruitment) {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.recruitments);

  if (recruitment.id) {
    const index = items.findIndex((item) => item.id === recruitment.id);
    if (index !== -1) {
      items[index] = { ...items[index], ...recruitment };
      _writeCollection(STORAGE_KEYS.recruitments, items);
      return items[index];
    }
  }

  const newItem = {
    id: _generateId(),
    position: recruitment.position,
    requirements: recruitment.requirements,
    benefits: recruitment.benefits,
    deadline: recruitment.deadline,
    status: recruitment.status,
    timestamp: Date.now(),
  };
  items.push(newItem);
  _writeCollection(STORAGE_KEYS.recruitments, items);
  return newItem;
}

// Xóa tin tuyển dụng theo id.
export async function deleteRecruitment(id) {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.recruitments);
  const filtered = items.filter((item) => item.id !== id);
  return _writeCollection(STORAGE_KEYS.recruitments, filtered);
}

/* ==========================================================================
   ĐƠN ĐĂNG KÝ (APPLICATIONS)
   TODO Firebase: thay bằng collection "applications" trên Firestore.
   ========================================================================== */

// Lưu đơn đăng ký mới từ người dùng (trạng thái mặc định: "pending").
export async function saveApplication(application) {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.applications);
  const newItem = {
    id: _generateId(),
    robloxName: application.robloxName,
    discordName: application.discordName,
    rank: application.rank,
    age: application.age,
    reason: application.reason,
    status: "pending",
    timestamp: Date.now(),
  };
  items.push(newItem);
  _writeCollection(STORAGE_KEYS.applications, items);
  return newItem;
}

// Tải toàn bộ đơn đăng ký, mới nhất lên trước.
export async function loadApplications() {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.applications);
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

// Duyệt đơn đăng ký.
export async function approveApplication(id) {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.applications);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index].status = "approved";
  _writeCollection(STORAGE_KEYS.applications, items);
  return items[index];
}

// Từ chối đơn đăng ký.
export async function rejectApplication(id) {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.applications);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index].status = "rejected";
  _writeCollection(STORAGE_KEYS.applications, items);
  return items[index];
}

// Xóa đơn đăng ký theo id.
export async function deleteApplication(id) {
  await _tick();
  const items = _readCollection(STORAGE_KEYS.applications);
  const filtered = items.filter((item) => item.id !== id);
  return _writeCollection(STORAGE_KEYS.applications, filtered);
}

/* ==========================================================================
   CÀI ĐẶT WEBSITE (SETTINGS)
   TODO Firebase: thay bằng document "settings/site" trên Firestore.
   ========================================================================== */

// Tải cài đặt website hiện tại (trả về null nếu chưa từng lưu).
export async function loadSettings() {
  await _tick();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("[firebase.js] Lỗi đọc cài đặt website:", error);
    return null;
  }
}

// Lưu cài đặt website (ghi đè toàn bộ).
export async function saveSettings(settings) {
  await _tick();
  _writeCollection(STORAGE_KEYS.settings, settings);
  return settings;
}
