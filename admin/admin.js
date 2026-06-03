import {
  auth,
  db,
  collection,
  getDocs,
  updateDoc,
  doc
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
  mensagem,
  onConfirmar: callback
}) {

  if (!modalConfirmacao) return;

  modalMensagem.textContent =
    mensagem;

  onConfirmar = callback;

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

async function carregarServicos() {

  listaServicos.innerHTML =
    "Carregando serviços...";

  const servicos =
    await buscarServicos();

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

        <div class="categoria-servico">

         <h3 class="categoria-titulo">

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

</h3>

          <div class="servicos-grid">

            ${itens.map(s => `

              <div class="servico-card">

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

  // =========================
  // AGRUPAR POR DATA
  // =========================

  const grupos = {};

  lista.forEach(item => {

    if (!item.data) {

      console.error(
        "ITEM SEM DATA:",
        item
      );

    }
    const data =
      item.data || "Sem data";

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
      .map(([data, itens]) => {

        return `

          <div class="agenda-geral-grupo">

            <div class="agenda-geral-data">

              ${formatarTituloDataAgenda(data)}

            </div>

            <div class="agenda-geral-grid">

              ${itens.map(item => `

                <div class="agenda-geral-card
                  ${item.status || "confirmado"}
                  ${item.proximo ? "proximo" : ""}
                  ${item.atrasado ? "atrasado" : ""}
                ">

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

                    <span>

                      ${item.servicoNome || item.servico || "Serviço"}

                    </span>

                    <small>

                     👤 ${item.profissionalNome || item.profissional || "Profissional"}

                    </small>

                    <small>

                      📅 ${formatarDataBrasil(item.data)}

                    </small>

                    <small>

                      💰 R$ ${Number(item.servicoValor || item.valor || 0).toFixed(2)}

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

  let profissionais = [];

  if (perfilLogado?.tipoAcesso === "admin") {

    profissionais =
      await buscarProfissionais();

  } else {

    profissionais = [perfilLogado];

  }

  const agendamentos =
    await buscarAgendamentosPorProfissionais(
      profissionais
    );

  agendaGeralCache =
    [...agendamentos];

  const agora =
    new Date();

  const horaAtual =
    agora.getHours() * 60 +
    agora.getMinutes();

  const hoje =
    agora.toISOString().slice(0, 10);

  let proximoDefinido = false;

  agendaGeralCache.forEach(item => {

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

      item.data === hoje &&

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

      item.data === hoje &&

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
      `${a.data} ${a.hora}`;

    const dataB =
      `${b.data} ${b.hora}`;

    return (
      new Date(dataB) -
      new Date(dataA)
    );

  });

  renderizarAgendaGeral(
    agendaGeralCache
  );

}

async function carregarDashboard() {

  dashboardResumo.innerHTML = "Carregando...";
  agendaOperacionalLista.innerHTML = "Carregando agenda...";

  let profissionais = [];

  if (perfilLogado?.tipoAcesso === "admin") {

    profissionais = await buscarProfissionais();

  } else {

    profissionais = [perfilLogado];

  }

  const agendamentos =
    await buscarAgendamentosPorProfissionais(profissionais);

  const agendaHoje = agendamentos.filter(
    item => item.data === new Date()
      .toISOString()
      .slice(0, 10));

  const agendaConcluidos =
    agendaHoje.filter(
      item =>
        item.status ===
        "finalizado"
    );

  const agora = new Date();

  const horaAtual =
    agora.getHours() * 60 +
    agora.getMinutes();

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

    const [h, m] =
      (item.hora || "00:00")
        .split(":")
        .map(Number);

    const horarioItem =
      h * 60 + m;

    if (

      horarioItem < horaAtual &&

      item.status !== "atendimento" &&

      item.status !== "finalizado" &&

      item.status !== "cancelado"

    ) {

      item.atrasado = true;
    }

    if (
      !proximoDefinido &&
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

  if (!agendamentos.length) {

    montarGraficoFaturamento([]);

    return;
  }

  montarGraficoFaturamento(agendamentos);

  agendaOperacionalLista.innerHTML = `

  <div class="agenda-operacional-grid">

${agendaOrdenada
      .filter(item =>
        item.status !==
        "finalizado"
      )
      .map(item => `

  <div class="agenda-operacional-card
  ${item.status || "confirmado"}
  ${item.proximo ? "proximo" : ""}
  ${item.atrasado ? "atrasado" : ""}">

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

    <div class="agenda-status ${item.status || "confirmado"}">

      ${formatarStatusAgenda(
        item.status
      )}

    </div>

    <div class="agenda-acoes">

      <button
        class="btn-status atendimento
        ${item.status === "atendimento"
          ? "ativo"
          : ""}"
        data-id="${item.id}"
        data-colecao="${item.colecao}"
        data-status="atendimento"
      >
        Atendimento
      </button>

      <button
        class="btn-status finalizado
        ${item.status === "finalizado"
          ? "ativo"
          : ""}"
        data-id="${item.id}"
        data-colecao="${item.colecao}"
        data-status="finalizado"
      >
        Finalizar
      </button>

      <button
        class="btn-status cancelado
        ${item.status === "cancelado"
          ? "ativo"
          : ""}"
        data-id="${item.id}"
        data-colecao="${item.colecao}"
        data-status="cancelado"
      >
        Cancelar
      </button>

    </div>

  </div>

`).join("")}

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
      class="btn-status atendimento"
      data-id="${item.id}"
      data-colecao="${item.colecao}"
      data-status="atendimento"
    >

      Reabrir

    </button>

  </div>

`).join("")}

</div>
`;

  agendaOperacionalLista
    ?.querySelectorAll(".btn-status")
    .forEach(botao => {

      botao.addEventListener(
        "click",
        async () => {

          const item = {

            id:
              botao.dataset.id,

            colecao:
              botao.dataset.colecao
          };

          const novoStatus =
            botao.dataset.status;

          if (
            novoStatus ===
            "finalizado"
          ) {

            abrirModalConfirmacao({

              mensagem:
                "Deseja realmente finalizar este atendimento?",

              onConfirmar: async () => {

                await atualizarStatusAgendamento(

                  item,

                  novoStatus
                );

              }

            });

            return;
          }

          await atualizarStatusAgendamento(

            item,

            novoStatus
          );

        }
      );

    });
}

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

btnLogout?.addEventListener("click", async () => {

  await signOut(auth);

  location.reload();

});

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

  const d =
    new Date(data + "T00:00:00");

  return d.toLocaleDateString(
    "pt-BR"
  );

}

function formatarTituloDataAgenda(data) {

  if (!data) return "Sem data";

  const hoje =
    new Date();

  const amanha =
    new Date();

  amanha.setDate(
    amanha.getDate() + 1
  );

  const dataHoje =
    hoje.toISOString().slice(0, 10);

  const dataAmanha =
    amanha.toISOString().slice(0, 10);

  if (data === dataHoje) {

    return "HOJE";

  }

  if (data === dataAmanha) {

    return "AMANHÃ";

  }

  const d =
    new Date(data + "T00:00:00");

  return d.toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "2-digit"
    }
  );

}

function aplicarFiltrosAgendaGeral() {

  let lista =
    [...agendaGeralCache];

  const periodo =
    filtroPeriodoAgenda?.value || "hoje";

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

      return diffDias <= 7;

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

  if (statusSelecionado) {

    lista = lista.filter(item =>

      item.status === statusSelecionado

    );

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

    btnToggleAgendaGeral.textContent =
      estaFechada
        ? "Abrir agenda"
        : "Fechar agenda";

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

        aplicarFiltrosAgendaGeral();

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
      "Status atualizado",
      "sucesso"
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
        "Horário já ocupado. Não é possível reativar.",
        "erro"
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

    const existeConflito =
      snapshot.docs.some(docItem => {

        const item =
          docItem.data();

        return (

          docItem.id !== agendamento.id &&

          item.data === agendamento.data &&

          item.hora === agendamento.hora &&

          item.status !== "cancelado"

        );

      });

    return existeConflito;

  } catch (error) {

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

      `R$ ${faturamento.toFixed(2)}`;

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

      `R$ ${ticketMedio.toFixed(2)}`;

  }

  if (kpiTaxaCancelamento) {

    kpiTaxaCancelamento.textContent =

      `${taxaCancelamento.toFixed(0)}%`;

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