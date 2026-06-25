import {
  auth,
  db,
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc
} from "../firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  buscarProfissionais,
  cadastrarProfissional,
  atualizarProfissional,
  excluirProfissional
} from "../services/profissionais.service.js";

import {
  buscarServicos,
  cadastrarServico,
  atualizarServico,
  excluirServico
} from "../services/servicos.service.js";

import {
  buscarAgendamentosPorProfissionais,
  montarResumoDashboard
} from "../services/dashboard.service.js";

const form = document.getElementById("form-profissional");
const lista = document.getElementById("lista-profissionais");

const formServico = document.getElementById("form-servico");
const listaServicos = document.getElementById("lista-servicos");

const dashboardResumo = document.getElementById("dashboard-resumo");
const dashboardAgendamentos = document.getElementById("dashboard-agendamentos");

const loginBox = document.getElementById("login-box");
const adminContent = document.getElementById("admin-content");

const btnLogin = document.getElementById("btn-login");
const loginEmail = document.getElementById("login-email");
const loginSenha = document.getElementById("login-senha");

const adminEmail = document.getElementById("admin-email");
const btnLogout = document.getElementById("btn-logout");

const toast = document.getElementById("toast");

const modalConfirmacao = document.getElementById("modal-confirmacao");
const modalMensagem = document.getElementById("modal-mensagem");

const modalTitulo = document.getElementById("modal-titulo");

const btnCancelarModal = document.getElementById("btn-cancelar-modal");
const btnConfirmarModal = document.getElementById("btn-confirmar-modal");

const modalEdicao = document.getElementById("modal-edicao");
const formEdicao = document.getElementById("form-edicao");
const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");

const agendaOperacionalLista = document.getElementById("agenda-operacional-lista");
const agendaConcluidosLista = document.getElementById("agenda-concluidos-lista");

const agendaGeralLista = document.getElementById("agenda-geral-lista");

const agendaGeral = document.getElementById("agenda-geral");

const agendaGeralConteudo = document.getElementById("agenda-geral-conteudo");

const btnToggleAgendaGeral = document.getElementById("btn-toggle-agenda-geral");

const buscaAgendaGeral = document.getElementById("busca-agenda-geral");

const filtroStatusAgenda = document.getElementById("filtro-status-agenda");

const filtroPeriodoAgenda = document.getElementById("filtro-periodo-agenda");

const btnMenuMobile = document.getElementById("btn-menu-mobile");

const sidebar = document.querySelector(".sidebar");

const modalCancelamento = document.getElementById("modal-cancelamento");

const btnFecharCancelamento = document.getElementById("btn-fechar-cancelamento");

const btnConfirmarCancelamento = document.getElementById("btn-confirmar-cancelamento");

let dadosExistentes = null;
let chartFaturamento = null;
let profissionaisCache = [];
let servicosCache = [];
let usuarioLogado = null;
let perfilLogado = null;
let agendaGeralCache = [];
let cancelamentoTemp = null;

let onConfirmar = null;



function mostrarToast(
  mensagem,
  tipo = "success"
) {

  if (!toast) return;

  toast.textContent = mensagem;

  toast.className =
    `show ${tipo}`;

  setTimeout(() => {

    toast.className = "";

  }, 3000);

}

function abrirModalConfirmacao({
  titulo = "Confirmar ação",
  mensagem,
  textoBotao = "Confirmar",
  onConfirmar: callback
}) {

  if (!modalConfirmacao) return;

  modalTitulo.textContent =
    titulo;

  modalMensagem.textContent =
    mensagem;

  btnConfirmarModal.textContent =
    textoBotao;

  onConfirmar =
    callback;

  modalConfirmacao.classList.add(
    "show"
  );

}

function abrirModalEdicao(servico) {

  modalEdicao.classList.add(
    "show"
  );

  document.getElementById(
    "editarNome"
  ).value = servico.nome || "";

  document.getElementById(
    "editarValor"
  ).value = servico.valor || "";

  document.getElementById(
    "editarTempo"
  ).value = servico.tempoMin || "";

  formEdicao.onsubmit =
    async (e) => {

      e.preventDefault();

      await atualizarServico(
        servico.id,
        {
          nome:
            document.getElementById(
              "editarNome"
            ).value,

          valor:
            Number(
              document.getElementById(
                "editarValor"
              ).value
            ),

          tempoMin:
            Number(
              document.getElementById(
                "editarTempo"
              ).value
            )
        }
      );

      modalEdicao.classList.remove(
        "show"
      );

      mostrarToast(
        "Serviço atualizado"
      );

      await carregarServicos();

      await carregarDashboard();

    };

  btnCancelarEdicao.onclick =
    () => {

      modalEdicao.classList.remove(
        "show"
      );

    };

}

btnConfirmarModal.onclick =
  async () => {

    modalConfirmacao
      .classList.remove(
        "show"
      );

    if (onConfirmar) {

      await onConfirmar();

    }

  };


function criarSlug(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function buscarProfissionalPorUID(uid) {
  const profissionais = await buscarProfissionais();

  return profissionais.find((prof) => prof.uid === uid) || null;
}

btnLogin?.addEventListener("click", async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginEmail.value,
      loginSenha.value
    );

    usuarioLogado = userCredential.user;

    await carregarPerfilUsuario();

    aplicarPermissoes();

  } catch (e) {
    mostrarToast("Erro ao salvar", "error");
    console.error(e);
  }
});
async function carregar() {
  lista.innerHTML = "Carregando...";

  const dados = await buscarProfissionais();

  profissionaisCache = dados;

  preencherSelectProfissionaisServico();

  preencherSelectNovoAtendimento();

  if (!dados.length) {
    lista.innerHTML = "Nenhum profissional";
    return;
  }

  lista.innerHTML = dados.map(p => `
    <div>
      <strong>${p.nome || "Sem nome"}</strong> - ${p.cargo || "Sem cargo"}
      <br>
      Coleção: ${p.colecao || "Sem coleção"}
      <br>
      Expediente: ${p.inicioExpediente || "--:--"} até ${p.fimExpediente || "--:--"}
      <br><br>

      <div class="card-acoes">

      <button 
        type="button"
        class="btn-editar acao-card"
        data-id="${p.id}"
        data-nome="${p.nome || ""}"
        data-whatsapp="${p.whatsapp || ""}"
        data-cargo="${p.cargo || ""}"
        data-inicio="${p.inicioExpediente || ""}"
        data-fim="${p.fimExpediente || ""}"
        data-colecao="${p.colecao || ""}"
      >
        Editar
      </button>

      <button 
        type="button"
        class="btn-excluir acao-card"
        data-id="${p.id}"
      >
        Excluir
      </button>
      </div>
    </div>
  `).join("");
}

function preencherSelectProfissionaisServico() {
  const select = document.getElementById("profissionalServico");

  if (!select) return;

  select.innerHTML = profissionaisCache.map((p) => `
    <option value="${p.id}">
      ${p.nome}
    </option>
  `).join("");
}

function preencherSelectNovoAtendimento() {

  const select =
    document.getElementById(
      "novoProfissional"
    );

  if (!select) return;

  select.innerHTML = `

    <option value="">
      Selecione o profissional
    </option>

    ${profissionaisCache.map(p => `

      <option value="${p.id}">
        ${p.nome}
      </option>

    `).join("")}

  `;
}

document.addEventListener(
  "pointerdown",
  (e) => {

    const campo = e.target;

    const idsModal = [
      "novoNome",
      "novoSobrenome",
      "novoTelefone",
      "novoProfissional",
      "novoServico",
      "novoData",
      "novoHora",
      "novoHoraEncaixe"
    ];

    if (!idsModal.includes(campo.id)) {
      return;
    }

    const nome = document.getElementById("novoNome")?.value.trim();
    const sobrenome = document.getElementById("novoSobrenome")?.value.trim();
    const telefone = document.getElementById("novoTelefone")?.value.trim();
    const profissional = document.getElementById("novoProfissional")?.value;
    const servico = document.getElementById("novoServico")?.value;
    const data = document.getElementById("novoData")?.value;

    if (campo.id !== "novoNome" && !nome) {
      e.preventDefault();
      mostrarToast("Informe o nome do cliente", "error");
      document.getElementById("novoNome")?.focus();
      return;
    }

    if (
      !["novoNome", "novoSobrenome"].includes(campo.id) &&
      !sobrenome
    ) {
      e.preventDefault();
      mostrarToast("Informe o sobrenome do cliente", "error");
      document.getElementById("novoSobrenome")?.focus();
      return;
    }

    if (
      !["novoNome", "novoSobrenome", "novoTelefone"].includes(campo.id) &&
      !telefone
    ) {
      e.preventDefault();
      mostrarToast("Informe o telefone do cliente", "error");
      document.getElementById("novoTelefone")?.focus();
      return;
    }

    if (
      ![
        "novoNome",
        "novoSobrenome",
        "novoTelefone",
        "novoProfissional"
      ].includes(campo.id) &&
      !profissional
    ) {
      e.preventDefault();
      mostrarToast("Selecione um profissional primeiro", "error");
      document.getElementById("novoProfissional")?.focus();
      return;
    }

    if (
      ![
        "novoNome",
        "novoSobrenome",
        "novoTelefone",
        "novoProfissional",
        "novoServico"
      ].includes(campo.id) &&
      !servico
    ) {
      e.preventDefault();
      mostrarToast("Selecione um serviço primeiro", "error");
      document.getElementById("novoServico")?.focus();
      return;
    }

    if (
      ![
        "novoNome",
        "novoSobrenome",
        "novoTelefone",
        "novoProfissional",
        "novoServico",
        "novoData"
      ].includes(campo.id) &&
      !data
    ) {
      e.preventDefault();
      mostrarToast("Selecione uma data primeiro", "error");
      document.getElementById("novoData")?.focus();
      return;
    }

  }
);

