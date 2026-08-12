/**
 * Fähigkeit `reminders` — der Notifier zum Erinnerungs-Kern (core/reminders.ts).
 *
 * Zustellung ohne Backend, datenschutzfreundlich:
 *  · Ist die App sichtbar (z. B. Wandmodus), erscheint ein dezenter In-App-Hinweis.
 *  · Ist sie im Hintergrund und die Erlaubnis erteilt, eine echte
 *    System-Benachrichtigung über den Service Worker (auf Android nötig).
 *  · Bei vollständig geschlossener App ist ohne Server keine Zustellung möglich –
 *    das sagt das Panel ehrlich.
 *
 * Ein 30-Sekunden-Takt prüft die anstehenden Ereignisse; jedes wird höchstens
 * einmal pro Tag ausgelöst (Entdopplung lokal persistiert).
 */

import type { GeoLocation } from '../core/astro-engine';
import { collectReminders, dayKey, type ReminderCategory } from '../core/reminders';
import type { Translator } from '../i18n';

const ENABLED_KEY = 'sunclock.reminders';
const FIRED_KEY = 'sunclock.remindersFired';

// v1: kuratiert auf die Hitzeschutz-Hinweise (Fassade, Lüften). Erweiterbar.
const ACTIVE: ReminderCategory[] = ['comfort'];

export interface ReminderDeps {
  getLocation: () => GeoLocation;
  getTranslator: () => Translator;
}

let deps: ReminderDeps | null = null;
let timer: number | null = null;

// --- Persistenz -------------------------------------------------------------

export function remindersEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function setEnabledFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(ENABLED_KEY, '1');
    else localStorage.removeItem(ENABLED_KEY);
  } catch {
    /* ignore */
  }
}

function loadFired(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}') as Record<string, true>;
  } catch {
    return {};
  }
}

function saveFired(fired: Record<string, true>, now: Date): void {
  // Nur die Einträge des heutigen Tages behalten (ids enden auf den Tagesschlüssel).
  const today = dayKey(now);
  const pruned: Record<string, true> = {};
  for (const id of Object.keys(fired)) if (id.endsWith(today)) pruned[id] = true;
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(pruned));
  } catch {
    /* ignore */
  }
}

// --- Berechtigung -----------------------------------------------------------

export type PermState = NotificationPermission | 'unsupported';

export function notifyPermission(): PermState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

// --- Steuerung --------------------------------------------------------------

export function initReminders(d: ReminderDeps): void {
  deps = d;
  if (remindersEnabled()) startLoop();
}

export async function enableReminders(): Promise<PermState> {
  setEnabledFlag(true);
  let perm: PermState = 'unsupported';
  if (typeof Notification !== 'undefined') {
    perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  }
  startLoop();
  return perm;
}

export function disableReminders(): void {
  setEnabledFlag(false);
  stopLoop();
}

function startLoop(): void {
  if (timer != null || !deps) return;
  void check();
  timer = window.setInterval(() => void check(), 30_000);
}

function stopLoop(): void {
  if (timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
}

async function check(): Promise<void> {
  if (!deps) return;
  const now = new Date();
  const loc = deps.getLocation();
  const t = deps.getTranslator();
  const events = collectReminders(now, loc, ACTIVE);
  const fired = loadFired();
  for (const e of events) {
    const notifyAt = e.at.getTime() - e.leadMin * 60_000;
    // 12-Minuten-Fenster: auch ein verpasster Takt fängt das Ereignis noch.
    const due = now.getTime() >= notifyAt && now.getTime() < notifyAt + 12 * 60_000;
    if (due && !fired[e.id]) {
      await showReminder(t('remind.appTitle'), t(e.msgKey), e.id);
      fired[e.id] = true;
    }
  }
  saveFired(fired, now);
}

// --- Zustellung -------------------------------------------------------------

async function showReminder(title: string, body: string, tag: string): Promise<void> {
  // Sichtbar → ruhiger In-App-Hinweis. Sonst System-Benachrichtigung (falls erlaubt).
  if (typeof document !== 'undefined' && !document.hidden) {
    toast(body);
    return;
  }
  if (notifyPermission() === 'granted' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        tag,
        icon: `${import.meta.env.BASE_URL}icon-192.png`,
        badge: `${import.meta.env.BASE_URL}icon.svg`,
      });
      return;
    } catch {
      /* Fällt auf den In-App-Hinweis zurück. */
    }
  }
  toast(body);
}

/** Vorschau, damit der Ton spürbar wird (immer als In-App-Hinweis). */
export function previewReminder(t: Translator): void {
  toast(t('remind.test.body'));
}

let toastTimer: number | null = null;

function toast(message: string): void {
  let host = document.getElementById('toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast';
    host.className = 'toast';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  host.textContent = message;
  host.classList.add('is-visible');
  if (toastTimer != null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => host?.classList.remove('is-visible'), 8000);
}

// --- Einstellungs-Panel -----------------------------------------------------

export function openReminders(t: Translator, onChange?: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const perm = notifyPermission();
  const card = document.createElement('div');
  card.className = 'onboard__card outdoor';
  card.innerHTML = `
    <h2 class="onboard__title">${t('remind.title')}</h2>
    <p class="chrono__intro">${t('remind.intro')}</p>

    <label class="pin-toggle">
      <input type="checkbox" id="rm-on" ${remindersEnabled() ? 'checked' : ''} />
      <span>${t('remind.enable')}</span>
    </label>

    ${perm === 'denied' ? `<p class="loc__msg" style="text-align:left">${t('remind.denied')}</p>` : ''}

    <p class="solar__note">${t('remind.note')}</p>

    <div class="onboard__actions">
      <button class="btn btn--ghost" id="rm-test">${t('remind.test')}</button>
      <button class="btn btn--primary" id="rm-close">${t('remind.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const cb = card.querySelector('#rm-on') as HTMLInputElement;
  cb.addEventListener('change', async () => {
    if (cb.checked) {
      const p = await enableReminders();
      if (p === 'denied') {
        const note = card.querySelector('.loc__msg');
        if (!note) {
          const el = document.createElement('p');
          el.className = 'loc__msg';
          el.style.textAlign = 'left';
          el.textContent = t('remind.denied');
          cb.closest('.pin-toggle')?.after(el);
        }
      }
    } else {
      disableReminders();
    }
    onChange?.();
  });

  (card.querySelector('#rm-test') as HTMLElement).addEventListener('click', () => previewReminder(t));
  (card.querySelector('#rm-close') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
