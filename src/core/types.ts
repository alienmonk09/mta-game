/** Tipos compartilhados do núcleo. */

export interface Theme {
  id: string;
  palette: Record<string, string>;
  copy: Record<string, string>;
  assets?: Record<string, string>;
}

export interface RunParams {
  /** id do caso/benefício a jogar (ex: "bpc") */
  casoId?: string;
}

export interface RunResult {
  won: boolean;
  /** tamanho final do exército de provas */
  score: number;
  /** tamanho inicial do exército (pra narrar "de 1 vovó a N provas") */
  start: number;
  /** limiar do muro de indeferimento */
  wall: number;
  casoId: string;
  /** nome do caso/benefício (exibição sem re-lookup) */
  casoName: string;
  /** texto pronto pro card viral */
  shareText: string;
}

/**
 * Conteúdo do card viral, montado pelo MÓDULO e renderizado pelo núcleo.
 * Mantém o `ShareCard` agnóstico (não conhece "Maruzza"/"INSS"/"provas").
 */
export interface CardContent {
  /** vitória? (define a cor do destaque) */
  won: boolean;
  brand: string;
  subtitle: string;
  /** rótulo de status (enquadrado como JOGO, nunca veredito jurídico) */
  status: string;
  /** métrica principal já formatada (ex: "187") */
  metric: string;
  metricLabel: string;
  /** linha de detalhe (ex: "de 1 a 187 · muro 60") */
  detail: string;
  /** chamada viral (ex: "Bate meu recorde") */
  viral: string;
  footnote: string;
  /** nº de pontos na multidão decorativa */
  crowdCount: number;
  fileName: string;
  shareTitle: string;
  shareText: string;
}
