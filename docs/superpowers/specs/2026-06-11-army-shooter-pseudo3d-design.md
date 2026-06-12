# Spec — Exército da Maruzza vira *Army Shooter 2.5D* (MVP)

**Data:** 2026-06-11
**Status:** aprovado no brainstorm; pronto para `writing-plans`.
**Origem:** o jogo está funcional mas raso — crowd-runner mínimo (arrasta multidão → portões
multiplicam → muro confere número), visual cru. Meta: trazer a experiência do **Battle Brigade**
(army run shooter) — tiro, inimigos, obstáculos, boss de verdade, juice — **mantendo** a arquitetura
modular, o sistema de skins e a acessibilidade pro idoso.

> Fonte da verdade do **design desta evolução**. O roadmap geral fica em [`../../roadmap.md`](../../roadmap.md);
> progresso em [`../../STATUS.md`](../../STATUS.md). Este spec só cobre o **MVP do redesign** + o que vai pro roadmap.

---

## 1. Decisões travadas (saídas do brainstorm)

1. **Controle = 1 dedo + auto-combate.** A única ação do jogador continua **arrastar**. Mantém o público
   idoso e o modo calmo. A profundidade vem da pista (escolha de portão, build, pressão de inimigos), não de botões.
2. **Direção de arte = B (Procedural + Juice).** Continua **zero-asset** (texturas geradas em runtime,
   recoloridas por tokens do tema). O salto de qualidade vem de partículas, glow, muzzle flash, shake,
   estilhaço — não de ilustração. **Arte ilustrada (C) é upgrade aditivo por-skin no futuro**, viabilizado
   pela *fronteira do resolvedor de arte* (§5.4).
3. **Câmera = pseudo-3D (2.5D).** Pista em perspectiva (horizonte + ponto de fuga); entidades nascem
   pequenas no fundo e crescem vindo pra câmera. Phaser é 2D — é projeção em perspectiva de cena 2D,
   isolada num sistema puro (`projection.ts`).
4. **Maruzza é a heroína atiradora.** Ela dispara; o exército de segurados fica atrás como **escala visual**
   e marca (a multidão ainda cresce). `PROVAS` deixa de ser "quantos atiram" e vira **potência da arma da Maruzza**.
5. **Portões viram escolha de build (dois eixos):** `PROVAS` (quantidade) × `ARMA/QUALIDADE` (tier da prova).
6. **Escopo MVP = run única + recorde.** Campanha por níveis e meta-progressão vão pro **roadmap** (§7).
7. **Integração = camada aditiva** sobre os sistemas puros atuais (não reescrever a run). KISS; mantém os 65 testes verdes.
8. **OAB-safe é constraint dura** (§6): "entregar provas que dissolvem burocracia", nunca atacar pessoas; vitória = "MURO DERRUBADO", nunca veredito jurídico.

---

## 2. Loop de 1 sessão (MVP) — 40–60s por caso

1. Maruzza desce a pista em **perspectiva** com seu séquito de segurados; **atira provas** pra frente sozinha.
2. **Inimigos/obstáculos da burocracia** surgem no horizonte e **crescem** vindo na direção dela
   (carimbo "exigência", pilha de processos). Têm HP; as provas os dissolvem. Inimigo que chega **vivo**
   no plano da heroína **subtrai provas** (penalidade ∝ HP restante — não é game-over).
3. **Portões de build**: a cada portão, escolhe (arrastando) entre **+PROVAS** (potência) ou **subir a ARMA**
   (qualidade) — ou desvia da **armadilha do INSS** clássica. A escolha molda seu DPS.
4. **Boss final = Muro de Indeferimento com HP.** A heroína despeja fogo por uma janela curta; o muro
   drena conforme `DPS = f(provas, tierDaArma)`. Quebrou na janela → **MURO DERRUBADO** 🎉. Não quebrou → segura.
5. Tela de resultado + **card viral** (já existe) com o número de provas — placar comparável e compartilhável.

**Mensagem de marca, agora ativa e visível:** *quantidade **e** qualidade de prova* derrubam o muro.

---

## 3. Modelo de jogo (MVP)

### 3.1 Câmera pseudo-3D (`projection.ts`, puro)
Os sistemas puros continuam **1D** (distância na pista). Entra um único sistema puro que projeta
`(profundidade, lane) → (x, y, escala)` na tela. Todo o resto do código não sabe que existe perspectiva.

