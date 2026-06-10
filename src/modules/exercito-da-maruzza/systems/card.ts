import type { RunResult, CardContent } from '../../../core/types';
import { getServices } from '../../../core/services';

/**
 * Copy do resultado/card. Fonte única, enquadrada como JOGO (nunca veredito
 * jurídico — cuidado OAB). Os textos vêm do tema ativo (dado, trocável por skin).
 */
export function statusLabel(won: boolean): string {
  const { themes } = getServices();
  return won ? themes.text('result.win', 'MURO DERRUBADO! 🎉') : themes.text('result.lose', 'O MURO SEGUROU 😤');
}

export function summaryLine(r: RunResult): string {
  const n = (v: number): string => v.toLocaleString('pt-BR');
  return `de ${n(r.start)} a ${n(r.score)} provas  ·  muro ${n(r.wall)}`;
}

/** Monta o conteúdo do card viral a partir do resultado + copy do tema. */
export function buildCardContent(r: RunResult): CardContent {
  const { themes } = getServices();
  return {
    won: r.won,
    brand: themes.text('card.brand', 'EXÉRCITO DA MARUZZA'),
    subtitle: themes.text('card.subtitle', '👵 segurados ⚖️ vs o muro do INSS'),
    status: statusLabel(r.won),
    metric: r.score.toLocaleString('pt-BR'),
    metricLabel: themes.text('card.metric', 'PROVAS'),
    detail: summaryLine(r),
    viral: themes.text('card.viral', 'Bate meu recorde 👵⚖️'),
    footnote: themes.text('card.footnote', 'junte provas e derrube o muro do INSS'),
    crowdCount: Math.min(r.score, 40),
    fileName: themes.text('card.fileName', 'exercito-da-maruzza.png'),
    shareTitle: themes.text('title', 'Exército da Maruzza'),
    shareText: r.shareText,
  };
}
