import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLLECTION = "profissionais";

export async function buscarProfissionais() {
  const snap = await getDocs(collection(db, COLLECTION));

  return snap.docs.map(documento => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function cadastrarProfissional(data) {
  await addDoc(collection(db, COLLECTION), data);
}

export async function atualizarProfissional(id, data) {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function excluirProfissional(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}