import type { CardContent } from '../types';
import { getServices } from './index';

const CARD_W = 1080;
const CARD_H = 1350;

/**
 * Renderizador de card viral genérico (Canvas → PNG) + compartilhamento.
 * NÃO conhece o módulo: recebe um `CardContent` (montado pelo módulo) e só
 * resolve cores por tokens do tema ativo. Compartilha via Web Share API (com
 * arquivo) e cai pra download quando não há suporte.
 */
export class ShareCard {
  /** desenha o card e devolve um dataURL PNG (usado também no smoke headless) */
  renderCardDataURL(content: CardContent): string {
    return this.renderCanvas(content).toDataURL('image/png');
  }

  async share(content: CardContent): Promise<void> {
    try {
      const canvas = this.renderCanvas(content);
      const blob = await this.toBlob(canvas);
      const nav = navigator as Navigator & {
        canShare?: (d: unknown) => boolean;
        share?: (d: unknown) => Promise<void>;
      };

      if (blob && nav.canShare) {
        const file = new File([blob], content.fileName, { type: 'image/png' });
        if (nav.canShare({ files: [file] }) && nav.share) {
          await nav.share({ files: [file], title: content.shareTitle, text: content.shareText });
          return;
        }
      }
      if (nav.share) {
        await nav.share({ title: content.shareTitle, text: content.shareText });
        return;
      }
      this.download(blob, canvas, content.fileName);
    } catch {
      /* compartilhar é não-crítico: usuário pode ter cancelado o diálogo */
    }
  }

  private toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  }

  private download(blob: Blob | null, canvas: HTMLCanvasElement, fileName: string): void {
    const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    if (blob) URL.revokeObjectURL(url);
  }

  private renderCanvas(content: CardContent): HTMLCanvasElement {
    const { themes } = getServices();
    const c = (token: string, fallback: string): string => themes.color(token, fallback);
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const bg = c('bg.base', '#0b1020');
    const accent = c('accent.primary', '#22c55e');
    const text = c('text', '#e2e8f0');
    const muted = c('text.muted', '#94a3b8');
    const statusColor = content.won ? c('gate.good', '#22c55e') : c('gate.bad', '#ef4444');

    // fundo + moldura de destaque
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(28, 28, CARD_W - 56, CARD_H - 56);

    ctx.textAlign = 'center';

    // marca
    ctx.fillStyle = accent;
    ctx.font = 'bold 54px Arial, sans-serif';
    ctx.fillText(content.brand, CARD_W / 2, 150);
    ctx.fillStyle = muted;
    ctx.font = '30px Arial, sans-serif';
    ctx.fillText(content.subtitle, CARD_W / 2, 205);

    // status (enquadrado como jogo)
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 76px Arial, sans-serif';
    ctx.fillText(content.status, CARD_W / 2, 380);

    // métrica gigante
    ctx.fillStyle = text;
    ctx.font = 'bold 340px Arial, sans-serif';
    ctx.fillText(content.metric, CARD_W / 2, 720);
    ctx.fillStyle = muted;
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.fillText(content.metricLabel, CARD_W / 2, 800);

    // multidão decorativa
    this.drawCrowd(ctx, accent, 870, content.crowdCount);

    // detalhe
    ctx.fillStyle = muted;
    ctx.font = '36px Arial, sans-serif';
    ctx.fillText(content.detail, CARD_W / 2, 1040);

    // divisória
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CARD_W * 0.2, 1130);
    ctx.lineTo(CARD_W * 0.8, 1130);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // desafio viral
    ctx.fillStyle = accent;
    ctx.font = 'bold 46px Arial, sans-serif';
    ctx.fillText(content.viral, CARD_W / 2, 1210);
    ctx.fillStyle = muted;
    ctx.font = '30px Arial, sans-serif';
    ctx.fillText(content.footnote, CARD_W / 2, 1265);

    return canvas;
  }

  private drawCrowd(ctx: CanvasRenderingContext2D, color: string, y: number, n: number): void {
    const cols = 10;
    const gap = 38;
    const total = (Math.min(n, cols) - 1) * gap;
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = CARD_W / 2 - total / 2 + col * gap;
      ctx.beginPath();
      ctx.arc(x, y + row * gap, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
