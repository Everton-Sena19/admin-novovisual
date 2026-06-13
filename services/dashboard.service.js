import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function normalizarData(data) {

  if (!data) return "";

  // Já está correta
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }

  // 17/06/2026
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {

    const [dia, mes, ano] =
      data.split("/");

    return `${ano}-${mes}-${dia}`;
  }

  // 17062026
  if (/^\d{8}$/.test(data)) {

    const dia =
      data.slice(0, 2);

    const mes =
      data.slice(2, 4);

    const ano =
      data.slice(4, 8);

    return `${ano}-${mes}-${dia}`;
  }

  return data;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaMesISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function buscarAgendamentosPorProfissionais(profissionais) {

  const agendamentos = [];

  for (const prof of profissionais) {

    if (!prof?.colecao) continue;

    const q = query(
      collection(db, prof.colecao)
    );

    const snap = await getDocs(q);

    snap.forEach(documento => {

      const dados =
        documento.data();

      agendamentos.push({

        id:
          documento.id,

        colecao:
          prof.colecao,

        profissional:
          prof.nome,

        ...dados,

        data:
          normalizarData(
            dados.data ||
            dados.dataBR
          )

      });

    });

  }

  return agendamentos.sort((a, b) => {

    return `${b.data || ""} ${b.hora || ""}`
      .localeCompare(
        `${a.data || ""} ${a.hora || ""}`
      );

  });

}

export function montarResumoDashboard(
  agendamentos,
  profissionais,
  perfilLogado = null
) {

  const hoje = hojeISO();

  const agendamentosHoje =
    agendamentos.filter(
      a => a.data === hoje
    );

  // =========================
  // FILTRO FINANCEIRO
  // =========================

  let agendamentosFinanceiros =
    agendamentos;

  let agendamentosHojeFinanceiros =
    agendamentosHoje;

  if (
    perfilLogado?.tipoAcesso ===
    "profissional_admin"
  ) {

    agendamentosFinanceiros =
      agendamentos.filter(
        item =>
          item.profissionalNome ===
          perfilLogado.nome
      );

    agendamentosHojeFinanceiros =
      agendamentosHoje.filter(
        item =>
          item.profissionalNome ===
          perfilLogado.nome
      );

  }

  // =========================
  // FATURAMENTO
  // =========================

  const faturamentoHoje =
    agendamentosHojeFinanceiros.reduce(
      (total, item) => {

        return total + Number(
          item.servicoValor ||
          item.valor ||
          0
        );

      }, 0
    );

  const faturamentoMes =
    agendamentosFinanceiros.reduce(
      (total, item) => {

        return total + Number(
          item.servicoValor ||
          item.valor ||
          0
        );

      }, 0
    );

  // =========================
  // POR PROFISSIONAL
  // =========================

  const porProfissional = {};

  agendamentos.forEach(item => {

    const nome =
      item.profissional ||
      item.profissionalNome ||
      "Não informado";

    if (!porProfissional[nome]) {

      porProfissional[nome] = {
        profissional: nome,
        quantidade: 0,
        faturamento: 0
      };

    }

    porProfissional[nome].quantidade += 1;

    porProfissional[nome].faturamento +=
      Number(
        item.servicoValor ||
        item.valor ||
        0
      );

  });

  return {

    totalHoje: agendamentosHoje.length,

    totalMes: agendamentos.length,

    faturamentoHoje,

    faturamentoMes,

    profissionaisAtivos:
      profissionais.filter(
        p => p && p.ativo !== false
      ).length,

    porProfissional:
      Object.values(porProfissional)

  };

}