function preencherSelectServicosNovoAtendimento(
  profissionalId = ""
) {

  const select =
    document.getElementById(
      "novoServico"
    );

  if (!select) return;

  const servicosFiltrados =
    profissionalId
      ? servicosCache.filter(
        s =>
          s.profissionalId ===
          profissionalId
      )
      : [];

  const categorias = {};

  console.log(
    "CATEGORIAS ENCONTRADAS:",
    servicosFiltrados.map(s => ({
      nome: s.nome,
      categoria: s.categoria
    }))
  );

  servicosFiltrados.forEach(servico => {

    const categoria =
      servico.categoria ||
      "Outros";

    if (!categorias[categoria]) {

      categorias[categoria] = [];

    }

    categorias[categoria].push(
      servico
    );

  });

  select.innerHTML =
    `<option value="">
      Selecione o serviço
    </option>`;

  Object.keys(categorias)
    .sort()
    .forEach(categoria => {

      const grupo =
        document.createElement(
          "optgroup"
        );

      grupo.label =
        categoria.toUpperCase();

      categorias[categoria]
        .sort((a, b) =>
          a.nome.localeCompare(
            b.nome
          )
        )
        .forEach(servico => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            servico.id;

          option.textContent =
            servico.nome;

          grupo.appendChild(
            option
          );

        });

      select.appendChild(
        grupo
      );

    });

}

function minToHHMMNovo(min) {

  const h = Math.floor(min / 60);
  const m = min % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function carregarHorariosNovoAgendamento() {
  const selectHora =
    document.getElementById("novoHora");

  const profissionalId =
    document.getElementById("novoProfissional")?.value;

  const servicoId =
    document.getElementById("novoServico")?.value;

  const data =
    document.getElementById("novoData")?.value;

  if (
    !profissionalId ||
    !servicoId ||
    !data
  ) {
    return;
  }

  if (!selectHora) return;

  selectHora.innerHTML = `
    <option value="">
      Selecione um horário
    </option>
  `;

  if (!profissionalId || !servicoId || !data) return;

  const profissional =
    profissionaisCache.find(
      p => p.id === profissionalId
    );

  const servico =
    servicosCache.find(
      s => s.id === servicoId
    );

  if (!profissional || !servico) return;

  const inicio =
    profissional.inicioExpediente || "08:30";

  const fim =
    profissional.fimExpediente || "18:00";

  const inicioMin =
    hhmmToMin(inicio);

  const fimMin =
    hhmmToMin(fim);

  const duracaoServico =
    Number(servico.tempoMin || 30);

  const step =
    30;

  const ocupados =
    agendaGeralCache.filter(item =>
      item.data === data &&
      item.colecao === profissional.colecao &&
      item.status !== "cancelado"
    );

  const horariosLivres = [];

  for (
    let atual = inicioMin;
    atual + duracaoServico <= fimMin;
    atual += step
  ) {
    const inicioNovo =
      atual;

    const fimNovo =
      atual + duracaoServico;

    const temConflito =
      ocupados.some(item => {
        const inicioExistente =
          hhmmToMin(item.hora);

        const duracaoExistente =
          Number(
            item.servicoTempoMin ||
            item.tempoMin ||
            30
          );

        const fimExistente =
          inicioExistente + duracaoExistente;

        return (
          inicioNovo < fimExistente &&
          inicioExistente < fimNovo
        );
      });

    if (!temConflito) {
      horariosLivres.push(
        minToHHMMNovo(atual)
      );
    }
  }

  selectHora.innerHTML = `
    <option value="">
      Selecione um horário
    </option>

    ${horariosLivres.map(hora => `
      <option value="${hora}">
        ${hora}
      </option>
    `).join("")}
  `;
}

lista?.addEventListener("click", async (event) => {
  const botaoEditar = event.target.closest(".btn-editar");
  const botaoExcluir = event.target.closest(".btn-excluir");

  if (botaoEditar) {
    document.getElementById("nome").value = botaoEditar.dataset.nome;
    document.getElementById("whatsapp").value = botaoEditar.dataset.whatsapp;
    document.getElementById("cargo").value = botaoEditar.dataset.cargo;
    document.getElementById("inicioExpediente").value = botaoEditar.dataset.inicio;
    document.getElementById("fimExpediente").value = botaoEditar.dataset.fim;

    form.dataset.editandoId = botaoEditar.dataset.id;

    dadosExistentes = {
      colecao: botaoEditar.dataset.colecao
    };

    form.querySelector("button[type='submit']").textContent = "Atualizar profissional";
    return;
  }

  if (botaoExcluir) {

    abrirModalConfirmacao({

      mensagem:
        "Tem certeza que deseja excluir este profissional?",

      onConfirmar: async () => {

        await excluirProfissional(
          botaoExcluir.dataset.id
        );

        mostrarToast(
          "Profissional removido"
        );

        await carregar();

        await carregarDashboard();

      }

    });

  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const cargo = document.getElementById("cargo").value.trim();
  const email = document.getElementById("emailProfissional").value.trim();
  const senha = document.getElementById("senhaProfissional").value.trim();
  const tipoAcesso = document.getElementById("tipoAcesso").value;
  const inicioExpediente = document.getElementById("inicioExpediente").value;
  const fimExpediente = document.getElementById("fimExpediente").value;

  if (!nome || !whatsapp || !cargo || !email || !senha || !inicioExpediente || !fimExpediente) {
    mostrarToast("Preencha todos os campos", "error");
    return;
  }

  const idEditando = form.dataset.editandoId;

  let uid = null;

  if (!idEditando) {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    uid = cred.user.uid;
    await signOut(auth);

    await signInWithEmailAndPassword(
      auth,
      loginEmail.value,
      loginSenha.value
    );
  }

  const dadosProfissional = {
    nome,
    whatsapp,
    cargo,
    email,
    uid,
    tipoAcesso,
    inicioExpediente,
    fimExpediente,
    colecao: idEditando
      ? dadosExistentes?.colecao
      : `reservas_${criarSlug(nome)}`,
    ativo: true,
    atualizadoEm: new Date().toISOString()
  };

  if (idEditando) {
    await atualizarProfissional(idEditando, dadosProfissional);
    delete form.dataset.editandoId;
    form.querySelector("button[type='submit']").textContent = "Salvar profissional";
  } else {
    await cadastrarProfissional({
      ...dadosProfissional,
      criadoEm: new Date().toISOString()
    });
  }

  mostrarToast(
    "Profissional atualizado"
  );

  form.reset();
  await carregar();
  await carregarDashboard();
});

function corrigirCaminhoImagemServico(fotoUrl) {
  if (!fotoUrl) {
    return "./assets/logo-top.png";
  }

  if (
    fotoUrl.startsWith("http://") ||
    fotoUrl.startsWith("https://")
  ) {
    return fotoUrl;
  }

  if (fotoUrl.startsWith("/assets/")) {
    return ".." + fotoUrl;
  }

  if (fotoUrl.startsWith("assets/")) {
    return "../" + fotoUrl;
  }

  if (fotoUrl.startsWith("./assets/")) {
    return "." + fotoUrl.replace("./", "/");
  }

  return fotoUrl;
}

async function carregarServicos() {

  listaServicos.innerHTML =
    "Carregando serviços...";

  const servicos =
    await buscarServicos();

  servicosCache = servicos;

  preencherSelectServicosNovoAtendimento();

  if (!servicos.length) {

    listaServicos.innerHTML =
      "Nenhum serviço cadastrado";

    return;
  }

  // =========================
  // AGRUPAR POR CATEGORIA
  // =========================

  const grupos = {};

  servicos.forEach((s) => {

    let categoria =
      s.categoria ||
      "Sem categoria";

    if (categoria === "Serviços de Cabelo") {
      categoria = "Cabelo";
    }

    if (categoria === "Serviços de Mão") {
      categoria = "Unhas";
    }

    if (!grupos[categoria]) {

      grupos[categoria] = [];

    }

    grupos[categoria].push(s);

  });

  // =========================
  // RENDER
  // =========================

  listaServicos.innerHTML =

    Object.entries(grupos)
      .map(([categoria, itens]) => `

        <div class="categoria-servico ${categoria === "Estética"
          ? "estetica"
          : categoria === "Cabelo"
            || categoria === "Serviços de Cabelo"
            ? "cabelo"
            : categoria === "Unhas"
              || categoria === "Serviços de Mão"
              || categoria === "Serviços de Pé"
              ? "unhas"
              : ""
        }">

         <h3
            class="categoria-titulo"
            data-categoria="${categoria}"
          >

            <span>

              ▼     

              ${categoria === "Cabelo" || categoria === "Serviços de Cabelo"
          ? "💇"
          : categoria === "Unhas"
            || categoria === "Serviços de Mão"
            || categoria === "Serviços de Pé"
            ? "💅"
            : categoria === "Estética"
              ? "✨"
              : "📌"
        }

              ${categoria}

              (${itens.length})

            </span>

          </h3>

          <div
            class="servicos-grid"
            data-categoria="${categoria}"
          >

                      ${itens.map(s => `

              <div class="servico-card">

                  <div class="servico-imagem">

                  <img
                    src="${corrigirCaminhoImagemServico(s.fotoUrl)}"
                    alt="${s.nome || 'Serviço'}"
                  >

                </div>

                <div class="servico-info">

                  <strong>
                    ${s.nome || "Sem nome"}
                  </strong>

                  <p>
                    💰 R$
                    ${Number(
          s.valor || 0
        ).toFixed(2)}
                  </p>

                  <p>
                    ⏱️
                    ${s.tempoMin || 0}
                    minutos
                  </p>

                </div>

                <div class="servico-acoes">

                  <button
                    type="button"
                    class="btn-editar-servico"
                    data-id="${s.id}"
                    data-nome="${s.nome || ""}"
                    data-valor="${s.valor || ""}"
                    data-tempo="${s.tempoMin || ""}"
                    data-categoria="${s.categoria || ""}"
                    data-foto="${s.fotoUrl || ""}"
                    data-profissional-id="${s.profissionalId || ""}"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    class="btn-excluir-servico"
                    data-id="${s.id}"
                  >
                    Excluir
                  </button>

                </div>

              </div>

            `).join("")}

          </div>

        </div>

      `).join("");

}


formServico?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("servicoNome").value.trim();
  const valor = Number(document.getElementById("servicoValor").value);
  const tempoMin = Number(document.getElementById("servicoTempo").value);
  const categoria = document.getElementById("servicoCategoria").value;

  const grupoOperacional = document.getElementById("grupoOperacional").value;

  const profissionalId = document.getElementById("profissionalServico").value;

  const profissional = profissionaisCache.find(p => p.id === profissionalId);
  const fotoUrl = document.getElementById("servicoFoto").value.trim();

  if (!nome || !valor || !tempoMin) {
    mostrarToast("Preencha todos os campos do serviço", "error");
    return;
  }

  const dadosServico = {
    nome,
    valor,
    tempoMin,
    categoria,

    grupoOperacional,

    profissionalId,
    profissionalNome: profissional?.nome || "",
    fotoUrl,
    ativo: true,
    atualizadoEm: new Date().toISOString()
  };

  const idEditando = formServico.dataset.editandoId;

  if (idEditando) {
    await atualizarServico(idEditando, dadosServico);
    delete formServico.dataset.editandoId;
    formServico.querySelector("button[type='submit']").textContent = "Salvar serviço";
  } else {
    await cadastrarServico({
      ...dadosServico,
      criadoEm: new Date().toISOString()
    });
  }

  mostrarToast(
    "Serviço atualizado"
  );

  formServico.reset();
  await carregarServicos();
  await carregarDashboard();
});

