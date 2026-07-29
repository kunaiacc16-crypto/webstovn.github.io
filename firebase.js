/* ==========================================================================
   firebase.js
   --------------------------------------------------------------------------
   Lớp xử lý dữ liệu (Data Layer) của Roleplay Official kết nối Firebase Firestore.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5_Pk1MMXPvjwPNdN9nWMaAH817zm2Dag",
  authDomain: "vpa-vpa.firebaseapp.com",
  databaseURL: "https://vpa-vpa-default-rtdb.firebaseio.com",
  projectId: "vpa-vpa",
  storageBucket: "vpa-vpa.firebasestorage.app",
  messagingSenderId: "551749345247",
  appId: "1:551749345247:web:9e8a9723f9ecce328f6e6a",
  measurementId: "G-QWVK12Z639"
};

// Khởi tạo Firebase App và Firestore DB
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

/* ==========================================================================
   THÔNG BÁO (ANNOUNCEMENTS)
   ========================================================================== */

// Tải toàn bộ thông báo, mới nhất lên trước.
export async function loadAnnouncements() {
  try {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });
    return items;
  } catch (error) {
    console.error("[firebase.js] Lỗi loadAnnouncements:", error);
    return [];
  }
}

// Thêm mới hoặc cập nhật thông báo (nếu truyền kèm id đã tồn tại).
export async function saveAnnouncement(announcement) {
  try {
    if (announcement.id) {
      const docRef = doc(db, "announcements", announcement.id);
      const updateData = { ...announcement };
      delete updateData.id;
      await updateDoc(docRef, updateData);
      return { id: announcement.id, ...updateData };
    } else {
      const newItem = {
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        author: announcement.author,
        timestamp: Date.now(),
      };
      const docRef = await addDoc(collection(db, "announcements"), newItem);
      return { id: docRef.id, ...newItem };
    }
  } catch (error) {
    console.error("[firebase.js] Lỗi saveAnnouncement:", error);
    throw error;
  }
}

// Xóa thông báo theo id.
export async function deleteAnnouncement(id) {
  try {
    await deleteDoc(doc(db, "announcements", id));
    return true;
  } catch (error) {
    console.error("[firebase.js] Lỗi deleteAnnouncement:", error);
    return false;
  }
}

/* ==========================================================================
   TUYỂN DỤNG (RECRUITMENTS)
   ========================================================================== */

// Tải toàn bộ tin tuyển dụng, mới nhất lên trước.
export async function loadRecruitments() {
  try {
    const q = query(collection(db, "recruitments"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });
    return items;
  } catch (error) {
    console.error("[firebase.js] Lỗi loadRecruitments:", error);
    return [];
  }
}

// Thêm mới hoặc cập nhật tin tuyển dụng.
export async function saveRecruitment(recruitment) {
  try {
    if (recruitment.id) {
      const docRef = doc(db, "recruitments", recruitment.id);
      const updateData = { ...recruitment };
      delete updateData.id;
      await updateDoc(docRef, updateData);
      return { id: recruitment.id, ...updateData };
    } else {
      const newItem = {
        position: recruitment.position,
        requirements: recruitment.requirements,
        benefits: recruitment.benefits,
        deadline: recruitment.deadline,
        status: recruitment.status,
        timestamp: Date.now(),
      };
      const docRef = await addDoc(collection(db, "recruitments"), newItem);
      return { id: docRef.id, ...newItem };
    }
  } catch (error) {
    console.error("[firebase.js] Lỗi saveRecruitment:", error);
    throw error;
  }
}

// Xóa tin tuyển dụng theo id.
export async function deleteRecruitment(id) {
  try {
    await deleteDoc(doc(db, "recruitments", id));
    return true;
  } catch (error) {
    console.error("[firebase.js] Lỗi deleteRecruitment:", error);
    return false;
  }
}

/* ==========================================================================
   ĐƠN ĐĂNG KÝ (APPLICATIONS)
   ========================================================================== */

// Lưu đơn đăng ký mới từ người dùng (trạng thái mặc định: "pending").
export async function saveApplication(application) {
  try {
    const newItem = {
      robloxName: application.robloxName,
      discordName: application.discordName,
      rank: application.rank,
      age: application.age,
      reason: application.reason,
      status: "pending",
      timestamp: Date.now(),
    };
    const docRef = await addDoc(collection(db, "applications"), newItem);
    return { id: docRef.id, ...newItem };
  } catch (error) {
    console.error("[firebase.js] Lỗi saveApplication:", error);
    throw error;
  }
}

// Tải toàn bộ đơn đăng ký, mới nhất lên trước.
export async function loadApplications() {
  try {
    const q = query(collection(db, "applications"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });
    return items;
  } catch (error) {
    console.error("[firebase.js] Lỗi loadApplications:", error);
    return [];
  }
}

// Duyệt đơn đăng ký.
export async function approveApplication(id) {
  try {
    const docRef = doc(db, "applications", id);
    await updateDoc(docRef, { status: "approved" });
    return { id, status: "approved" };
  } catch (error) {
    console.error("[firebase.js] Lỗi approveApplication:", error);
    return null;
  }
}

// Từ chối đơn đăng ký.
export async function rejectApplication(id) {
  try {
    const docRef = doc(db, "applications", id);
    await updateDoc(docRef, { status: "rejected" });
    return { id, status: "rejected" };
  } catch (error) {
    console.error("[firebase.js] Lỗi rejectApplication:", error);
    return null;
  }
}

// Xóa đơn đăng ký theo id.
export async function deleteApplication(id) {
  try {
    await deleteDoc(doc(db, "applications", id));
    return true;
  } catch (error) {
    console.error("[firebase.js] Lỗi deleteApplication:", error);
    return false;
  }
}
