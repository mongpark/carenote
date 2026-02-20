export function formatWon(payWon) {
  return `${(payWon ?? 0).toLocaleString()}원`;
}

export function formatManwon(payWon) {
  const manwon = ((payWon ?? 0) / 10000).toFixed(1);
  return `(${manwon}만원)`;
}