- **profundidade** `d` de uma entidade = `dist - track.traveled` (≥0 = à frente; ≤0 = já passou o plano da heroína).
- `t = clamp(d / D_HORIZON, 0, 1)` (0 = perto/câmera, 1 = horizonte).
- `escala = lerp(NEAR=1.0, FAR≈0.28, t)` (ou perspectiva-correta `f/(f+d)`).
- `y = lerp(yHeroína≈0.82·H, yHorizonte≈0.34·H, t)`.
- `x = centerX + laneX · lerp(meiaLarguraPerto, meiaLarguraLonge, t)` com `meiaLarguraLonge < meiaLarguraPerto` (convergência ao ponto de fuga). `laneX ∈ [-1, 1]`.

Acessibilidade: perspectiva **suave** (não corrida); alvos crescem grandes e alto-contraste ao se aproximar.

### 3.2 Maruzza heroína + `PROVAS` = potência
- Maruzza é o sprite-herói no plano de perto; o `Crowd` vira **séquito atrás dela** (escala = nº de provas,
  saturando visualmente em N figuras pra não explodir performance).
- `PROVAS` (o antigo `count`) alimenta a **arma**: mais provas → **cadência maior e/ou dano maior**.

### 3.3 Combate (`combat.ts`, puro) — dps-tick determinístico; projéteis = juice
Princípio do projeto (lógica separada de apresentação): **o dano é calculado por tick determinístico**
(`dps · dt` no alvo da frente), **testável e puro**. Os **projéteis visuais são só juice** (pool de partículas),
não carregam a colisão — elimina colisão frágil e mantém `combat.ts` sem Phaser.

- Alvo = **inimigo mais à frente em alcance**; sem inimigo, o alvo é o **boss** (na janela final). **Auto-mira**
  (acessível — steering é pra portões, não pra mirar). *Mira por lane = roadmap (modo desafio).*
- `fireInterval(provas, tier)`, `shotDamage(provas, tier)`, `dps(provas, tier)` — puros.
- `applyDamage(hp, dmg) → hp'`; `enemyPenalty(enemyHpRestante) → provasPerdidas`.

### 3.4 Inimigos / obstáculos (dado no caso)
Burocracia (nunca pessoas feridas): carimbo "exigência", pilha de processos, "perícia remarcada".
Cada um: `{ kind, dist, lane, hp, penalty, label, art }`. Surge no horizonte, cresce, é dissolvido a tiro;
se chega vivo no plano da heroína → `enemyPenalty`. Visual reage (estilhaça em papel/carimbo).

### 3.5 Portões de build — dois eixos (melhoria pedida)
Eixos: **QUANTIDADE (`provas`)** e **QUALIDADE (`weapon` tier)**. Arquétipos:
- **Tradeoff** (ambos bons, eixos diferentes): `+60 provas` × `arma ↑` → escolhe a build.
- **Ganância** (risco): `×3 provas` mas `arma −1`.
- **Armadilha INSS** (clássica, mantida): boa prova × `÷2`/`−` — preserva o tutorial acessível e a mensagem.

Steering escolhe o lado (`pickSide` já existe). A escolha importa **em dobro** porque `count` agora é DPS.

### 3.6 Boss — Muro de Indeferimento com HP (`wall.ts` estende)
- `resolveBoss(bossHp, dps, windowMs) → { broken, fraction, overkill }`. Equivale a comparar número, mas
  **encenado** como dreno de HP por ~2–4s (a multidão dispara, o muro racha). Mantém `resolveWall` como caso degenerado.
- "Tamanho importa" preservado: mais provas + arma melhor → drena mais rápido/inteiro.

### 3.7 Juice (direção B) — reutilizável (`Fx.ts`)
Muzzle flash, faíscas de impacto, partículas de papel/carimbo, glow, screen shake, estilhaço do muro,
pop de contador, pulso do séquito. Tudo procedural, cores 100% via tokens → **skin do boi recolore de graça**.

---

## 4. Contratos (interfaces) — *interface antes de implementação*

