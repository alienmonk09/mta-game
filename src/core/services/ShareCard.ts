import type { RunResult } from '../types';

/**
 * Stub — geração do card viral (Canvas) + Web Share API na Fase 2.
 * Por ora só dispara o compartilhamento de texto se disponível.
 */
export class ShareCard {
  async share(result: RunResult): Promise<void> {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      await navigator.share({ title: 'Exército da Maruzza', text: result.shareText });
    }
  }
}
