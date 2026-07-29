/* ==========================================================================
   firebase.js
   --------------------------------------------------------------------------
   Lớp xử lý dữ liệu (Data Layer) + Đăng nhập quản trị của Roleplay Official.

   Bản này dùng Firestore thật để lưu dữ liệu, và Firebase Authentication
   thật để đăng nhập quản trị (KHÔNG còn so khớp mật khẩu trong code JS như
   bản cũ nữa — cái đó ai mở F12 cũng dò ra được).

   BẮT BUỘC phải làm 3 bước sau trên Firebase Console trước khi dùng:

   1. Vào Authentication → Sign-in method → bật "Email/Password".
   2. Vào Authentication → Users → Add user → tạo 1 tài khoản email + mật
      khẩu cho quản trị viên (chỉ mình m biết thông tin này).
   3. Vào Firestore Database → Rules → dán đoạn rule bên dưới rồi Publish:

      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /announcements/{id} {
            allow read: if true;
            allow write: if request.auth != null;
          }
          match /recruitments/{id} {
            allow read: if true;
            allow write: if request.auth != null;
          }
          match /applications/{id} {
            allow create: if true;
            allow read, update, delete: if request.auth != null;
          }
        }
      }

   Ý nghĩa: ai cũng đọc được thông báo/tuyển dụng, ai cũng gửi được đơn ứng
   tuyển (create) — nhưng CHỈ người đã đăng nhập Firebase Auth hợp lệ mới
   được ghi/sửa/xóa. Rule này được Google kiểm tra ở server, không nằm
   trong file JS nên không ai xem/sửa code mà bypass được.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5_Pk1MMXPvjwPNdN9nWMaAH817zm2Dag",
  authDomain: "vpa-vpa.firebaseapp.com",
  databaseURL: "https://vpa-vpa-default-rtdb.firebaseio.com",
  projectId: "vpa-vpa",
  storageBucket: "vpa-vpa.firebasestorage.app",
  messagingSenderId: "551749345247",
  appId: "1:551749345247:web:9e8a9723f9ecce328f6e6a",
  measurementId: "G-QWVK12Z639",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const COLLECTIONS = {
  announcements: "announcements",
  recruitments: "recruitments",
  applications: "applications",
};

/* --------------------------------------------------------------------------
   Đăng nhập quản trị (Firebase Authentication thật)
   -------------------------------------------------------------------------- */

// Đăng nhập bằng email/mật khẩu đã tạo ở Firebase Console > Authentication.
// Ném lỗi (throw) nếu sai — nơi gọi hàm này cần bọc trong try/catch.
export async function loginAdmin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutAdmin() {
  await signOut(auth);
}

// Lắng nghe trạng thái đăng nhập (còn phiên hay không), gọi callback(user)
// mỗi khi trạng thái thay đổi — kể cả lúc mới tải trang (giữ đăng nhập sau
// khi F5). Trả về hàm để hủy lắng nghe nếu cần.
export function watchAdminAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentAdminUser() {
  return auth.currentUser;
}

/* --------------------------------------------------------------------------
   Tiện ích nội bộ
   -------------------------------------------------------------------------- */

function _mapDoc(docSnap) {
  const data = docSnap.data();
  const ts = data.timestamp && typeof data.timestamp.toMillis === "function"
    ? data.timestamp.toMillis()
    : data.timestamp || Date.now();
  return { id: docSnap.id, ...data, timestamp: ts };
}

async function _loadCollection(name) {
  const q = query(collection(db, name), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(_mapDoc);
}

/* ==========================================================================
   THÔNG BÁO (ANNOUNCEMENTS)
   ========================================================================== */

export async function loadAnnouncements() {
  return _loadCollection(COLLECTIONS.announcements);
}

export async function saveAnnouncement(announcement) {
  if (announcement.id) {
    const ref = doc(db, COLLECTIONS.announcements, announcement.id);
    const payload = {
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      author: announcement.author,
    };
    await updateDoc(ref, payload);
    return { id: announcement.id, ...payload, timestamp: Date.now() };
  }

  const payload = {
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    author: announcement.author,
    timestamp: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTIONS.announcements), payload);
  return { id: ref.id, ...payload, timestamp: Date.now() };
}

export async function deleteAnnouncement(id) {
  await deleteDoc(doc(db, COLLECTIONS.announcements, id));
  return true;
}

/* ==========================================================================
   TUYỂN DỤNG (RECRUITMENTS)
   ========================================================================== */

export async function loadRecruitments() {
  return _loadCollection(COLLECTIONS.recruitments);
}

export async function saveRecruitment(recruitment) {
  if (recruitment.id) {
    const ref = doc(db, COLLECTIONS.recruitments, recruitment.id);
    const payload = {
      position: recruitment.position,
      requirements: recruitment.requirements,
      benefits: recruitment.benefits,
      deadline: recruitment.deadline,
      status: recruitment.status,
    };
    await updateDoc(ref, payload);
    return { id: recruitment.id, ...payload, timestamp: Date.now() };
  }

  const payload = {
    position: recruitment.position,
    requirements: recruitment.requirements,
    benefits: recruitment.benefits,
    deadline: recruitment.deadline,
    status: recruitment.status,
    timestamp: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTIONS.recruitments), payload);
  return { id: ref.id, ...payload, timestamp: Date.now() };
}

export async function deleteRecruitment(id) {
  await deleteDoc(doc(db, COLLECTIONS.recruitments, id));
  return true;
}

/* ==========================================================================
   ĐƠN ĐĂNG KÝ (APPLICATIONS)
   ========================================================================== */

export async function saveApplication(application) {
  const payload = {
    robloxName: application.robloxName,
    discordName: application.discordName,
    rank: application.rank,
    age: application.age,
    reason: application.reason,
    status: "pending",
    timestamp: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTIONS.applications), payload);
  return { id: ref.id, ...payload, timestamp: Date.now() };
}

export async function loadApplications() {
  return _loadCollection(COLLECTIONS.applications);
}

export async function approveApplication(id) {
  const ref = doc(db, COLLECTIONS.applications, id);
  await updateDoc(ref, { status: "approved" });
  return true;
}

export async function rejectApplication(id) {
  const ref = doc(db, COLLECTIONS.applications, id);
  await updateDoc(ref, { status: "rejected" });
  return true;
}

export async function deleteApplication(id) {
  await deleteDoc(doc(db, COLLECTIONS.applications, id));
  return true;
}
