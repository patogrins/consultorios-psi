import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

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
export const reservasCol = collection(db, "reservas");

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
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  });
}
