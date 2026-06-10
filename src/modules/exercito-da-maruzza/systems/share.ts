import type { RunResult } from '../../../core/types';

/**
 * Copy viral do card/compartilhamento. Pura e testável (sem Phaser/DOM) — por
 * isso o emoji-assinatura entra como parâmetro (a skin o fornece via token
 * `share.emoji`), pra a legenda casar com o card (boi 🐂 vs flat 👵).
 * Tom OAB-safe: fala do JOGO, nunca promete resultado jurídico.
 */
export function buildShareText(r: RunResult, emoji = '👵⚖️'): string {
  const provas = r.score.toLocaleString('pt-BR');
  if (r.won) {
    return (
      `Levei ${provas} provas e DERRUBEI o muro do INSS! ${emoji}\n` +
      `Caso: ${r.casoName}.\n` +
      `Bate meu recorde no Exército da Maruzza 💪`
    );
  }
  return (
    `Cheguei com ${provas} provas, mas o muro do INSS (${r.wall}) segurou 😤\n` +
    `Caso: ${r.casoName}.\n` +
    `Bora juntar mais prova e tentar de novo — Exército da Maruzza ${emoji}`
  );
}
