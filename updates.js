import { text } from './texts.js';

// Version metadata and the focus/visibility checks follow marsrakete/threadline.
const CURRENT_VERSION = Object.freeze({ ...globalThis.APP_VERSION_INFO });
const CHECK_INTERVAL = 3 * 60 * 1000;
const signature = version => `${version.appVersion}|${version.cacheVersion}`;

export async function setupUpdates(beforeReload) {
  const status = document.getElementById('update-status');
  const banner = document.getElementById('update-banner');
  const bannerText = document.getElementById('update-message');
  const applyButton = document.getElementById('apply-update');
  const checkButton = document.getElementById('check-updates');
  document.getElementById('version-label').textContent = text.versionLabel(CURRENT_VERSION);
  if (!('serviceWorker' in navigator)) {
    status.textContent = text.updateUnsupported;
    checkButton.disabled = true;
    return;
  }

  let registration;
  let checking = false;
  let lastCheck = 0;
  let reloading = false;
  let applying = false;
  let updateAvailable = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  function showUpdate(version) {
    updateAvailable = true;
    banner.hidden = false;
    bannerText.textContent = version ? text.updateAvailable(version.appVersion) : text.updateReady;
    applyButton.disabled = false;
  }

  navigator.serviceWorker.addEventListener('controllerchange', async () => {
    // First installation claims this page too, but does not need a reload.
    if (!hadController) { hadController = true; return; }
    if (reloading) return;
    reloading = true;
    try {
      await beforeReload();
      window.location.reload();
    } catch {
      reloading = false;
      applying = false;
      banner.hidden = false;
      bannerText.textContent = text.updateSaveFailed;
      applyButton.disabled = false;
    }
  });

  async function check(silent = false) {
    if (checking) return;
    checking = true;
    lastCheck = Date.now();
    checkButton.disabled = true;
    if (!silent) status.textContent = text.updateChecking;
    try {
      await registration.update();
      // Network-only in the service worker: offline copies must not report "current".
      const response = await fetch('./version.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('version unavailable');
      const remote = await response.json();
      if (typeof remote.appVersion !== 'string' || !remote.appVersion || typeof remote.cacheVersion !== 'string' || !remote.cacheVersion) throw Error('invalid version');
      if (signature(remote) !== signature(CURRENT_VERSION)) {
        showUpdate(remote);
        status.textContent = '';
      } else if (registration.waiting) {
        showUpdate();
      } else if (!silent && !updateAvailable) status.textContent = text.updateCurrent;
    } catch {
      if (!silent) status.textContent = text.updateFailed;
    } finally {
      checking = false;
      checkButton.disabled = false;
    }
  }

  applyButton.addEventListener('click', async () => {
    if (applying) return;
    applying = true;
    applyButton.disabled = true;
    bannerText.textContent = text.updateApplying;
    try {
      await beforeReload();
      if (!registration.waiting) await registration.update();
      const worker = registration.waiting || registration.installing;
      if (!worker) {
        // Metadata may have reached the server before all application assets.
        throw Error('worker not ready');
      }
      if (worker.state !== 'installed') {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => { cleanup(); reject(Error('timeout')); }, 20000);
          function cleanup() { clearTimeout(timer); worker.removeEventListener('statechange', changed); }
          function changed() {
            if (worker.state === 'installed') { cleanup(); resolve(); }
            else if (worker.state === 'redundant') { cleanup(); reject(Error('install failed')); }
          }
          worker.addEventListener('statechange', changed);
          changed();
        });
      }
      worker.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      applying = false;
      applyButton.disabled = false;
      bannerText.textContent = text.updateApplyFailed;
    }
  });

  try {
    registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
    function watchInstallingWorker() {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller && !applying) showUpdate();
      });
    }
    registration.addEventListener('updatefound', watchInstallingWorker);
    watchInstallingWorker();
    if (registration.waiting) showUpdate();
    checkButton.addEventListener('click', () => check());
    function silentCheck() {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck >= CHECK_INTERVAL) void check(true);
    }
    document.addEventListener('visibilitychange', silentCheck);
    window.addEventListener('focus', silentCheck);
    window.addEventListener('online', () => { void check(true); });
    // Also detect releases while the app remains open in the foreground.
    setInterval(silentCheck, CHECK_INTERVAL);
    await check(true);
  } catch {
    status.textContent = text.offlineError;
    checkButton.disabled = true;
  }
}