### 4.1 Novos (puros, sem Phaser)
```ts
// systems/projection.ts
interface ProjConfig { width: number; height: number; horizonY: number; heroY: number;
  nearScale: number; farScale: number; halfLaneNear: number; halfLaneFar: number; dHorizon: number; }
function project(d: number, laneX: number, cfg: ProjConfig): { x: number; y: number; scale: number; t: number };

// systems/combat.ts
function fireInterval(provas: number, tier: number): number;     // ms entre disparos
function shotDamage(provas: number, tier: number): number;
function dps(provas: number, tier: number): number;
function applyDamage(hp: number, dmg: number): number;           // max(0, hp - dmg)
function enemyPenalty(hpRestante: number): number;               // provas perdidas
function resolveBoss(bossHp: number, dps: number, windowMs: number):
  { broken: boolean; fraction: number; overkill: number };

// data/weapons.ts  (conteúdo-como-dado; ladder de tiers)
interface WeaponTier { id: string; label: string; dmgMul: number; rateMul: number; art: string; }
const WEAPON_LADDER: WeaponTier[]; // ex.: documento → laudo → dossiê (3 tiers no MVP)
```

### 4.2 Estendidos
```ts
// data/CasoData.ts
type GateAxis = 'provas' | 'weapon';
type GateEffect =
  | { axis: 'provas'; op: 'mul'|'add'|'div'|'sub'; value: number }
  | { axis: 'weapon'; delta: number };          // +1 / -1 tier
interface GateOp { effect: GateEffect; label: string; }   // (migra do {op,value,label} atual)
interface Enemy { kind: string; dist: number; lane: number; hp: number; penalty: number; label: string; art: string; }
interface CasoData { /* ...campos atuais... */ enemies?: Enemy[]; bossHp?: number; /* default derivado de `wall` */ }

// systems/operations.ts — aplica GateEffect (provas OU weapon); isGoodOp/opSign cobrem os dois eixos
// systems/gates.ts — pickSide (intacto) + escolhe o GateOp do lado
// systems/wall.ts — + resolveBoss (acima); resolveWall mantido
```

### 4.3 Migração de dados
Os **5 casos** atuais (`data/casos/*.json`) migram do `{op,value,label}` pro `GateEffect`. Pelo menos o
caso "boss" (BPC) e 1–2 médios ganham `enemies[]` e portões de eixo **weapon** para exercitar o sistema.
Tutorial (salário-maternidade) fica leve: poucos inimigos, portões majoritariamente claros.

---

## 5. Arquitetura & arquivos

### 5.1 Novos
`systems/projection.ts` (puro) · `systems/combat.ts` (puro) · `data/weapons.ts` (dado) ·
`systems/Projectiles.ts` (pool visual/juice) · `systems/Enemy.ts` (visual) · `systems/Fx.ts` (juice reutilizável).

### 5.2 Estendidos
`data/CasoData.ts` (gate de eixos, `enemies`, `bossHp`) · `systems/operations.ts` · `systems/gates.ts` ·
`systems/wall.ts` (boss) · `scenes/RunScene.ts` (reorquestra com projeção + heroína atiradora + combate) ·
`systems/Crowd.ts` (vira séquito atrás da heroína) · `systems/figures.ts` + `theme.json` (arte de Maruzza-herói, inimigos, projétil).

### 5.3 Intactos
`systems/track.ts` · `systems/balance.ts` (estende invariante, não reescreve) · skins/`ThemeManager` ·
acessibilidade (`settings`/`onboarding`) · `ShareCard`/`ResultScene`/`card.ts` · `MenuScene` · guarda OAB.

### 5.4 Fronteira do resolvedor de arte (habilita o C futuro)
Toda arte é endereçada por **chave lógica** (`leader`, `follower`, `enemy.<kind>`, `projectile`, `boss`) através de
**um resolvedor único** (estende `figures.ts`). MVP: devolve textura **procedural** recolorida por tokens. Futuro:
se o `theme.json` da skin declarar `assets: { <chave>: <path> }`, o resolvedor usa o asset (C aditivo, por-skin,
zero gameplay). Esse seam é o que torna "começar em B e ilustrar depois" barato.

---

## 6. Constraints duras

