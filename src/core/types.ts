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
  /** limiar do muro de indeferimento */
  wall: number;
  casoId: string;
  /** texto pronto pro card viral */
  shareText: string;
}
