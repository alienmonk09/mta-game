// Smoke test headless: builda já deve ter rodado; sobe o preview, dá boot no
// jogo no Chromium, entra na RunScene e falha se houver erro de runtime.
// Uso: npm run smoke   (reutilizável a cada tick do loop)
import { spawn } from 'node:child_process';
import http from 'node:http';
import { chromium } from 'playwright';

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
const SHOT = '/tmp/mta-smoke.png';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await ping(URL)) return true;
    await sleep(500);
  }
  return false;
}

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
});

let browser;
const errors = [];
let exitCode = 0;

try {
  if (!(await waitForServer())) throw new Error('preview não respondeu a tempo');

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 480, height: 854 } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(URL, { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await sleep(1500); // boot + fetch do tema + MenuScene

  const boot = await page.evaluate(() => {
    const g = window.__MTA_GAME__;
    const c = document.querySelector('canvas');
    return {
      hasGame: !!g,
      scenes: g ? g.scene.getScenes(true).map((s) => s.scene.key) : [],
      canvas: c ? { w: c.width, h: c.height } : null,
    };
  });
  if (!boot.hasGame) throw new Error('window.__MTA_GAME__ ausente — boot falhou');
  if (!boot.canvas || boot.canvas.w === 0) throw new Error('canvas não renderizou');
  console.log(`boot ok · cenas ativas: ${boot.scenes.join(', ')} · canvas ${boot.canvas.w}x${boot.canvas.h}`);

  // entra na RunScene (BPC tem inimigos + boss com HP) e deixa rodar até resolver,
  // simulando toque pra dispensar o onboarding/iniciar áudio. Gera erro se a cena quebrar.
  await page.evaluate(() => window.__MTA_GAME__.scene.start('RunScene', { casoId: 'bpc' }));
  await sleep(800);
  await page.mouse.click(240, 600); // dispensa onboarding na 1ª vez / inicia
  await sleep(2500);
  const inRun = await page.evaluate(() => window.__MTA_GAME__.scene.getScenes(true).map((s) => s.scene.key));
  // a run dura ~12s; aqui ela ainda deve estar ativa (ou já em ResultScene), sem erro de runtime
  if (!inRun.includes('RunScene') && !inRun.includes('ResultScene')) {
    throw new Error(`nem RunScene nem ResultScene ativas (ativas: ${inRun.join(', ')})`);
  }
  console.log(`RunScene de combate rodando · cenas ativas: ${inRun.join(', ')}`);

  // Fase 2: entra na ResultScene e valida a geração do card viral (Canvas → PNG)
  const RESULT = {
    won: true,
    score: 187,
    start: 1,
    wall: 60,
    casoId: 'bpc',
    casoName: 'BPC-LOAS da Dona Cida',
    shareText: 'smoke',
  };
  const CARD = {
    won: true,
    brand: 'EXÉRCITO DA MARUZZA',
    subtitle: 'smoke',
    status: 'MURO DERRUBADO! 🎉',
    metric: '187',
    metricLabel: 'PROVAS',
    detail: 'de 1 a 187 provas · muro 60',
    viral: 'Bate meu recorde',
    footnote: 'junte provas e derrube o muro',
    crowdCount: 40,
    fileName: 'smoke.png',
    shareTitle: 'smoke',
    shareText: 'smoke',
  };
  await page.evaluate((r) => window.__MTA_GAME__.scene.start('ResultScene', { result: r }), RESULT);
  await sleep(1500);
  const result = await page.evaluate((card) => {
    const scenes = window.__MTA_GAME__.scene.getScenes(true).map((s) => s.scene.key);
    const svc = window.__MTA_SERVICES__;
    const dataUrl = svc && svc.share ? svc.share.renderCardDataURL(card) : '';
    return { scenes, cardOk: typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png'), cardLen: dataUrl.length };
  }, CARD);
  if (!result.scenes.includes('ResultScene')) throw new Error(`ResultScene não ativa (ativas: ${result.scenes.join(', ')})`);
  if (!result.cardOk) throw new Error('ShareCard.renderCardDataURL não gerou PNG');
  console.log(`ResultScene ok · card viral PNG gerado (${result.cardLen} chars dataURL)`);

  // Fase 4: troca de skin a quente (bumba-boi) — gameplay intacto, sem erro de runtime
  const skin = await page.evaluate(async () => {
    const svc = window.__MTA_SERVICES__;
    await svc.themes.load('bumba-boi');
    window.__MTA_GAME__.scene.start('RunScene', { casoId: 'bpc' });
    return svc.themes.id;
  });
  await sleep(1200);
  const boiScenes = await page.evaluate(() => window.__MTA_GAME__.scene.getScenes(true).map((s) => s.scene.key));
  if (skin !== 'bumba-boi') throw new Error(`skin não trocou (ativa: ${skin})`);
  if (!boiScenes.includes('RunScene')) throw new Error(`RunScene não ativa após troca de skin (ativas: ${boiScenes.join(', ')})`);
  console.log(`skin bumba-boi ok · RunScene rodando com a skin trocada`);

  await page.screenshot({ path: SHOT });
  console.log(`screenshot: ${SHOT}`);

  if (errors.length) {
    exitCode = 1;
    console.error(`\n❌ ${errors.length} erro(s) de runtime:`);
    for (const e of errors) console.error('  - ' + e);
  } else {
    console.log('\n✅ smoke OK — boot + MenuScene + RunScene sem erros de runtime');
  }
} catch (err) {
  exitCode = 1;
  console.error(`\n❌ smoke falhou: ${err.message}`);
  if (errors.length) for (const e of errors) console.error('  - ' + e);
} finally {
  if (browser) await browser.close();
  preview.kill('SIGTERM');
}

process.exit(exitCode);
