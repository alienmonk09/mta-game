import { ThemeManager } from './ThemeManager';
import { AudioManager } from './AudioManager';
import { Persistence } from './Persistence';
import { ShareCard } from './ShareCard';
import { InputManager } from './InputManager';
import { L10n } from './L10n';

/** Serviços compartilhados, injetados nos módulos (base do hub). */
export interface Services {
  themes: ThemeManager;
  audio: AudioManager;
  persistence: Persistence;
  share: ShareCard;
  input: InputManager;
  l10n: L10n;
}

let _services: Services | null = null;

export function createServices(): Services {
  _services = {
    themes: new ThemeManager(),
    audio: new AudioManager(),
    persistence: new Persistence(),
    share: new ShareCard(),
    input: new InputManager(),
    l10n: new L10n(),
  };
  return _services;
}

export function getServices(): Services {
  if (!_services) throw new Error('Services não inicializados — chame createServices() no boot.');
  return _services;
}
