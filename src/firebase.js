import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC7AktLJQamFPky_ttYA4KFNqQ_nea3nUg",
  authDomain: "consultorios-psi.firebaseapp.com",
  projectId: "consultorios-psi",
  storageBucket: "consultorios-psi.firebasestorage.app",
  messagingSenderId: "118773448531",
  appId: "1:118773448531:web:51ce9a01faf3e2f7276ba6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const reservasCol = collection(db, "reservas");

const CLOUDINARY_CLOUD = "dimsvpxri";
const CLOUDINARY_PRESET = "grins_perfiles";

export async function uploadProfilePhoto(email, file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error?.message || "Error al subir foto");
  }

  const data = await res.json();
  const url = data.secure_url;
  await updateUserProfile(email, { fotoUrl: url });
  return url;
}

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error?.message || "Error al subir foto");
  }

  const data = await res.json();
  const url = data.secure_url;
  await updateUserProfile(email, { fotoUrl: url });
  return url;
}

export async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function registerUser(email, password, nombre) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "usuarios", email), {
    rol: "profesional", nombre, email,
    telefono: "", bio: "", especialidad: "", fotoUrl: ""
  });
  return cred;
}

export async function logoutUser() {
  return await signOut(auth);
}

export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserData(email) {
  const snap = await getDoc(doc(db, "usuarios", email));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(email, data) {
  await setDoc(doc(db, "usuarios", email), data, { merge: true });
}

export async function agregarReserva(reserva) {
  return await addDoc(reservasCol, reserva);
}

export async function actualizarReserva(id, datos) {
  await updateDoc(doc(db, "reservas", id), datos);
}

export async function eliminarReserva(id) {
  await deleteDoc(doc(db, "reservas", id));
}

export function suscribirReservas(callback) {
  return onSnapshot(reservasCol, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.horaInicio - b.horaInicio;
    }));
  });
}
