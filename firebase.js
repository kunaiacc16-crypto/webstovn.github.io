/* ==========================================================================
   firebase.js
   --------------------------------------------------------------------------
   Lớp xử lý dữ liệu (Data Layer) của Roleplay Official.

   Toàn bộ dữ liệu (thông báo, tuyển dụng, đơn đăng ký, hồ sơ người dùng,
   tin nhắn chat) đều nằm trên Firestore và cập nhật REALTIME bằng
   onSnapshot — không còn localStorage, không cần F5 để thấy dữ liệu mới.

   Ảnh đại diện & ảnh chat được lưu trên Firebase Storage, Firestore chỉ
   lưu URL.

   ==========================================================================
   BẮT BUỘC CẤU HÌNH TRÊN FIREBASE CONSOLE TRƯỚC KHI DÙNG
   ==========================================================================

   1) Authentication → Sign-in method:
      - Bật "Email/Password"  (dùng để đăng nhập quản trị viên)
      - Bật "Google"          (dùng để người dùng thường đăng nhập chat)

   2) Authentication → Users → Add user:
      - Tạo 1 tài khoản email + mật khẩu cho quản trị viên.

   3) Firestore Database → tạo thêm 1 document để cấp quyền admin cho tài
      khoản vừa tạo:
      - Vào collection "admins", tạo document với ID = UID của tài khoản
        quản trị (xem UID trong tab Authentication → Users), nội dung:
          { "isAdmin": true }
      Không có document này thì tài khoản đăng nhập được nhưng KHÔNG mở
      được Dashboard (đúng như thiết kế bảo mật).

   4) Firestore Database → Rules → dán rule bên dưới rồi Publish:

      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {

          function isSignedIn() { return request.auth != null; }
          function isAdmin() {
            return isSignedIn() &&
              exists(/databases/$(database)/documents/admins/$(request.auth.uid));
          }

          match /announcements/{id} {
            allow read: if true;
            allow write: if isAdmin();
          }

          match /recruitments/{id} {
            allow read: if true;
            allow write: if isAdmin();
          }

          match /applications/{id} {
            allow create: if true;
            allow read, update, delete: if isAdmin();
          }

          match /users/{uid} {
            allow read: if true;
            allow create, update: if isSignedIn() && request.auth.uid == uid;
            allow delete: if false;
          }

          // Dùng để "khóa" một mã ID 6 số duy nhất cho mỗi người dùng.
          // Không ai được sửa/xóa sau khi đã tạo — đảm bảo ID không đổi.
          match /shortIds/{code} {
            allow read: if true;
            allow create: if isSignedIn();
            allow update, delete: if false;
          }

          // Quyền quản trị — CHỈ cấp thủ công trong Console, client không
          // bao giờ được ghi vào đây.
          match /admins/{uid} {
            allow read: if isSignedIn() && request.auth.uid == uid;
            allow write: if false;
          }

          match /messages/{id} {
            allow read: if true;
            allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
            allow update: if isSignedIn() &&
              (resource.data.uid == request.auth.uid ||
               // Cho phép người khác chỉ cập nhật trường "reactions" (thả cảm xúc)
               request.resource.data.diff(resource.data).affectedKeys().hasOnly(["reactions"]));
            allow delete: if isSignedIn() && resource.data.uid == request.auth.uid;
          }
        }
      }

   5) Storage → Rules → dán rule bên dưới rồi Publish:

      rules_version = '2';
      service firebase.storage {
        match /b/{bucket}/o {
          match /avatars/{uid}/{fileName} {
            allow read: if true;
            allow write: if request.auth != null && request.auth.uid == uid
                         && request.resource.size < 5 * 1024 * 1024;
          }
          match /chat_images/{uid}/{fileName} {
            allow read: if true;
            allow write: if request.auth != null && request.auth.uid == uid
                         && request.resource.size < 8 * 1024 * 1024;
          }
        }
      }
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

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
const storage = getStorage(app);

const COLLECTIONS = {
  announcements: "announcements",
  recruitments: "recruitments",
  applications: "applications",
  users: "users",
  messages: "messages",
  admins: "admins",
  shortIds: "shortIds",
};

/* --------------------------------------------------------------------------
   Tiện ích nội bộ
   -------------------------------------------------------------------------- */

function _mapDoc(docSnap) {
  const data = docSnap.data();
  const ts =
    data.timestamp && typeof data.timestamp.toMillis === "function"
      ? data.timestamp.toMillis()
      : data.timestamp || Date.now();
  const editedAt =
    data.editedAt && typeof data.editedAt.toMillis === "function"
      ? data.editedAt.toMillis()
      : data.editedAt || null;
  return { id: docSnap.id, ...data, timestamp: ts, editedAt };
}

