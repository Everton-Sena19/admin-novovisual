import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaMesISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function buscarAgendamentosPorProfissionais(profissionais) {
  const hoje = hojeISO();
  const inicioMes = primeiroDiaMesISO();
  const agendamentos = [];

  for (const prof of profissionais) {
    if (!prof?.colecao) continue;

    const q = query(
      collection(db, prof.colecao),
      where("data", ">=", inicioMes)
    );

    const snap = await getDocs(q);

    snap.forEach(documento => {
      agendamentos.push({
        id: documento.id,
        colecao: prof?.colecao,
        profissional: prof.nome,
        ...documento.data()
      });
    });
  }

  return agendamentos.sort((a, b) => {
    return `${a.data || ""} ${a.hora || ""}`.localeCompare(`${b.data || ""} ${b.hora || ""}`);
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