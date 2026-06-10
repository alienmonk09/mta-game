# Skills de Gamedev — MTA Game

Referência das skills instaladas para desenvolver o jogo em **Phaser 4**.
Documento mantido para que qualquer agente saiba **qual skill chamar e quando**.

## Onde estão / como o Claude Code enxerga

- **Instaladas em:** `.agents/skills/` (formato universal do `npx skills`, só no projeto — não global).
- **Expostas para o Claude Code via symlink:** `.claude/skills → ../.agents/skills`.
- O Claude Code indexa skills **no início da sessão**. Depois de instalar/alterar, é preciso
  **reload da sessão** para elas aparecerem na lista de skills invocáveis.

## Como invocar

1. **Auto-trigger (preferido):** cada skill tem palavras-gatilho na descrição. Ao escrever código que
   bate com o gatilho (ex.: "criar uma `Scene`", "adicionar `tween`"), invoque a skill correspondente
   via ferramenta `Skill` **antes** de escrever o código.
2. **Explícito:** `Skill(skill="<name>")` usando o `name` da tabela abaixo.

> Regra de ouro: a skill certa é chamada **antes** de implementar aquele pedaço, não depois.

## Política de versão

Jogo novo → **Phaser 4**. O pacote oficial `phaserjs/phaser` já é v4.
⚠️ A skill `phaser-design-patterns` é **Phaser 3**: use pelos *conceitos* de arquitetura/padrões,
**não** copie o código de exemplo literalmente (API v3 ≠ v4).

---

## Núcleo — engine (oficial PhaserJS, v4)

| `name` | Gatilho | Quando usar no MTA Game |
|---|---|---|
| `game-setup-and-config` | `new Phaser.Game`, GameConfig, renderer, pixel art, FPS, escala | Bootar o jogo, configurar canvas/escala responsiva, modo pixel art |
| `scenes` | Scene, preload, create, update, transição, SceneManager | **Cada tela = uma Scene** (menu, caso, "tribunal", resultado). Base da modularidade |
| `sprites-and-images` | Sprite, Image, `this.add.sprite`, texture, setTint, setAlpha | Maruzza, clientes, perito do INSS, documentos, cenário |
| `animations` | spritesheet, atlas, play animation, frames | Personagens animados (falar, reagir, "Protesto!") |
| `tweens` | tween, ease, animate, `this.tweens.add`, stagger, yoyo | Polish: cartas entrando, telas deslizando, feedback de acerto/erro. **O "bonito" mora aqui** |
| `tilemaps` | Tilemap, Tiled, tile collision, tile properties | Só se houver cenário em grid (escritório, mapa). Opcional |
| `audio-and-sound` | sound, audio, music, volume, mute | SFX (objeção, vitória), trilha, mute |
| `v4-new-features` | Filters, RenderNode, SpriteGPULayer, Gradient, Noise, novos tint modes | Efeitos visuais avançados exclusivos do v4. Consultar antes de inventar shader na mão |

## Arte & UI

| `name` | Gatilho | Quando usar no MTA Game |
|---|---|---|
| `game-ui-design` | game ui, hud, menu, health/stamina bar, button prompt, tooltip, mobile/controller ui, acessibilidade | Desenhar HUD e telas. **Crítico p/ "fácil jogabilidade" + acessibilidade** (público pode ter baixa familiaridade digital) |
| `pixel-art-sprites` | pixel art, sprites, sprite sheet, 8/16-bit, character sprites, aseprite | Gerar/orientar arte dos personagens e ícones **se** o estilo escolhido for pixel art |

## Padrões & arquitetura

| `name` | Gatilho | Quando usar no MTA Game |
|---|---|---|
| `phaser-design-patterns` | aplicar/refatorar/revisar design patterns (creational/structural/behavioral), entidades, input, física | Estruturar a arquitetura modular. ⚠️ **Phaser 3** — usar conceitos, não o código v3 cru |

---

## Deixadas de fora (de propósito)

| Skill | Motivo |
|---|---|
| `opusgamelabs/game-creator@*` | Scaffolder opinativo; redundante com o pacote oficial. Geraria estrutura concorrente |
| `tomcoolpxl/sugar-splat@writing-phaser-3-games` | Phaser **3** — conflita com a escolha de v4 |
| `phaserjs/phaser@v3-to-v4-migration` | Não há código v3 legado para migrar (projeto greenfield) |

## Manutenção

```bash
# Checar updates das skills instaladas
npx skills check

# Atualizar todas
npx skills update

# Adicionar uma nova (só no projeto, sem -g)
npx skills add <owner/repo@skill> -y
```
