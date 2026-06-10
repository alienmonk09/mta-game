/** Schema de um "caso" (benefício) — conteúdo data-driven. */

export type OpKind = 'mul' | 'add' | 'div' | 'sub';

export interface GateOp {
  op: OpKind;
  value: number;
  /** rótulo da prova/armadilha (ex: "Laudo médico", "Falta CNIS") */
  label: string;
}

export interface GatePair {
  /** distância da largada (px) onde o portão cruza a multidão */
  dist: number;
  left: GateOp;
  right: GateOp;
}

export interface CasoData {
  id: string;
  name: string;
  /** tamanho inicial do exército */
  start: number;
  /** velocidade de scroll (px/s) */
  speed: number;
  gates: GatePair[];
  /** limiar do muro de indeferimento */
  wall: number;
}