/* ==========================================================================
   ĐĂNG NHẬP / ĐĂNG XUẤT
   ========================================================================== */

// Đăng nhập quản trị (email/mật khẩu tạo sẵn trên Firebase Console).
export async function loginAdmin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// Đăng nhập người dùng thường bằng Google — tự tạo hồ sơ nếu chưa có.
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return getOrCreateUserProfile(cred.user);
}

export async function logoutAdmin() {
  await signOut(auth);
}
export const logout = logoutAdmin;

// Theo dõi trạng thái đăng nhập trong suốt phiên làm việc: trả về đối tượng
// { user, profile, isAdmin } mỗi khi trạng thái thay đổi (kể cả lúc F5 lại
// trang, miễn phiên Firebase Auth còn hiệu lực).
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, profile: null, isAdmin: false });
      return;
    }
    try {
      const [profile, isAdmin] = await Promise.all([
        getOrCreateUserProfile(user),
        checkIsAdmin(user.uid),
      ]);
      callback({ user, profile, isAdmin });
    } catch (error) {
      console.error("[watchAuthState] Lỗi tải hồ sơ/quyền:", error);
      callback({ user, profile: null, isAdmin: false });
    }
  });
}

export function getCurrentUser() {
  return auth.currentUser;
}

/* ==========================================================================
   QUYỀN QUẢN TRỊ
   ========================================================================== */

export async function checkIsAdmin(uid) {
  if (!uid) return false;
  const snap = await getDoc(doc(db, COLLECTIONS.admins, uid));
  return snap.exists() && snap.data().isAdmin === true;
}

/* ==========================================================================
   HỒ SƠ NGƯỜI DÙNG (USERS)
   ========================================================================== */

// Sinh 1 mã ID gồm đúng 6 chữ số, đảm bảo không trùng bằng cách "khóa" mã đó
// trong collection shortIds thông qua transaction (ai tạo trước thì giữ).
async function generateUniqueShortId() {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const ref = doc(db, COLLECTIONS.shortIds, code);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error("TAKEN");
        tx.set(ref, { reserved: true, createdAt: serverTimestamp() });
      });
      return code;
    } catch (error) {
      continue; // mã đã bị người khác giữ, thử mã khác
    }
  }
  throw new Error("Không thể tạo mã định danh, vui lòng thử lại.");
}