btnCancelarEdicao.onclick =
  () => {

    modalEdicao.classList.remove(
      "show"
    );

  };


listaServicos?.addEventListener("click", async (event) => {
  const botaoEditar = event.target.closest(".btn-editar-servico");
  const botaoExcluir = event.target.closest(".btn-excluir-servico");

  if (botaoEditar) {

    abrirModalEdicao({

      id:
        botaoEditar.dataset.id,

      nome:
        botaoEditar.dataset.nome,

      valor:
        botaoEditar.dataset.valor,

      tempoMin:
        botaoEditar.dataset.tempo

    });

    return;
  }

  if (botaoExcluir) {
    abrirModalConfirmacao({
      mensagem: "Tem certeza que deseja excluir este serviço?",

      onConfirmar: async () => {
        await excluirServico(botaoExcluir.dataset.id);

        mostrarToast("Serviço removido");

        await carregarServicos();
        await carregarDashboard();
      }
    });

    return;
  }
});

function renderizarAgendaGeral(lista) {

  if (!agendaGeralLista) return;

  if (!lista.length) {

    agendaGeralLista.innerHTML = `

    <div class="agenda-geral-vazia">

      <strong>
        Nenhum atendimento encontrado
      </strong>

      <span>
        Tente alterar os filtros da agenda.
      </span>

    </div>

  `;

    return;

  }

  lista.sort((a, b) => {

    const dataA =
      `${a.data || a.dataBR || ""} ${a.hora || ""}`;

    const dataB =
      `${b.data || b.dataBR || ""} ${b.hora || ""}`;

    return dataB.localeCompare(dataA);

  });

  // =========================
  // AGRUPAR POR DATA
  // =========================

  const grupos = {};

  lista.forEach(item => {

    if (
      !item.data &&
      !item.dataBR
    ) {

      console.error(
        "ITEM SEM DATA:",
        item
      );

    }

    const data =
      item.data ||
      item.dataBR ||
      "Sem data";

    if (!grupos[data]) {

      grupos[data] = [];

    }

    grupos[data].push(item);

  });

  // =========================
  // RENDER
  // =========================

  agendaGeralLista.innerHTML =

    Object.entries(grupos)
      .sort(([dataA], [dataB]) => {

        const a = new Date(dataA);
        const b = new Date(dataB);

        return b - a;

      })
      .map(([data, itens]) => {

        return `

        <div class="agenda-geral-grupo">

            <div class="agenda-geral-data">

              ${formatarTituloDataAgenda(data)}

            </div>

            <div class="agenda-geral-grid">

              ${itens.map(item => `

                  <div
                    data-agendamento-id="${item.id}"
                    class="agenda-geral-card
                      ${item.status || "confirmado"}
                      ${item.proximo ? "proximo" : ""}
                      ${item.atrasado ? "atrasado" : ""}
                    "
                  >

                  <div class="agenda-geral-card-topo">

                    <div class="agenda-geral-hora">

                      ${item.hora || "--:--"}

                    </div>

                    <div class="agenda-geral-topo-direita">

                      ${item.proximo ? `

                        <div class="badge-proximo">

                          PRÓXIMO

                        </div>

                      ` : ""}

                      <div class="agenda-geral-status ${item.status || "confirmado"}">

                        ${formatarStatusAgenda(item.status)}

                      </div>

                    </div>

                  </div>

                  <div class="agenda-geral-info">

                    <strong>

                      ${item.clienteNomeCompleto || item.clienteNome || "Cliente"}

                    </strong>

                    ${item.tipo === "encaixe"
            ? `
                        <div class="badge-encaixe">
                          ⚡ ENCAIXE
                        </div>
                      `
            : ""
          }

                    <span>

                      ${item.servicoNome || item.servico || "Serviço"}

                    </span>

                    <small>

                    📅 ${formatarDataBrasil(
            item.data || item.dataBR
          )}

                    </small>

                    <div class="agenda-geral-acoes">

                      ${agendamentoPendenteFinalizacao(item)
            ? `

                          <button
                            class="btn-finalizar-pendente"
                            data-id="${item.id}"
                            data-colecao="${item.colecao || item.profissionalColecao}"
                          >

                            Finalizar

                          </button>

                        `
            : ""
          }

                      ${item.status !== "cancelado"
            && item.status !== "finalizado"
            ? `

                          <button
                            class="btn-cancelar-agenda"
                            data-id="${item.id}"
                            data-colecao="${item.colecao}"
                          >

                            Cancelar

                          </button>

                        `
            : ""
          }

                      ${item.status === "cancelado"
            ? `

                          <button
                            class="btn-reativar-agenda"
                            data-id="${item.id}"
                            data-colecao="${item.colecao}"
                          >

                            Reativar

                          </button>

                        `
            : ""
          }

                    </div>

                  </div>

                </div>

              `).join("")}

            </div>

          </div>

      `;

      }).join("");

}

function formatarStatusAgenda(
  status
) {

  if (!status)
    return "Confirmado";

  const mapa = {

    confirmado:
      "Confirmado",

    atendimento:
      "Em atendimento",

    finalizado:
      "Finalizado",

    cancelado:
      "Cancelado"
  };

  return mapa[status] || status;
}