**OAB-safe (testado por `copy-oab.test.ts`, estende pra copy nova):**
- Combate = "entregar provas que dissolvem a burocracia". **Nunca** atacar/ferir pessoas; o perito reage de
  forma **cômica**, ninguém se machuca. Inimigos são **objetos de burocracia** (carimbos, pilhas), não pessoas.
- Vitória = **"MURO DERRUBADO"**; **nunca** "benefício garantido"/"você tem direito". O muro pode segurar.
- Tiers de arma = **qualidade de prova** (documento→laudo→dossiê), não instrumentos que "garantem" resultado.

**Acessibilidade (idoso) — não regride:**
- 1 dedo, auto-mira, perspectiva suave, alvos grandes/alto-contraste, anti-daltonismo (sinais +/× vs −/÷ e eixo por forma/ícone, não só cor).
- **Modo calmo** escala *junto* velocidade de pista, cadência de tiro e aproximação de inimigos (coerência).

---

## 7. Escopo: MVP × Roadmap

**MVP (este spec):** pseudo-3D, Maruzza atiradora, `provas`=potência, combate dps-tick + projéteis-juice,
inimigos/obstáculos, portões de dois eixos, boss com HP, juice B. Run única + recorde + card. 5 casos migrados.

**Roadmap (registrado, fora do MVP):**
- **Fase 6 — Campanha por níveis:** casos como estágios de dificuldade crescente; *timeline de encontros*
  (ondas) substitui a pista por distância simples; boss crescente; desbloqueio progressivo.
- **Fase 7 — Meta-progressão "Escritório da Maruzza":** recurso entre runs → upgrades permanentes
  (exército inicial, arma de largada, perks). Liga ao Hub adiado (`GameModule` já é hub-ready).
- **Arte ilustrada (C):** kit de assets por-skin via o resolvedor (§5.4) — começando pelos heróis de marca (Maruzza, o Boi).
- **Modo desafio / mira por lane; combo/streak de portões; 3 lanes; desafio diário.**

---

## 8. Verificação & testes (mantém o padrão do projeto)

Gate de pronto: `npm run typecheck && npm test && npm run build && npm run smoke` **verdes**.

Testes novos/estendidos (sistemas puros):
- `projection.test.ts` — d=0 → perto (y≈heroY, escala≈near); d=dHorizon → horizonte (y≈horizonY, escala≈far); convergência de x.
- `combat.test.ts` — monotonicidade (mais provas/tier ⇒ mais dps); `applyDamage` clampa em 0; `resolveBoss`
  quebra com build boa e segura com build ruim; `enemyPenalty` ∝ HP restante.
- `operations.test.ts` — estende pro eixo `weapon` (clamp de tier em `[0, ladder.length-1]`).
- `balance.test.ts` — invariante estendido **incluindo combate**: por brute-force das rotas de portão,
  o caso é **vencível jogando bem** (boas builds derrubam o boss na janela, sobrevivendo aos inimigos) e
  **perdível jogando mal**. Mantém a guarda contra curva de dificuldade invertida.
- `copy-oab.test.ts` — cobre a copy nova (inimigos, arma, boss) em **todas as skins**.
- `smoke.mjs` — boot→Menu→Run(pseudo-3D, atira, mata inimigo, resolve boss)→Result→card, sem erro; + swap pra skin boi.

---

## 9. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Pseudo-3D prejudica legibilidade pro idoso | perspectiva suave; alvos grandes/alto-contraste ao chegar; modo calmo; validação por screenshot |
| Combate vira twitchy e quebra acessibilidade | auto-mira + auto-fire; penalidade ∝ HP (sem dodge obrigatório); steering só pra portões |
| Balance do combate (IA tuna mal) | tudo em dados; `combat.ts` puro + `balance.ts` com brute-force das rotas (invariante testado) |
| "Atirar no INSS" soar agressivo/promissor (OAB) | inimigos = burocracia (objetos), nunca pessoas; copy game-framed travada por teste |
| Reescrita grande de `RunScene` introduz regressão | camada **aditiva**; sistemas puros intactos; projeção/combate isolados e testados antes de plugar |
| Perder o sistema de skins ao adicionar arte | toda arte por chave lógica via resolvedor; tokens do tema; parity test cobre chaves novas |
| Pool de projéteis/partículas estoura performance no mobile | projéteis = juice com pool de teto fixo; séquito satura em N figuras; dano é por tick (não por projétil) |
