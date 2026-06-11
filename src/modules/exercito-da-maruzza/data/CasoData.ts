/** Schema de um "caso" (benefício) — conteúdo data-driven. */

export type OpKind = 'mul' | 'add' | 'div' | 'sub';

export interface GateOp {
  op: OpKind;
  value: number;
  /** rótulo da prova/armadilha (ex: "Laudo médico", "Falta CNIS") */
  label: string;
  /** se presente e ≠ 0, este lado também altera o TIER DA ARMA (±) ao ser cruzado */
  weapon?: number;
}

export interface GatePair {
  /** distância da largada (px) onde o portão cruza a multidão */
  dist: number;
  left: GateOp;
  right: GateOp;
}

/** Obstáculo de burocracia (nunca pessoa) que desce a pista e tem HP. */
export interface CasoEnemy {
  /** tipo visual: carimbo de exigência, pilha de processos... */
  kind: 'carimbo' | 'pilha';
  /** distância da largada onde aparece */
  dist: number;
  /** lane ∈ [-1, 1] */
  lane: number;
  /** vida (dano necessário pra dissolver) */
  hp: number;
  /** rótulo (ex: "Exigência", "Fila", "Indeferido") */
  label: string;
}

export interface CasoData {
  id: string;
  name: string;
  /** frase curta de sabor (subtítulo no menu) */
  tagline?: string;
  /** ordem de exibição no menu (menor = primeiro/mais fácil) */
  order?: number;
  /** tamanho inicial do exército */
  start: number;
  /** velocidade de scroll (px/s) */
  speed: number;
  gates: GatePair[];
  /** limiar do muro de indeferimento (modo legado: compara contagem) */
  wall: number;
  /** obstáculos da burocracia na pista (opcional) */
  enemies?: CasoEnemy[];
  /** HP do boss; se presente, o muro vira dreno de HP (combate). Senão usa `wall`. */
  bossHp?: number;
}