async function carregarAgendaGeral() {

  if (!agendaGeralLista) return;

  agendaGeralLista.innerHTML =
    "Carregando agenda geral...";

  // ===================================================
  // ETAPA 1 - Trabalhar somente com o profissional logado
  // A visão administrativa do salão será implementada
  // posteriormente em uma tela própria.
  // ===================================================

  const profissionais = [perfilLogado];

  console.log("PERFIL LOGADO AGENDA:", perfilLogado);
  console.log("COLEÇÃO AGENDA:", perfilLogado?.colecao);

  const agendamentos =
    await buscarAgendamentosPorProfissionais(
      profissionais
    );

  console.log(
    "TODAS AS DATAS:",
    [...new Set(
      agendamentos.map(a => a.data)
    )]
  );

  console.log(
    "TODOS AGENDAMENTOS:",
    agendamentos
  );

  agendaGeralCache =
    [...agendamentos];

  const agora =
    new Date();

  const horaAtual =
    agora.getHours() * 60 +
    agora.getMinutes();

  const hojeLocal =
    `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

  let proximoDefinido = false;

  agendaGeralCache.forEach(item => {

    item.atrasado = false;
    item.proximo = false;

    if (!item.data || !item.hora) return;

    const [h, m] =
      item.hora
        .split(":")
        .map(Number);

    const horarioItem =
      h * 60 + m;

    // =========================
    // ATRASADO
    // =========================

    if (

      item.data === hojeLocal &&

      horarioItem < horaAtual &&

      item.status !== "finalizado" &&

      item.status !== "cancelado" &&

      item.status !== "atendimento"

    ) {

      item.atrasado = true;

    }

    // =========================
    // PRÓXIMO
    // =========================

    if (

      !proximoDefinido &&

      item.data === hojeLocal &&

      horarioItem >= horaAtual &&

      item.status !== "finalizado" &&

      item.status !== "cancelado"

    ) {

      item.proximo = true;

      proximoDefinido = true;

    }

  });

  agendaGeralCache.sort((a, b) => {

    const dataA =
      `${a.data} ${a.hora} `;

    const dataB =
      `${b.data} ${b.hora} `;

    return (
      new Date(dataA) -
      new Date(dataB)
    );

  });

  aplicarFiltrosAgendaGeral();

}

async function carregarDashboard() {

  dashboardResumo.innerHTML = "Carregando...";
  agendaOperacionalLista.innerHTML = "Carregando agenda...";

  // ===================================================
  // ETAPA 1 - Trabalhar somente com o profissional logado
  // A visão administrativa do salão será implementada
  // posteriormente em uma tela própria.
  // ===================================================

  const profissionais = [perfilLogado];

  console.log("PERFIL LOGADO DASHBOARD:", perfilLogado);
  console.log("COLEÇÃO DASHBOARD:", perfilLogado?.colecao);

const agendamentos =
  await buscarAgendamentosPorProfissionais(profissionais);

console.log(
  "AGENDAMENTOS COMPLETOS:",
  agendamentos
);

agendamentos.forEach(item => {

  item.status =
    String(
      item.status || "confirmado"
    ).toLowerCase();

});

const hoje = new Date();

const hojeLocal =

  `${hoje.getFullYear()}-${String(hoje.getMonth() + 1)
    .padStart(2, "0")
  }-${String(hoje.getDate())
    .padStart(2, "0")
  }`;

const agendaHoje =

  agendamentos.filter(
    item => item.data === hojeLocal
  );

console.log(
  "HOJE LOCAL:",
  hojeLocal
);

const agendaConcluidos =

  agendaHoje.filter(item =>

    item.status === "finalizado"

  );

console.log(
  "AGENDA HOJE:",
  agendaHoje
);

console.log(
  "STATUS AGENDA HOJE:",
  agendaHoje.map(item => ({
    hora: item.hora,
    status: item.status,
    data: item.data
  }))
);

const agoraPendencias = new Date();

const agendaPendentesFinalizacao =

  agendamentos.filter(item => {

    if (
      item.status === "finalizado" ||
      item.status === "cancelado"
    ) {
      return false;
    }

    const dataHoraInicio =
      new Date(
        `${item.data}T${item.hora || "00:00"}`
      );

    const dataHoraFim =
      new Date(
        dataHoraInicio.getTime() +
        (
          Number(item.servicoTempoMin || 0)
          * 60000
        )
      );

    return agoraPendencias > dataHoraFim;

  });

console.log(
  "STATUS AGORA:",
  agendaHoje.map(item => ({
    hora: item.hora,
    status: item.status,
    servico: item.servicoNome
  }))
);

agendaPendentesFinalizacao.forEach(p => {

  const encontrado =
    agendaHoje.find(
      item => item.id === p.id
    );

  if (encontrado) {

    encontrado.pendenteFinalizacao = true;

  }

});

const primeiraPendencia =
  agendaPendentesFinalizacao[0];

const maisAntigaPendencia =
  agendaPendentesFinalizacao
    .sort(
      (a, b) =>
        new Date(`${a.data}T${a.hora}`) -
        new Date(`${b.data}T${b.hora}`)
    )[0];

console.log(
  "MAIS ANTIGA:",
  maisAntigaPendencia
);

const diasEmAberto =
  maisAntigaPendencia

    ? Math.floor(

      (
        new Date() -
        new Date(
          `${maisAntigaPendencia.data}T${maisAntigaPendencia.hora}`
        )
      ) /

      (1000 * 60 * 60 * 24)

    )

    : 0;

const totalPendentesFinalizacao =
  agendaPendentesFinalizacao.length;

const dashboardAlertas =
  document.getElementById(
    "dashboard-alertas"
  );

const alertaPendenciasFixo =
  document.getElementById(
    "alerta-pendencias-fixo"
  );

console.log(
  "DASHBOARD ALERTAS:",
  dashboardAlertas
);

const agora = new Date();

const horaAtual =
  agoraPendencias.getHours() * 60 +
  agoraPendencias.getMinutes();

const agendaOrdenada =
  [...agendaHoje]
    .sort((a, b) => {

      const [ha, ma] =
        (a.hora || "00:00")
          .split(":")
          .map(Number);

      const [hb, mb] =
        (b.hora || "00:00")
          .split(":")
          .map(Number);

      return (
        (ha * 60 + ma) -
        (hb * 60 + mb)
      );
    });

let proximoDefinido = false;

agendaOrdenada.forEach(item => {

  item.atrasado = false;
  item.proximo = false;

  const [h, m] =
    (item.hora || "00:00")
      .split(":")
      .map(Number);

  const horarioItem =
    h * 60 + m;

  if (

    item.data === hojeLocal &&

    horarioItem < horaAtual &&

    item.status !== "atendimento" &&

    item.status !== "finalizado" &&

    item.status !== "cancelado"

  ) {

    item.atrasado = true;

  }

  if (
    !proximoDefinido &&

    item.data === hojeLocal &&

    horarioItem >= horaAtual &&

    item.status !== "finalizado" &&

    item.status !== "cancelado"

  ) {

    item.proximo = true;

    proximoDefinido = true;
  }
});

const resumo = montarResumoDashboard(agendamentos, profissionais, perfilLogado);

const esconderFinanceiroGlobal = perfilLogado?.tipoAcesso === "profissional_admin";

dashboardResumo.innerHTML = `

      <div class="kpi-card">
    <span>📅 Hoje</span>
    <strong>${resumo.totalHoje}</strong>
    <small>Agendamentos</small>
  </div>

      <div class="kpi-card">
        <span>🗓️ Mês</span>
        <strong>${resumo.totalMes}</strong>
        <small>Agendamentos</small>
      </div>

  ${esconderFinanceiroGlobal
    ? `
        <div class="kpi-card">
          <span>💰 Meu Hoje</span>
          <strong>
            R$ ${resumo.faturamentoHoje.toFixed(2)}
          </strong>
          <small>Faturamento</small>
        </div>

        <div class="kpi-card">
          <span>💎 Meu Mês</span>
          <strong>
            R$ ${resumo.faturamentoMes.toFixed(2)}
          </strong>
          <small>Faturamento</small>
        </div>
      `
    : `
        <div class="kpi-card">
          <span>💰 Hoje</span>
          <strong>
            R$ ${resumo.faturamentoHoje.toFixed(2)}
          </strong>
          <small>Faturamento</small>
        </div>

        <div class="kpi-card">
          <span>💎 Mês</span>
          <strong>
            R$ ${resumo.faturamentoMes.toFixed(2)}
          </strong>
          <small>Faturamento</small>
        </div>
      `
  }

    <div class="kpi-card">
      <span>👥 Ativos</span>
      <strong>${resumo.profissionaisAtivos}</strong>
      <small>Profissionais</small>
    </div>

    `;

if (alertaPendenciasFixo) {

  alertaPendenciasFixo.innerHTML =

    totalPendentesFinalizacao

      ? `

      <div class="alerta-operacional">

        <div class="alerta-header">

          <div class="alerta-header-icon">
            ⚠
          </div>

          <div class="alerta-header-info">

            <strong>
              Pendências Operacional
            </strong>

            <span>
              ${totalPendentesFinalizacao}
              pendência(s) aguardando baixa
            </span>

            <small class="alerta-urgencia">
              Atualize Sua Agenda
            </small>

          </div>

        </div>

        <div class="alerta-primeira-pendencia">

          <small>Cliente</small>

          <strong>
            ${maisAntigaPendencia?.clienteNome || "Cliente"}
          </strong>

          <small>Serviço</small>

          <strong>
            ${maisAntigaPendencia?.servicoNome || ""}
          </strong>

          <small>Em aberto desde</small>

          <strong>
            ${maisAntigaPendencia?.dataBR ||
      maisAntigaPendencia?.data ||
      ""}
          </strong>

          <strong>
            ${maisAntigaPendencia?.hora || "--:--"}
          </strong>

          <small class="alerta-atraso">
            🔴 Há ${diasEmAberto} dia(s)
          </small>

          <span class="alerta-operacao-desatualizada">
            A operação está desatualizada
          </span>

          <div class="contador-pendencias">

            <small>
              Pendências em aberto
            </small>

            <strong>
              ${totalPendentesFinalizacao}
            </strong>

          </div>

        </div>

        <button
          id="btn-resolver-pendencia"
          class="btn-resolver-pendencia"
          data-id="${maisAntigaPendencia?.id}"
          data-colecao="${maisAntigaPendencia?.colecao}"
        >

          Dar Baixa no Atendimento

        </button>

      </div>

    `

      : "";

  alertaPendenciasFixo.style.display =
    "block";



  alertaPendenciasFixo.style.display =
    totalPendentesFinalizacao
      ? "block"
      : "none";

}

if (!agendamentos.length) {

  montarGraficoFaturamento([]);

  agendaOperacionalLista.innerHTML = `
      <div class="agenda-geral-vazia">
        Nenhum atendimento hoje
      </div>
    `;

  agendaConcluidosLista.innerHTML = `
      <div class="agenda-geral-vazia">
        Nenhum atendimento finalizado hoje
      </div>
    `;

  return;

}

montarGraficoFaturamento(agendamentos);

const agendaOperacional =

  agendaOrdenada.filter(item =>

    item.status !== "finalizado"

  );

console.log(
  "PENDENTES FINALIZACAO:",
  agendaPendentesFinalizacao
);

agendaOperacionalLista.innerHTML =

  agendaOperacional.length

    ? `

<div class="agenda-geral-grid">

${agendaOperacional

      .map(item => `

<div
  data-agendamento-id="${item.id}"
  class="
    agenda-geral-card
    ${item.status || "confirmado"}
    ${item.pendenteFinalizacao ? "pendente-finalizacao" : ""}
  "
>

  <div class="agenda-geral-card-topo">

    <div class="agenda-geral-hora">
      ${item.hora}
    </div>

    <div class="agenda-geral-status ${item.status}">
      ${formatarStatusAgenda(item.status)}
    </div>

  </div>

    <div class="agenda-geral-info">

      <strong>
        ${item.clienteNome}
      </strong>

      <span>
        ${item.servicoNome}
      </span>

      <small>
        ${item.profissionalNome}
      </small>

    <div class="agenda-geral-acoes">

      ${item.status === "confirmado" ? `

      <button
        class="btn-status atendimento btn-agenda-dia-status"
        data-id="${item.id}"
        data-colecao="${item.colecao}"
        data-status="atendimento"
      >
        Atendimento
      </button>

      <button
        class="btn-status cancelado btn-agenda-dia-status"
        data-id="${item.id}"
        data-colecao="${item.colecao}"
        data-status="cancelado"
      >
        Cancelar
      </button>

      ` : ""}

      ${item.status === "atendimento" ? `

      <button
        class="btn-status finalizado btn-agenda-dia-status"
        data-id="${item.id}"
        data-colecao="${item.colecao}"
        data-status="finalizado"
      >
        Finalizar
      </button>

      <button
        class="btn-status cancelado btn-agenda-dia-status"
        data-id="${item.id}"
        data-colecao="${item.colecao}"
        data-status="cancelado"
      >
        Cancelar
      </button>

      ` : ""}

      ${item.status === "cancelado" ? `

      <span class="status-info">
        Atendimento cancelado
      </span>

      ` : ""}

      ${item.status === "finalizado" ? `

      <span class="status-info">
        Atendimento finalizado
      </span>

      ` : ""}

    </div> 

  </div>

</div>

`).join("")}

</div>

`

    : `

<div class="agenda-geral-vazia">

  Nenhum atendimento operacional hoje

</div>

`;

agendaConcluidosLista.innerHTML = `

      <div class="agenda-operacional-grid">

        ${agendaConcluidos.map(item => `

  <div class="agenda-operacional-card finalizado">

    <div class="agenda-operacional-hora">

      ${item.hora || "--:--"}

    </div>

    <div class="agenda-operacional-info">

      <strong>
        ${item.clienteNomeCompleto || "Cliente"}
      </strong>

      <span>
        ${item.servicoNome || "Serviço"}
      </span>

      <small>
        ${item.profissionalNome || "Profissional"}
      </small>

    </div>

    <button
       class="btn-status atendimento btn-agenda-dia-status"
      data-id="${item.id}"
      data-colecao="${item.colecao}"
      data-status="atendimento"
     >

      Reabrir

    </button>

  </div>

`).join("")

  }

</div>
      `;

}

document.addEventListener(
  "click",
  async (e) => {

    const botao =
      e.target.closest(
        ".btn-agenda-dia-status"
      );

    if (!botao) return;

    const id =
      botao.dataset.id;

    const colecao =
      botao.dataset.colecao;

    const novoStatus =
      botao.dataset.status;

    console.trace(
      "[CLIQUE STATUS AGENDA DIA]",
      {
        id,
        colecao,
        novoStatus,
        textoBotao: botao.textContent.trim(),
        classeBotao: botao.className
      }
    );

    if (!id || !colecao || !novoStatus) {

      mostrarToast(
        "Erro ao localizar atendimento",
        "error"
      );

      return;

    }

    await atualizarStatusAgendamento(
      id,
      colecao,
      novoStatus
    );

    await carregarDashboard();

  }
);

document.addEventListener(
  "click",
  (e) => {

    const btn =
      e.target.closest(
        "#btn-resolver-pendencia"
      );

    if (!btn) return;

    const id =
      btn.dataset.id;

    const colecao =
      btn.dataset.colecao;

    abrirModalConfirmacao({

      titulo:
        "Finalizar atendimento",

      mensagem:
        "Deseja finalizar esta pendência?",

      textoBotao:
        "Finalizar",

      onConfirmar: async () => {

        await atualizarStatusAgendamento(
          id,
          colecao,
          "finalizado"
        );

        mostrarToast(
          "Pendência resolvida com sucesso",
          "success"
        );

        await carregarDashboard();

      }

    });

  }
);

function montarGraficoFaturamento(agendamentos) {
  const mapa = {};

  agendamentos.forEach(a => {
    if (!a.data) return;

    if (!mapa[a.data]) {
      mapa[a.data] = 0;
    }

    mapa[a.data] += Number(a.servicoValor || a.valor || 0);
  });

  const datas = Object.keys(mapa).sort();
  const valores = datas.map(d => mapa[d]);

  const ctx = document.getElementById("graficoFaturamento");

  if (!ctx || typeof Chart === "undefined") return;

  if (chartFaturamento) {
    chartFaturamento.destroy();
  }

  chartFaturamento = new Chart(ctx, {
    type: "bar",
    data: {
      labels: datas,
      datasets: [{
        label: "Faturamento (R$)",
        data: valores
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const prof = await buscarProfissionalPorUID(user.uid);

    if (prof && prof.tipo === "profissional_restrito") {
      mostrarToast("Acesso restrito", "error");
      await signOut(auth);
      return;
    }

    loginBox.style.display = "none";
    adminContent.style.display = "block";

    if (adminEmail) {
      adminEmail.textContent = user.email;
    }

    usuarioLogado = user;

    await carregarPerfilUsuario();

    await carregar();

    await carregarServicos();

    await carregarDashboard();

    await carregarAgendaGeral();
  } else {
    loginBox.style.display = "block";
    adminContent.style.display = "none";
  }
});

async function carregarPerfilUsuario() {

  if (!usuarioLogado?.uid) {
    perfilLogado = null;
    return;
  }

  const snap = await getDocs(collection(db, "profissionais"));

  perfilLogado = null;

  snap.forEach((docSnap) => {

    const prof = docSnap.data();

    if (prof.uid === usuarioLogado.uid) {

      perfilLogado = {
        id: docSnap.id,
        ...prof
      };

    }

  });

  // ✅ CORREÇÃO CRÍTICA:
  // Se o usuário logado não estiver vinculado a um profissional,
  // tratamos como admin geral para não quebrar o carregamento.
  if (!perfilLogado) {

    perfilLogado = {
      id: usuarioLogado.uid,
      nome: usuarioLogado.email || "Administrador",
      email: usuarioLogado.email || "",
      tipoAcesso: "admin"
    };

    console.warn(
      "Usuário autenticado sem perfil em profissionais. Aplicando acesso admin geral:",
      perfilLogado
    );

  }

}

function aplicarPermissoes() {

  if (!perfilLogado) return;

  const isAdmin =
    perfilLogado.tipoAcesso === "admin" ||
    perfilLogado.tipoAcesso === "profissional_admin";

  if (isAdmin) return;

  document.querySelectorAll(".menu-admin").forEach((el) => {
    el.style.display = "none";
  });

}

btnLogout?.addEventListener(
  "click",
  async () => {

    await signOut(auth);

    location.reload();

  }
);

document.addEventListener(
  "click",
  (e) => {

    const btnPendencias =
      e.target.closest(
        "#btn-ver-pendencias"
      );

    if (!btnPendencias) return;

    const primeiraPendencia =
      document.querySelector(
        ".pendente-finalizacao"
      );

    primeiraPendencia
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

  }
);

btnMenuMobile
  ?.addEventListener(
    "click",
    () => {

      sidebar.classList.toggle(
        "ativo"
      );

    }
  );

buscaAgendaGeral
  ?.addEventListener(
    "input",
    aplicarFiltrosAgendaGeral
  );

filtroStatusAgenda
  ?.addEventListener(
    "change",
    aplicarFiltrosAgendaGeral
  );

filtroPeriodoAgenda
  ?.addEventListener(
    "change",
    aplicarFiltrosAgendaGeral
  );

function formatarDataBrasil(data) {

  if (!data) return "--/--/----";

  // já está em BR
  if (data.includes("/")) {

    const partes = data.split("/");

    if (partes.length === 3) {
      return data;
    }

  }

  // formato ISO
  if (data.includes("-")) {

    const d =
      new Date(data + "T00:00:00");

    return d.toLocaleDateString(
      "pt-BR"
    );

  }

  return "--/--/----";

}

function formatarTituloDataAgenda(data) {

  if (!data) return "Sem data";

  let dataObj;

  if (data.includes("/")) {

    const [dia, mes, ano] =
      data.split("/").map(Number);

    dataObj =
      new Date(
        ano,
        mes - 1,
        dia
      );

  } else {

    dataObj =
      new Date(data + "T00:00:00");

  }

  return dataObj.toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "2-digit"
    }
  ).toUpperCase();

}

function aplicarFiltrosAgendaGeral() {

  let lista =
    [...agendaGeralCache];

  const periodo =
    filtroPeriodoAgenda?.value || "todos";

  const hoje =
    new Date();

  lista = lista.filter(item => {

    if (
      periodo === "todos"
    ) {

      return true;

    }

    if (!item.data) {

      return false;

    }

    let dataObj;

    if (item.data.includes("-")) {

      const [
        ano,
        mes,
        dia
      ] = item.data.split("-").map(Number);

      dataObj =
        new Date(
          ano,
          mes - 1,
          dia
        );

    } else {

      const [
        dia,
        mes,
        ano
      ] = item.data.split("/").map(Number);

      dataObj =
        new Date(
          ano,
          mes - 1,
          dia
        );

    }

    const diffDias =
      Math.floor(

        (
          hoje - dataObj
        )

        / 86400000

      );

    if (
      periodo === "hoje"
    ) {

      return diffDias === 0;

    }

    if (
      periodo === "semana"
    ) {

      const inicioSemana = new Date(hoje);

      inicioSemana.setHours(0, 0, 0, 0);

      const diaSemana = inicioSemana.getDay();

      const ajuste =
        diaSemana === 0
          ? -6
          : 1 - diaSemana;

      inicioSemana.setDate(
        inicioSemana.getDate() + ajuste
      );

      const fimSemana = new Date(inicioSemana);

      fimSemana.setDate(
        inicioSemana.getDate() + 6
      );

      fimSemana.setHours(
        23,
        59,
        59,
        999
      );

      return (
        dataObj >= inicioSemana &&
        dataObj <= fimSemana
      );

    }
    if (
      periodo === "mes"
    ) {

      return (
        dataObj.getMonth() === hoje.getMonth()
        &&
        dataObj.getFullYear() === hoje.getFullYear()
      );

    }

    return true;

  });

  const busca =
    buscaAgendaGeral
      ?.value
      ?.toLowerCase()
      ?.trim() || "";

  const statusSelecionado =
    filtroStatusAgenda?.value || "";

  if (busca) {

    lista = lista.filter(item => {

      const cliente =
        (
          item.clienteNomeCompleto ||
          ""
        ).toLowerCase();

      return cliente.includes(busca);

    });

  }

  console.log(
    "STATUS ENCONTRADOS:",
    lista.map(item => ({
      cliente: item.clienteNomeCompleto,
      status: item.status
    }))
  );

  if (statusSelecionado) {

    lista = lista.filter(item => {

      const statusReal = String(
        item.status || "confirmado"
      )
        .trim()
        .toLowerCase();

      const statusNormalizado =
        statusReal === "assinar_link"
          ? "confirmado"
          : statusReal;

      return statusNormalizado === statusSelecionado;

    });

  }

  atualizarResumoAgendaGeral(
    lista
  );

  renderizarResumoProfissionais(
    lista
  );

  renderizarAgendaGeral(
    lista
  );

}

if (btnToggleAgendaGeral && agendaGeral) {

  btnToggleAgendaGeral.addEventListener("click", () => {

    agendaGeral.classList.toggle(
      "agenda-geral-fechada"
    );

    const estaFechada =
      agendaGeral.classList.contains(
        "agenda-geral-fechada"
      );

    btnToggleAgendaGeral.innerHTML =
      estaFechada
        ? "▼ Abrir agenda"
        : "▲ Fechar agenda";

  });

}

async function cancelarAgendamentoAgenda(
  id,
  colecao
) {

  cancelamentoTemp = {
    id,
    colecao
  };

  modalCancelamento
    ?.classList.remove("hidden");

  return;

  try {

    const ref =
      doc(
        db,
        colecao,
        id
      );

    await updateDoc(ref, {

      status: "cancelado"

    });

    agendaGeralCache =
      agendaGeralCache.map(item => {

        if (item.id === id) {

          return {

            ...item,

            status: "cancelado"

          };

        }

        return item;

      });

    aplicarFiltrosAgendaGeral();

    mostrarToast(
      "Agendamento cancelado com sucesso",
      "sucesso"
    );

  } catch (error) {

    mostrarToast(
      "Erro ao cancelar agendamento",
      "erro"
    );

  }

}

document.addEventListener(
  "click",
  async (e) => {

    const btn =
      e.target.closest(
        ".btn-cancelar-agenda"
      );

    if (!btn) return;

    const id =
      btn.dataset.id;

    const colecao =
      btn.dataset.colecao;

    await cancelarAgendamentoAgenda(
      id,
      colecao
    );

  }
);

btnFecharCancelamento
  ?.addEventListener(
    "click",
    () => {

      modalCancelamento
        ?.classList.add("hidden");

      cancelamentoTemp = null;

    }
  );

btnConfirmarCancelamento
  ?.addEventListener(
    "click",
    async () => {

      if (!cancelamentoTemp) return;

      try {

        const ref =
          doc(
            db,
            cancelamentoTemp.colecao,
            cancelamentoTemp.id
          );

        await updateDoc(ref, {

          status: "cancelado"

        });

        agendaGeralCache =
          agendaGeralCache.map(item => {

            if (item.id === cancelamentoTemp.id) {

              return {

                ...item,

                status: "cancelado"

              };

            }

            return item;

          });

        await carregarAgendaGeral();

        mostrarToast(
          "Agendamento cancelado",
          "sucesso"
        );

      } catch (error) {

        mostrarToast(
          "Erro ao cancelar",
          "erro"
        );

      }

      modalCancelamento
        ?.classList.add("hidden");

      cancelamentoTemp = null;

    }
  );

modalCancelamento?.addEventListener(
  "click",
  (e) => {

    if (
      e.target === modalCancelamento
    ) {

      modalCancelamento.classList.add(
        "hidden"
      );

      cancelamentoTemp = null;

    }

  }
);

async function atualizarStatusAgendamento(
  id,
  colecao,
  status
) {

  console.trace(
    "[ATUALIZAR STATUS]",
    {
      id,
      colecao,
      status
    }
  );

  try {

    if (!id || !colecao) {

      mostrarToast(
        "Erro ao localizar agendamento",
        "erro"
      );

      return;

    }

    const ref =
      doc(
        db,
        colecao,
        id
      );

    await updateDoc(ref, {

      status

    });

    agendaGeralCache =
      agendaGeralCache.map(item => {

        if (item.id === id) {

          return {

            ...item,

            status

          };

        }

        return item;

      });

    aplicarFiltrosAgendaGeral();

    mostrarToast(
      status === "atendimento"
        ? "Atendimento iniciado"
        : status === "finalizado"
          ? "Atendimento finalizado"
          : status === "cancelado"
            ? "Atendimento cancelado"
            : "Status atualizado",
      "success"
    );

  } catch (error) {

    console.error(error);

    mostrarToast(
      "Erro ao atualizar status",
      "erro"
    );

  }

}

document.addEventListener(
  "click",
  async (e) => {

    const botao =
      e.target.closest(
        ".btn-finalizar-pendente"
      );

    if (!botao) return;

    const id =
      botao.dataset.id;

    const colecao =
      botao.dataset.colecao;

    if (!id || !colecao) {

      return;

    }

    try {

      const ref =
        doc(
          db,
          colecao,
          id
        );

      await updateDoc(ref, {

        status: "finalizado"

      });

      agendaGeralCache =
        agendaGeralCache.map(item => {

          if (item.id === id) {

            return {

              ...item,

              status: "finalizado"

            };

          }

          return item;

        });

      aplicarFiltrosAgendaGeral();

      mostrarToast(
        "Atendimento finalizado",
        "sucesso"
      );

    } catch (error) {

      mostrarToast(
        "Erro ao finalizar",
        "erro"
      );

    }

  }
);

document.addEventListener(
  "click",
  async (e) => {

    const reativar =
      e.target.closest(
        ".btn-reativar-agenda"
      );

    if (!reativar) return;

    const id =
      reativar.dataset.id;

    const colecao =
      reativar.dataset.colecao;

    const agendamento =
      agendaGeralCache.find(item =>

        item.id === id

      );

    if (!agendamento) return;

    const conflito =
      await verificarConflitoReativacao(
        agendamento
      );

    if (conflito) {

      mostrarToast(
        "Não foi possível reativar. Já existe um atendimento neste horário.",
        "error"
      );

      return;

    }

    await atualizarStatusAgendamento(
      id,
      colecao,
      "confirmado"
    );

  }
);

function hhmmToMin(hhmm) {
  const [h, m] = String(hhmm || "00:00")
    .split(":")
    .map(Number);

  return (h * 60) + (m || 0);
}

async function verificarConflitoReativacao(
  agendamento
) {

  try {

    const reservasRef =
      collection(
        db,
        agendamento.colecao
      );

    const snapshot =
      await getDocs(reservasRef);

    const inicioAtual =
      hhmmToMin(agendamento.hora);

    const duracaoAtual =
      Number(
        agendamento.servicoTempoMin ||
        agendamento.tempoMin ||
        30
      );

    const fimAtual =
      inicioAtual + duracaoAtual;

    const existeConflito =
      snapshot.docs.some(docItem => {

        if (
          docItem.id === agendamento.id
        ) {
          return false;
        }

        const item =
          docItem.data();

        if (
          item.status === "cancelado"
        ) {
          return false;
        }

        if (
          item.data !== agendamento.data
        ) {
          return false;
        }

        const inicioItem =
          hhmmToMin(item.hora);

        const duracaoItem =
          Number(
            item.servicoTempoMin ||
            item.tempoMin ||
            30
          );

        const fimItem =
          inicioItem + duracaoItem;

        return (
          inicioAtual < fimItem &&
          inicioItem < fimAtual
        );

      });

    return existeConflito;

  } catch (error) {

    console.error(
      "[REATIVAR]",
      error
    );

    return true;

  }

}

function agendamentoPendenteFinalizacao(item) {

  const status =
    item.status || "confirmado";

  if (status !== "confirmado") {

    return false;

  }

  if (!item.data || !item.hora) {

    return false;

  }

  let ano;
  let mes;
  let dia;

  // DATA ISO
  if (item.data.includes("-")) {

    [ano, mes, dia] =
      item.data.split("-").map(Number);

  }

  // DATA BR
  else {

    [dia, mes, ano] =
      item.data.split("/").map(Number);

  }

  const [hora, minuto] =
    item.hora.split(":").map(Number);

  const dataAgendamento =
    new Date(
      ano,
      mes - 1,
      dia,
      hora,
      minuto,
      0,
      0
    );

  return dataAgendamento < new Date();

}

function atualizarResumoAgendaGeral(
  lista
) {

  const faturamento =
    lista
      .filter(item =>

        item.status === "finalizado"

      )
      .reduce((total, item) => {

        return total +

          Number(
            item.servicoValor ||
            item.valor ||
            0
          );

      }, 0);

  const finalizados =
    lista.filter(item =>

      item.status === "finalizado"

    ).length;

  const cancelados =
    lista.filter(item =>

      item.status === "cancelado"

    ).length;

  const atendimentos =
    lista.length;

  const ticketMedio =

    finalizados > 0

      ? faturamento / finalizados

      : 0;

  const taxaCancelamento =

    atendimentos > 0

      ? (
        cancelados
        / atendimentos
      ) * 100

      : 0;

  const profissionaisMap = {};

  lista.forEach(item => {

    const nome =
      item.profissionalNome
      || "Profissional";

    if (!profissionaisMap[nome]) {

      profissionaisMap[nome] = {

        total: 0,
        atendimentos: 0

      };

    }

    if (
      item.status === "finalizado"
    ) {

      profissionaisMap[nome].total +=
        Number(
          item.servicoValor
          || item.valor
          || 0
        );

    }

    profissionaisMap[nome].atendimentos++;

  });

  const kpiFaturamento =
    document.getElementById(
      "kpi-faturamento-geral"
    );

  const kpiFinalizados =
    document.getElementById(
      "kpi-finalizados-geral"
    );

  const kpiCancelados =
    document.getElementById(
      "kpi-cancelados-geral"
    );

  const kpiAtendimentos =
    document.getElementById(
      "kpi-atendimentos-geral"
    );

  const kpiTicketMedio =
    document.getElementById(
      "kpi-ticket-medio"
    );

  const kpiTaxaCancelamento =
    document.getElementById(
      "kpi-taxa-cancelamento"
    );

  const kpiTopProfissional =
    document.getElementById(
      "kpi-top-profissional"
    );

  const cardCancelamento =
    kpiTaxaCancelamento
      ?.closest(".agenda-geral-kpi");

  const cardFaturamento =
    kpiFaturamento
      ?.closest(".agenda-geral-kpi");

  const cardTicket =
    kpiTicketMedio
      ?.closest(".agenda-geral-kpi");

  if (kpiFaturamento) {

    kpiFaturamento.textContent =

      `R$ ${faturamento.toFixed(2)} `;

  }

  if (kpiFinalizados) {

    kpiFinalizados.textContent =
      finalizados;

  }

  if (kpiCancelados) {

    kpiCancelados.textContent =
      cancelados;

  }

  if (kpiAtendimentos) {

    kpiAtendimentos.textContent =
      atendimentos;

  }

  if (kpiTicketMedio) {

    kpiTicketMedio.textContent =

      `R$ ${ticketMedio.toFixed(2)} `;

  }

  if (kpiTaxaCancelamento) {

    kpiTaxaCancelamento.textContent =

      `${taxaCancelamento.toFixed(0)}% `;

  }

  /* RESET */

  cardCancelamento
    ?.classList.remove(
      "kpi-alerta"
    );

  cardFaturamento
    ?.classList.remove(
      "kpi-destaque"
    );

  cardTicket
    ?.classList.remove(
      "kpi-destaque"
    );

  /* ALERTA CANCELAMENTO */

  if (taxaCancelamento >= 20) {

    cardCancelamento
      ?.classList.add(
        "kpi-alerta"
      );

  }

  /* FATURAMENTO */

  if (faturamento >= 1000) {

    cardFaturamento
      ?.classList.add(
        "kpi-destaque"
      );

  }

  /* TICKET */

  if (ticketMedio >= 70) {

    cardTicket
      ?.classList.add(
        "kpi-destaque"
      );

  }

}


function renderizarResumoProfissionais(
  lista
) {

  const container =
    document.getElementById(
      "resumo-profissionais"
    );

  if (!container) return;

  const mapa = {};

  lista.forEach(item => {

    const nome =

      item.profissionalNome

      || item.profissional

      || item.profissionalId

      || "Profissional";

    if (!mapa[nome]) {

      mapa[nome] = {

        total: 0,
        atendimentos: 0

      };

    }

    if (
      item.status === "finalizado"
    ) {

      mapa[nome].total +=
        Number(
          item.servicoValor
          || item.valor
          || 0
        );

    }

    mapa[nome].atendimentos++;

  });

  container.innerHTML =

    Object.entries(mapa)
      .map(([nome, dados]) => {

        const ticket =

          dados.atendimentos > 0

            ? dados.total
            / dados.atendimentos

            : 0;

        return `

      <div class="profissional-card">

            <strong>

              ${nome}

            </strong>

            <small>

              Atendimentos:
              ${dados.atendimentos}

            </small>

            <small>

              Faturamento:
              R$ ${dados.total.toFixed(2)}

            </small>

            <small>

              Ticket médio:
              R$ ${ticket.toFixed(2)}

            </small>

          </div>

      `;

      }).join("");

}

document.addEventListener("click", (e) => {
  const btnCancelar =
    e.target.closest("#btn-cancelar-modal");

  if (!btnCancelar) return;

  const modal =
    document.getElementById("modal-confirmacao");

  if (modal) {
    modal.classList.remove("show");
  }
});

document.addEventListener("click", (e) => {

  const titulo =
    e.target.closest(".categoria-titulo");

  if (!titulo) return;

  const categoria =
    titulo.dataset.categoria;

  const grid =
    document.querySelector(
      `.servicos-grid[data-categoria="${categoria}"]`
    );

  if (!grid) return;

  const aberto =
    grid.style.display !== "none";

  grid.style.display =
    aberto ? "none" : "block";

  titulo.querySelector("span").innerHTML =
    titulo.querySelector("span").innerHTML
      .replace(
        aberto ? "▼" : "▶",
        aberto ? "▶" : "▼"
      );

});

const btnNovoAgendamento =
  document.getElementById(
    "btn-novo-agendamento"
  );

const btnNovoEncaixe =
  document.getElementById(
    "btn-novo-encaixe"
  );

const modalNovoAtendimento =
  document.getElementById(
    "modal-novo-atendimento"
  );

const alertaPendenciasFixo =
  document.getElementById(
    "alerta-pendencias-fixo"
  );

const btnFecharNovoAtendimento =
  document.getElementById(
    "btn-fechar-novo-atendimento"
  );

document.addEventListener(
  "click",
  (e) => {

    const botao =
      e.target.closest(
        "#btn-novo-agendamento"
      );

    if (!botao) return;

    modalNovoAtendimento?.classList.remove(
      "hidden"
    );

  }
);

const campoHoraNormal =
  document.getElementById(
    "novoHora"
  );

const campoHoraEncaixe =
  document.getElementById(
    "novoHoraEncaixe"
  );

btnNovoAgendamento?.addEventListener(
  "click",
  () => {

    atualizarFluxoNovoAtendimento();

    document.getElementById(
      "titulo-novo-atendimento"
    ).textContent =
      "📅 Novo Agendamento";

    campoHoraNormal.style.display =
      "block";

    campoHoraEncaixe.style.display =
      "none";

    campoHoraNormal.required = true;

    campoHoraEncaixe.required = false;

    document.getElementById("novoHora").innerHTML = `
      <option value="">
        Selecione um horário
      </option>
    `;

    modalNovoAtendimento?.classList.remove(
      "hidden"
    );

    document.getElementById(
      "toast"
    )?.classList.remove(
      "show"
    );

    modalNovoAtendimento.style.display =
      "flex";

    alertaPendenciasFixo?.classList.add(
      "alerta-bloqueado"
    );

    setTimeout(() => {

      document.getElementById(
        "novoNome"
      )?.focus();

    }, 100);
  }
);

btnNovoEncaixe?.addEventListener(
  "click",
  () => {

    setTimeout(() => {

      document.getElementById(
        "novoNome"
      )?.focus();

    }, 100);

    document.getElementById(
      "titulo-novo-atendimento"
    ).textContent =
      "⚡ Novo Encaixe";

    campoHoraNormal.style.display =
      "none";

    campoHoraEncaixe.style.display =
      "block";

    campoHoraNormal.required = false;

    campoHoraEncaixe.required = true;

    modalNovoAtendimento?.classList.remove(
      "hidden"
    );

    document.getElementById(
      "toast"
    )?.classList.remove(
      "show"
    );

    modalNovoAtendimento.style.display =
      "flex";
  }
);

btnFecharNovoAtendimento?.addEventListener(
  "click",
  () => {
    modalNovoAtendimento?.classList.add("hidden");
    modalNovoAtendimento.style.display = "none";
  }
);

const formNovoAtendimento =
  document.getElementById(
    "form-novo-atendimento"
  );

function atualizarFluxoNovoAtendimento() {

  const nome =
    document.getElementById("novoNome");

  const sobrenome =
    document.getElementById("novoSobrenome");

  const telefone =
    document.getElementById("novoTelefone");

  const profissional =
    document.getElementById("novoProfissional");

  const servico =
    document.getElementById("novoServico");

  const data =
    document.getElementById("novoData");

  const hora =
    document.getElementById("novoHora");

  sobrenome.disabled =
    !nome.value.trim();

  telefone.disabled =
    !sobrenome.value.trim();

  profissional.disabled =
    !telefone.value.trim();

  servico.disabled =
    !profissional.value;

  data.disabled =
    !servico.value;

  hora.disabled =
    !data.value;
}

formNovoAtendimento?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    const nome =
      document.getElementById("novoNome")
        ?.value.trim();

    const sobrenome =
      document.getElementById("novoSobrenome")
        ?.value.trim();

    const telefone =
      document.getElementById("novoTelefone")
        ?.value.trim();

    const profissionalSelecionado =
      document.getElementById("novoProfissional")
        ?.value;

    const servicoSelecionado =
      document.getElementById("novoServico")
        ?.value;

    const data =
      document.getElementById("novoData")
        ?.value;

    if (!nome) {
      mostrarToast(
        "Informe o nome do cliente",
        "error"
      );
      document.getElementById("novoNome")?.focus();
      return;
    }

    if (!sobrenome) {
      mostrarToast(
        "Informe o sobrenome do cliente",
        "error"
      );
      document.getElementById("novoSobrenome")?.focus();
      return;
    }

    if (!telefone) {
      mostrarToast(
        "Informe o telefone do cliente",
        "error"
      );
      document.getElementById("novoTelefone")?.focus();
      return;
    }

    if (!profissionalSelecionado) {
      mostrarToast(
        "Selecione um profissional primeiro",
        "error"
      );
      document.getElementById("novoProfissional")?.focus();
      return;
    }

    if (!servicoSelecionado) {
      mostrarToast(
        "Selecione um serviço primeiro",
        "error"
      );
      document.getElementById("novoServico")?.focus();
      return;
    }

    if (!data) {
      mostrarToast(
        "Selecione uma data primeiro",
        "error"
      );
      document.getElementById("novoData")?.focus();
      return;
    }

    const profissionalId =
      document.getElementById("novoProfissional").value;

    const servicoId =
      document.getElementById("novoServico").value;

    const tituloModal =
      document.getElementById(
        "titulo-novo-atendimento"
      ).textContent;

    const horaFinal =

      tituloModal.includes("Encaixe")

        ? document.getElementById(
          "novoHoraEncaixe"
        ).value.trim()

        : document.getElementById(
          "novoHora"
        ).value;

    if (!profissionalId) {

      mostrarToast(
        "Selecione um profissional",
        "error"
      );

      return;
    }

    if (!servicoId) {

      mostrarToast(
        "Selecione um serviço",
        "error"
      );

      return;
    }

    if (!data) {

      mostrarToast(
        "Selecione uma data",
        "error"
      );

      return;
    }

    if (!horaFinal) {

      mostrarToast(
        "Selecione um horário",
        "error"
      );

      return;
    }

    const profissional =

      profissionaisCache.find(
        p => p.id === profissionalId
      );

    const servico =

      servicosCache.find(
        s => s.id === servicoId
      );

    const dataBR =

      data.split("-").reverse().join("/");

    console.log(
      "DATA:",
      data,
      "DATA BR:",
      dataBR
    );

    const tipoAtendimento =

      tituloModal.includes("Encaixe")

        ? "encaixe"

        : "agendamento";

    await addDoc(

      collection(
        db,
        profissional.colecao
      ),

      {

        clienteNome:
          `${nome} ${sobrenome}`,

        telefone,

        profissionalId:
          profissional.id,

        profissionalNome:
          profissional.nome,

        servicoId:
          servico.id,

        servicoNome:
          servico.nome,

        servicoValor:
          servico.valor,

        servicoTempoMin:
          servico.tempoMin,

        data:
          data,

        dataBR:
          dataBR,

        hora: horaFinal,

        status:
          "confirmado",

        tipo:
          tipoAtendimento,

        origem:
          "admin",

        criadoEm:
          new Date().toISOString()

      }

    );

    mostrarToast(
      "Atendimento criado com sucesso"
    );

    formNovoAtendimento.reset();

    atualizarFluxoNovoAtendimento();

    modalNovoAtendimento.classList.add(
      "hidden"
    );

    modalNovoAtendimento.style.display =
      "none";

    console.log(
      "ATUALIZANDO DASHBOARD"
    );

    await carregarDashboard();

    console.log(
      "ATUALIZANDO AGENDA GERAL"
    );

    await carregarAgendaGeral();
  }
);

// ======================
// FORMULÁRIOS RECOLHÍVEIS
// ======================

const toggleCadastroServico =
  document.getElementById(
    "toggleCadastroServico"
  );

const containerCadastroServico =
  document.getElementById(
    "containerCadastroServico"
  );

if (
  toggleCadastroServico &&
  containerCadastroServico
) {

  containerCadastroServico.style.display =
    "none";

  toggleCadastroServico.addEventListener(
    "click",
    () => {

      const aberto =
        containerCadastroServico.style.display ===
        "block";

      containerCadastroServico.style.display =
        aberto ? "none" : "block";

      toggleCadastroServico.textContent =
        aberto
          ? "▶ Cadastrar serviço"
          : "▼ Cadastrar serviço";

    }
  );

}

const toggleCadastroProfissional =
  document.getElementById(
    "toggleCadastroProfissional"
  );

const containerCadastroProfissional =
  document.getElementById(
    "containerCadastroProfissional"
  );

if (
  toggleCadastroProfissional &&
  containerCadastroProfissional
) {

  containerCadastroProfissional.style.display =
    "none";

  toggleCadastroProfissional.addEventListener(
    "click",
    () => {

      const aberto =
        containerCadastroProfissional.style.display ===
        "block";

      containerCadastroProfissional.style.display =
        aberto ? "none" : "block";

      toggleCadastroProfissional.textContent =
        aberto
          ? "▶ Cadastrar profissional"
          : "▼ Cadastrar profissional";

    }
  );

}

document.addEventListener(
  "input",
  (e) => {

    if (
      e.target.closest(
        "#form-novo-atendimento"
      )
    ) {

      atualizarFluxoNovoAtendimento();

    }

  }
);

document.addEventListener(
  "change",
  async (e) => {

    atualizarFluxoNovoAtendimento();

    if (e.target.id === "novoProfissional") {

      const nome = document.getElementById("novoNome")?.value.trim();
      const sobrenome = document.getElementById("novoSobrenome")?.value.trim();
      const telefone = document.getElementById("novoTelefone")?.value.trim();

      if (!nome) {
        mostrarToast("Informe o nome do cliente", "error");
        e.target.value = "";
        return;
      }

      if (!sobrenome) {
        mostrarToast("Informe o sobrenome do cliente", "error");
        e.target.value = "";
        return;
      }

      if (!telefone) {
        mostrarToast("Informe o telefone do cliente", "error");
        e.target.value = "";
        return;
      }

      preencherSelectServicosNovoAtendimento(e.target.value);

      document.getElementById("novoHora").innerHTML = `
        <option value="">
          Selecione um horário
        </option>
      `;

      atualizarFluxoNovoAtendimento();

      return;
    }

    if (e.target.id === "novoServico") {

      const profissional =
        document.getElementById("novoProfissional")?.value;

      if (!profissional) {
        mostrarToast("Selecione um profissional primeiro", "error");
        e.target.value = "";
        return;
      }
    }

    if (
      e.target.id === "novoServico" ||
      e.target.id === "novoData"
    ) {
      await carregarHorariosNovoAgendamento();
      atualizarFluxoNovoAtendimento();
    }

  }
);

/* =========================================
   INSTALAÇÃO PWA ADMIN
========================================= */

let deferredPromptAdmin;

const bannerPWA =
  document.getElementById(
    "pwaInstallBanner"
  );

const btnInstalarPWA =
  document.getElementById(
    "btnInstalarPWA"
  );

const btnFecharPWA =
  document.getElementById(
    "btnFecharPWA"
  );

window.addEventListener(
  "beforeinstallprompt",
  (e) => {

    e.preventDefault();

    deferredPromptAdmin = e;

    bannerPWA?.classList.remove(
      "hidden"
    );

  }
);

btnInstalarPWA?.addEventListener(
  "click",
  async () => {

    if (!deferredPromptAdmin)
      return;

    deferredPromptAdmin.prompt();

    await deferredPromptAdmin.userChoice;

    deferredPromptAdmin = null;

    bannerPWA?.classList.add(
      "hidden"
    );

  }
);

btnFecharPWA?.addEventListener(
  "click",
  () => {

    bannerPWA?.classList.add(
      "hidden"
    );

  }
);

window.addEventListener(
  "appinstalled",
  () => {

    bannerPWA?.classList.add(
      "hidden"
    );

    console.log(
      "PWA Admin instalado"
    );

  }
);