export async function getOrCreateUserProfile(user) {
  const ref = doc(db, COLLECTIONS.users, user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const createdAt =
      data.createdAt && typeof data.createdAt.toMillis === "function"
        ? data.createdAt.toMillis()
        : data.createdAt || Date.now();
    return { uid: user.uid, ...data, createdAt };
  }

  const shortId = await generateUniqueShortId();
  const profile = {
    shortId,
    displayName: user.displayName || "Người dùng mới",
    avatarUrl: user.photoURL || "",
    email: user.email || "",
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { uid: user.uid, ...profile, createdAt: Date.now() };
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const createdAt =
    data.createdAt && typeof data.createdAt.toMillis === "function"
      ? data.createdAt.toMillis()
      : data.createdAt || Date.now();
  return { uid, ...data, createdAt };
}

// Cập nhật tên hiển thị và/hoặc avatar (upload file thật lên Storage).
// shortId KHÔNG bao giờ được truyền vào đây — không có cách nào đổi được.
export async function updateUserProfile(uid, { displayName, avatarFile } = {}) {
  const updates = {};
  if (displayName && displayName.trim()) updates.displayName = displayName.trim();

  if (avatarFile) {
    const path = `avatars/${uid}/${Date.now()}_${avatarFile.name}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, avatarFile);
    updates.avatarUrl = await getDownloadURL(ref);
  }

  if (Object.keys(updates).length === 0) return updates;
  await updateDoc(doc(db, COLLECTIONS.users, uid), updates);
  return updates;
}

/* ==========================================================================
   THÔNG BÁO (ANNOUNCEMENTS) — realtime
   ========================================================================== */

export function watchAnnouncements(callback) {
  const q = query(collection(db, COLLECTIONS.announcements), orderBy("timestamp", "desc"));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(_mapDoc)),
    (error) => console.error("[watchAnnouncements] Lỗi:", error)
  );
}

export async function saveAnnouncement(announcement) {
  if (announcement.id) {
    const ref = doc(db, COLLECTIONS.announcements, announcement.id);
    await updateDoc(ref, {
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      author: announcement.author,
    });
    return;
  }
  await addDoc(collection(db, COLLECTIONS.announcements), {
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    author: announcement.author,
    timestamp: serverTimestamp(),
  });
}

export async function deleteAnnouncement(id) {
  await deleteDoc(doc(db, COLLECTIONS.announcements, id));
}

/* ==========================================================================
   TUYỂN DỤNG (RECRUITMENTS) — realtime
   ========================================================================== */

export function watchRecruitments(callback) {
  const q = query(collection(db, COLLECTIONS.recruitments), orderBy("timestamp", "desc"));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(_mapDoc)),
    (error) => console.error("[watchRecruitments] Lỗi:", error)
  );
}

export async function saveRecruitment(recruitment) {
  if (recruitment.id) {
    const ref = doc(db, COLLECTIONS.recruitments, recruitment.id);
    await updateDoc(ref, {
      position: recruitment.position,
      requirements: recruitment.requirements,
      benefits: recruitment.benefits,
      deadline: recruitment.deadline,
      status: recruitment.status,
    });
    return;
  }
  await addDoc(collection(db, COLLECTIONS.recruitments), {
    position: recruitment.position,
    requirements: recruitment.requirements,
    benefits: recruitment.benefits,
    deadline: recruitment.deadline,
    status: recruitment.status,
    timestamp: serverTimestamp(),
  });
}

export async function deleteRecruitment(id) {
  await deleteDoc(doc(db, COLLECTIONS.recruitments, id));
}

/* ==========================================================================
   ĐƠN ĐĂNG KÝ (APPLICATIONS) — realtime
   ========================================================================== */

export function watchApplications(callback) {
  const q = query(collection(db, COLLECTIONS.applications), orderBy("timestamp", "desc"));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(_mapDoc)),
    (error) => console.error("[watchApplications] Lỗi:", error)
  );
}

export async function saveApplication(application) {
  await addDoc(collection(db, COLLECTIONS.applications), {
    robloxName: application.robloxName,
    discordName: application.discordName,
    rank: application.rank,
    age: application.age,
    reason: application.reason,
    status: "pending",
    timestamp: serverTimestamp(),
  });
}

export async function approveApplication(id) {
  await updateDoc(doc(db, COLLECTIONS.applications, id), { status: "approved" });
}

export async function rejectApplication(id) {
  await updateDoc(doc(db, COLLECTIONS.applications, id), { status: "rejected" });
}

export async function deleteApplication(id) {
  await deleteDoc(doc(db, COLLECTIONS.applications, id));
}

/* ==========================================================================
   CHAT TOÀN CỤC (MESSAGES) — realtime
   ========================================================================== */

export function watchMessages(callback) {
  const q = query(collection(db, COLLECTIONS.messages), orderBy("timestamp", "asc"));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(_mapDoc)),
    (error) => console.error("[watchMessages] Lỗi:", error)
  );
}

// text và/hoặc imageFile — ít nhất một trong hai phải có (kiểm tra ở UI
// trước khi gọi, nhưng vẫn chặn lại ở đây cho chắc).
export async function sendMessage({ uid, displayName, avatarUrl, text, imageFile }) {
  const cleanText = (text || "").trim();
  if (!cleanText && !imageFile) {
    throw new Error("Tin nhắn phải có nội dung hoặc ảnh.");
  }

  let imageUrl = null;
  if (imageFile) {
    const path = `chat_images/${uid}/${Date.now()}_${imageFile.name}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, imageFile);
    imageUrl = await getDownloadURL(ref);
  }

  await addDoc(collection(db, COLLECTIONS.messages), {
    uid,
    displayName: displayName || "Người dùng",
    avatarUrl: avatarUrl || "",
    text: cleanText,
    imageUrl,
    timestamp: serverTimestamp(),
    editedAt: null,
    reactions: {},
  });
}

export async function editMessage(id, newText) {
  const cleanText = (newText || "").trim();
  if (!cleanText) throw new Error("Nội dung tin nhắn không được để trống.");
  await updateDoc(doc(db, COLLECTIONS.messages, id), {
    text: cleanText,
    editedAt: serverTimestamp(),
  });
}

export async function deleteMessage(id) {
  await deleteDoc(doc(db, COLLECTIONS.messages, id));
}

// Bật/tắt 1 reaction của 1 người dùng trên 1 tin nhắn, dùng transaction để
// tránh đụng độ khi nhiều người bấm cùng lúc.
export async function toggleReaction(messageId, emoji, uid) {
  const ref = doc(db, COLLECTIONS.messages, messageId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const reactions = { ...(snap.data().reactions || {}) };
    const current = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
    const idx = current.indexOf(uid);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(uid);

    if (current.length === 0) delete reactions[emoji];
    else reactions[emoji] = current;

    tx.update(ref, { reactions });
  });
}
