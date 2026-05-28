import { auth, db } from "../firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginBox = document.getElementById("login-box");
const profissionalContent = document.getElementById("profissional-content");

const btnLogin = document.getElementById("btn-login");
const loginEmail = document.getElementById("login-email");
const loginSenha = document.getElementById("login-senha");

const btnLogout = document.getElementById("btn-logout");
const profissionalNome = document.getElementById("profissional-nome");

const dataAgenda = document.getElementById("data-agenda");
const btnBuscar = document.getElementById("btn-buscar");
const listaAgendamentos = document.getElementById("lista-agendamentos");

let profissionalLogado = null;

async function buscarProfissionalPorUID(uid) {
  const snap = await getDocs(collection(db, "profissionais"));

  let profissional = null;

  snap.forEach((doc) => {
    const data = doc.data();

    if (data.uid === uid) {
      profissional = {
        id: doc.id,
        ...data
      };
    }
  });

  return profissional;
}

async function carregarAgendaDoDia() {
  if (!profissionalLogado?.colecao) {
    listaAgendamentos.innerHTML = "Profissional sem coleção configurada.";
    return;
  }

  const data = dataAgenda.value;

  if (!data) {
    listaAgendamentos.innerHTML = "Selecione uma data.";
    return;
  }

  listaAgendamentos.innerHTML = "Carregando...";

  const q = query(
    collection(db, profissionalLogado.colecao),
    where("data", "==", data)
  );

  const snap = await getDocs(q);

  const agendamentos = [];

  snap.forEach((doc) => {
    agendamentos.push({
      id: doc.id,
      ...doc.data()
    });
  });

  agendamentos.sort((a, b) => {
    return String(a.hora || "").localeCompare(String(b.hora || ""));
  });

  if (!agendamentos.length) {
    listaAgendamentos.innerHTML = "Nenhum agendamento para esta data.";
    return;
  }

  listaAgendamentos.innerHTML = agendamentos.map((a) => `
    <div class="agendamento-card">
      <strong>${a.hora || "--:--"}</strong>
      <br>
      Cliente: ${a.clienteNomeCompleto || a.clienteNome || "Não informado"}
      <br>
      Serviço: ${a.servicoNome || "Não informado"}
      <br>
      Valor: R$ ${Number(a.servicoValor || a.valor || 0).toFixed(2)}
    </div>
  `).join("");
}

btnLogin?.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      loginEmail.value,
      loginSenha.value
    );
  } catch (error) {
    alert("Erro no login.");
    console.error(error);
  }
});

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
});

btnBuscar?.addEventListener("click", carregarAgendaDoDia);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    profissionalLogado = null;
    loginBox.style.display = "block";
    profissionalContent.style.display = "none";
    return;
  }

  const profissional = await buscarProfissionalPorUID(user.uid);

  if (!profissional || profissional.tipo !== "profissional") {
    alert("Acesso permitido apenas para profissionais.");
    await signOut(auth);
    return;
  }

  profissionalLogado = profissional;

  loginBox.style.display = "none";
  profissionalContent.style.display = "block";

  profissionalNome.textContent = profissional.nome || user.email;

  const hoje = new Date().toISOString().slice(0, 10);
  dataAgenda.value = hoje;

  await carregarAgendaDoDia();
});