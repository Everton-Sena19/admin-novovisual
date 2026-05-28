export function gruposPodemCoexistir(
  grupoAtual,
  grupoExistente
) {

  if (!grupoAtual || !grupoExistente) {
    return false;
  }

  // Mesmo grupo = bloqueia
  if (grupoAtual === grupoExistente) {
    return false;
  }

  // Mão + pé = permitido
  const manicure =
    ["manicure_mao", "manicure_pe"];

  if (
    manicure.includes(grupoAtual) &&
    manicure.includes(grupoExistente)
  ) {
    return true;
  }

  // cabelo + manicure = permitido
  if (
    grupoAtual === "cabelo" &&
    manicure.includes(grupoExistente)
  ) {
    return true;
  }

  if (
    grupoExistente === "cabelo" &&
    manicure.includes(grupoAtual)
  ) {
    return true;
  }

  return false;
}