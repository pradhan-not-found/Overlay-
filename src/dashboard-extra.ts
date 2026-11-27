// Dashboard pages for AI usage, to-dos and notes. All data comes from the main
// process database, and every change is broadcast so the notch stays in step.
// Each page uses the same header and cards as the settings pages.
import { aiMark, aiName } from './assets/ai-logos';
import { head } from './dashboard-settings';

type Kind = 'claude-code' | 'codex' | 'cursor' | 'gemini-cli' | 'opencode' | 'copilot' | 'antigravity';
const NAMES: Record<Kind, string> = { 'claude-code': 'Claude Code', codex: 'Codex', cursor: 'Cursor', 'gemini-cli': 'Gemini CLI', opencode: 'OpenCode', copilot: 'Copilot CLI', antigravity: 'Antigravity' };
const toolName = (k: string) => NAMES[k as Kind] || aiName(k);

const ipc: any = (() => { try { return (window as any).require('electron').ipcRenderer; } catch { return null; } })();
const invoke = (ch: string, ...a: any[]) => (ipc ? ipc.invoke(ch, ...a) : Promise.resolve(null));
const send = (ch: string, ...a: any[]) => ipc?.send(ch, ...a);

const esc = (v: string) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const logo = (k: string, size = 18) => `<span class="dx-logo">${aiMark(k, size)}</span>`;
const ico = (d: string, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export function tokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '')}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace(/\.?0+$/, '')}M`;
  return `${(n / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`;
}
const money = (v: number) => v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: v >= 100 ? 0 : 2 });
function until(ts: number | null): string {
  if (!ts) return '';
  const m = Math.max(0, Math.floor((ts - Date.now()) / 60000)); const h = Math.floor(m / 60); const d = Math.floor(h / 24);
  return d > 0 ? `Resets in ${d}d ${h % 24}h` : h > 0 ? `Resets in ${h}h ${m % 60}m` : `Resets in ${m}m`;
}
const orList = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}` : xs[0] || '');
const clean = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** A stat tile: a label, a big value and one muted line under it. */
export const tile = (label: string, value: string, sub = '', muted = false) =>
  `<div class="dp-tile"><span class="dp-tile-lbl">${label}</span><b class="dp-tile-val${muted ? ' muted' : ''}">${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
/** A card with an optional title and something on the right of the title. */
export const section = (title: string, body: string, side = '', note = '') =>
  `<section class="ds-card dp-card">${title || side ? `<div class="dp-card-head"><h3>${title}</h3>${side}</div>` : ''}<div class="ds-card-body">${body}</div>${note ? `<p class="ds-note">${note}</p>` : ''}</section>`;

export const DASH_ICONS = {
  ai: `<svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor"><path d="M50 8 58 40 90 50 58 60 50 92 42 60 10 50 42 40Z"/></svg>`,
  todos: ico('<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.25 2.4 2.4 4.6-4.9"/>', 20),
  notes: ico('<path d="M14.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5"/><path d="m18 3.5 2.5 2.5-7.5 7.5-3.25.75.75-3.25Z"/>', 20),
};
const REFRESH = ico('<path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5"/>', 15);

// ── AI Usage ────────────────────────────────────────────────────────────────
let snap: any = null;
let hist: any = null;
let range = 30;
let busy = false;
let note = '';

async function loadAI() {
  [snap, hist] = await Promise.all([invoke('count:snapshot'), invoke('count:history', range)]);
  // Outside the app there is nothing to read: show the empty page, not a spinner.
  if (!ipc) { snap = snap || { limits: [], sources: [], settings: {} }; hist = hist || { kinds: [], daily: [] }; }
  paintAI();
}

const LIMIT_NAME: Record<string, string> = { Session: 'Session limit used', Weekly: 'Weekly limit used' };

function paintAI() {
  const el = document.getElementById('panel-ai');
  if (!el) return;
  const refresh = `<button type="button" class="ds-btn" data-refresh>${REFRESH}<span>Refresh</span></button>`;
  const top = head('AI usage', 'How much your AI coding tools did, and how close each one is to its plan limit.', refresh);
  if (!snap || !hist) {
    el.innerHTML = `<div class="ds-page">${top}${section('', '<p class="ds-empty">Reading your AI tools…</p>')}</div>`;
    return;
  }
  const at = snap.settings?.switchAt ?? 90;
  const dayTotal = (d: any) => Object.values(d.parts || {}).reduce((x: number, y: any) => x + y, 0) as number;
  const daily: any[] = hist.daily || [];
  const total = (hist.kinds || []).reduce((a: number, k: any) => a + k.tokens, 0);
  const todayTokens = daily.length ? dayTotal(daily[daily.length - 1]) : 0;
  const weekTokens = daily.slice(-7).reduce((x: number, d: any) => x + dayTotal(d), 0);
  const usd = (hist.kinds || []).reduce((a: number, k: any) => a + k.usd, 0);
  const limits: any[] = snap.limits || [];

  // Nothing used yet, and no plan limits to show: one clear card instead of zeros.
  if (!total && !limits.length) {
    const found: string[] = [...new Set<string>((snap.sources || []).map((x: any) => x.kind))];
    el.innerHTML = `<div class="ds-page">${top}
      <section class="ds-card dp-empty">
        <div class="dp-empty-logos">${(found.length ? found : ['claude-code', 'codex', 'cursor', 'gemini-cli']).map((k) => logo(k, 22)).join('')}</div>
        <b>No AI use yet</b>
        <p>When you use ${found.length ? orList(found.map(toolName)) : 'Claude Code, Codex, Cursor or another AI coding tool'} on this PC, how much it did shows up here. Nothing leaves this PC.</p>
      </section>
    </div>`;
    return;
  }

  // One bar a day, today in white. Ninety days fold into weeks so the bars stay readable.
  const days = daily.map((d: any) => ({ day: d.day, t: dayTotal(d) }));
  const bars = range > 30
    ? Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => {
        const chunk = days.slice(w * 7, w * 7 + 7);
        return { label: new Date(`${chunk[0].day}T12:00`).toLocaleDateString([], { day: 'numeric', month: 'short' }), t: chunk.reduce((a: number, c: any) => a + c.t, 0), today: w === Math.ceil(days.length / 7) - 1 };
      })
    : days.map((d: any, k: number) => ({
        label: range === 7 ? new Date(`${d.day}T12:00`).toLocaleDateString('en-US', { weekday: 'short' }) : (k % 5 === 4 || k === days.length - 1 ? String(new Date(`${d.day}T12:00`).getDate()) : ''),
        t: d.t, today: k === days.length - 1,
      }));
  const max = Math.max(1, ...bars.map((b: any) => b.t));
  const chart = bars.map((b: any) => `<div class="bar-col">
      <div class="bar-track" title="${tokens(b.t)} tokens"><div class="bar-fill${b.today ? ' today' : ''}" style="height:${Math.max((b.t / max) * 100, b.t > 0 ? 4 : 0)}%"></div><div class="bar-tip">${b.t ? `${tokens(b.t)} tokens` : 'None'}</div></div>
      <div class="bar-lbl">${b.label}</div>
    </div>`).join('');
  const seg = `<div class="dp-seg">${[7, 30, 90].map((d) => `<button type="button" class="${d === range ? 'on' : ''}" data-range="${d}">${d} days</button>`).join('')}</div>`;

  const groups = new Map<string, any[]>();
  for (const l of limits) groups.set(l.kind, [...(groups.get(l.kind) || []), l]);
  const meter = (l: any) => {
    const pct = Math.round(l.usedPercent);
    const tone = pct >= at ? 'bad' : pct >= at - 20 ? 'warn' : '';
    return `<div class="dp-meter">
      <div class="dp-meter-top"><span>${LIMIT_NAME[l.label] || `${esc(l.label)} limit used`}</span><b class="${tone}">${pct}%</b></div>
      <div class="dp-track"><i class="${tone}" style="width:${Math.min(100, pct)}%"></i></div>
      ${l.resetsAt ? `<small>${until(l.resetsAt)}</small>` : ''}
    </div>`;
  };
  const limitRows = [...groups.entries()].map(([kind, items]) => `
    <div class="dp-limit">
      <div class="dp-tool">${logo(kind, 20)}<b>${toolName(kind)}</b></div>
      <div class="dp-meters">${items.map(meter).join('')}</div>
    </div>`).join('');

  const toolRows = (hist.kinds || []).map((k: any) => `
    <div class="dp-tool-row">
      <div class="dp-tool">${logo(k.kind, 20)}<b>${toolName(k.kind)}</b>${k.estimated ? '<em title="This tool does not report exact numbers, so Overlay estimates them.">Estimated</em>' : ''}</div>
      <div class="dp-share"><i style="width:${total ? Math.max(2, (k.tokens / total) * 100) : 0}%"></i></div>
      <span class="dp-num">${tokens(k.tokens)} <small>tokens</small></span>
      <span class="dp-num dim">${money(k.usd)}</span>
    </div>`).join('');

  const cont = snap.current && snap.next
    ? section('', `<div class="ds-row"><div class="ds-row-text"><b>Continue in ${toolName(snap.next)}</b><span>Opens ${toolName(snap.next)} with what you were doing in ${toolName(snap.current)}, so you can pick up where you left off.</span></div>
        <button type="button" class="ds-btn primary dp-btn-logo" data-continue ${busy ? 'disabled' : ''}>${busy ? 'Preparing…' : `${aiMark(snap.next, 15, { onLight: true })}<span>Continue</span>`}</button></div>`, '', esc(note))
    : (note ? `<p class="ds-note">${esc(note)}</p>` : '');

  el.innerHTML = `<div class="ds-page">${top}
    <div class="dp-tiles three">
      ${tile('Tokens today', todayTokens ? tokens(todayTokens) : 'None yet', todayTokens ? 'Across all your AI tools' : 'No AI use yet today', !todayTokens)}
      ${tile('Tokens this week', weekTokens ? tokens(weekTokens) : 'None yet', 'The last 7 days', !weekTokens)}
      ${tile('Estimated cost', usd ? money(usd) : 'Nothing yet', `Last ${range} days, at API prices`, !usd)}
    </div>

    ${groups.size ? section('Plan limits', limitRows, '', `Session limits reset every few hours, weekly limits once a week. ${snap.settings?.autoSwitch ? `At ${at}% Overlay offers to move you to your next tool.` : 'Switching to your next tool at the limit is off.'}`) : ''}

    ${cont}

    ${section(range > 30 ? 'Tokens per week' : 'Tokens per day', `<div class="bar-chart dp-chart${bars.length > 14 ? ' dense' : ''}">${chart}</div>`, seg)}

    ${(hist.kinds || []).length ? section(`By tool, last ${range} days`, toolRows, '', 'A token is a small piece of text, about three quarters of a word. Costs are estimates at public API prices; on a subscription you are not billed per token.') : ''}
  </div>`;
}

async function continueIn() {
  if (!snap || busy) return;
  busy = true; note = ''; paintAI();
  try {
    const r = await invoke('count:continue', snap.current, snap.next);
    note = `Opened ${toolName(r.to)} with your context${r.file ? `. Also saved in ${r.file}` : ''}.`;
  } catch (e) { note = clean(e); } finally { busy = false; await loadAI(); }
}

/** Today's tokens per tool, for the Overview. */
export async function aiToday(): Promise<{ total: number; tools: { kind: string; tokens: number }[] } | null> {
  const s: any = await invoke('count:snapshot').catch(() => null);
  if (!s) return null;
  const tools = (s.sources || []).filter((x: any) => x.today > 0).map((x: any) => ({ kind: x.kind, tokens: x.today })).sort((a: any, b: any) => b.tokens - a.tokens);
  return { total: s.today || 0, tools };
}
export { logo as aiLogo, toolName };

// ── To-Dos ──────────────────────────────────────────────────────────────────
interface Todo { id: number; text: string; done: boolean }
let todos: Todo[] = [];
let filter: 'all' | 'open' | 'done' = 'open';
const saveTodos = () => send('set-setting', 'todos', JSON.stringify(todos));
const CHECK = ico('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 12);
const TRASH = ico('<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5"/>', 15);

function paintTodos() {
  const el = document.getElementById('panel-todos');
  if (!el) return;
  const open = todos.filter((t) => !t.done).length;
  const done = todos.length - open;
  const shown = todos.filter((t) => (filter === 'all' ? true : filter === 'open' ? !t.done : t.done));
  const count = { open, done, all: todos.length };
  const label = { open: 'Open', done: 'Done', all: 'All' };
  const seg = `<div class="dp-seg">${(['open', 'done', 'all'] as const).map((f) => `<button type="button" class="${f === filter ? 'on' : ''}" data-filter="${f}">${label[f]}<span>${count[f]}</span></button>`).join('')}</div>`;
  const empty = filter === 'done' ? 'Nothing finished yet.' : todos.length ? 'All done. Nice work.' : 'Nothing here yet. Add your first to-do above.';
  const list = shown.map((t) => `
    <div class="dp-todo${t.done ? ' done' : ''}" data-id="${t.id}">
      <button type="button" class="todo-tick" data-toggle title="${t.done ? 'Mark as not done' : 'Mark as done'}">${t.done ? CHECK : ''}</button>
      <span>${esc(t.text)}</span>
      <button type="button" class="dp-icon-btn" data-del title="Delete">${TRASH}</button>
    </div>`).join('') || `<p class="ds-empty">${empty}</p>`;
  el.innerHTML = `<div class="ds-page">${head('To-dos', 'Things to get done today. They show in the notch too.')}
    <section class="ds-card"><form class="ds-inline" data-todo-form>
      <input data-todo-input placeholder="Add a to-do and press Enter" maxlength="200" autocomplete="off"/>
      <button class="ds-btn primary" type="submit">Add</button>
    </form></section>
    ${section(filter === 'open' ? 'To do' : filter === 'done' ? 'Done' : 'Everything', `<div class="dp-todos">${list}</div>`, seg)}
    ${done ? '<div class="dp-foot"><button type="button" class="ds-btn ghost" data-clear>Clear done</button></div>' : ''}
  </div>`;
}

// ── Notes ───────────────────────────────────────────────────────────────────
let noteText = '';
let noteTimer: number | undefined;
const wordsIn = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const metaText = (saving: boolean) => { const w = wordsIn(noteText); return `${w} word${w === 1 ? '' : 's'} · ${saving ? 'Saving…' : 'Saved'}`; };
function paintNotes() {
  const el = document.getElementById('panel-notes');
  if (!el) return;
  el.innerHTML = `<div class="ds-page">${head('Notes', 'One scratchpad that saves as you type. It shows in the notch too.')}
    <section class="ds-card dp-note">
      <textarea data-note placeholder="Write anything: an idea, a link, what to do next.">${esc(noteText)}</textarea>
      <div class="dp-note-foot"><span data-note-meta>${metaText(false)}</span>
        <button type="button" class="ds-btn ghost" data-note-copy>${ico('<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>', 14)}<span>Copy</span></button>
      </div>
    </section>
  </div>`;
}

// ── Wiring ──────────────────────────────────────────────────────────────────
let wired = false;
export function mountDashExtras() {
  paintAI(); paintTodos(); paintNotes();
  if (wired) return;
  wired = true;

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('#panel-ai')) {
      const r = t.closest<HTMLElement>('[data-range]');
      if (r) { range = Number(r.dataset.range); void loadAI(); }
      if (t.closest('[data-refresh]')) void invoke('sync:all').then(loadAI);
      if (t.closest('[data-continue]')) void continueIn();
    }
    if (t.closest('#panel-todos')) {
      const row = t.closest<HTMLElement>('.dp-todo');
      const id = row ? Number(row.dataset.id) : 0;
      const f = t.closest<HTMLElement>('[data-filter]');
      if (f) { filter = f.dataset.filter as any; paintTodos(); return; }
      if (t.closest('[data-toggle]')) { todos = todos.map((x) => (x.id === id ? { ...x, done: !x.done } : x)); todos.sort((a, b) => Number(a.done) - Number(b.done)); }
      else if (t.closest('[data-del]')) todos = todos.filter((x) => x.id !== id);
      else if (t.closest('[data-clear]')) todos = todos.filter((x) => !x.done);
      else return;
      saveTodos(); paintTodos();
    }
    const copy = t.closest<HTMLElement>('[data-note-copy]');
    if (copy) {
      void navigator.clipboard.writeText(noteText).then(() => {
        const s = copy.querySelector('span'); if (s) { s.textContent = 'Copied'; setTimeout(() => { s.textContent = 'Copy'; }, 1400); }
      });
    }
  });
  document.addEventListener('submit', (e) => {
    const form = (e.target as HTMLElement).closest('[data-todo-form]');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>('[data-todo-input]')!;
    const text = input.value.trim();
    if (!text) return;
    todos.unshift({ id: Date.now(), text, done: false });
    if (filter === 'done') filter = 'open';
    saveTodos(); paintTodos();
    document.querySelector<HTMLInputElement>('#panel-todos [data-todo-input]')?.focus();
  });
  document.addEventListener('input', (e) => {
    const area = (e.target as HTMLElement).closest<HTMLTextAreaElement>('[data-note]');
    if (!area) return;
    noteText = area.value;
    const meta = document.querySelector('[data-note-meta]');
    if (meta) meta.textContent = metaText(true);
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => { send('set-setting', 'note', noteText); if (meta) meta.textContent = metaText(false); }, 400);
  });


  // Live sync from the notch and the background scanner.
  ipc?.on('count:update', () => void loadAI());
  ipc?.on('sync-all', () => {
    void loadAI();
    void invoke('get-setting', 'todos', '[]').then((v: string) => { try { todos = JSON.parse(v) || []; } catch { todos = []; } paintTodos(); });
    void invoke('get-setting', 'note', '').then((v: string) => {
      noteText = v || '';
      const area = document.querySelector<HTMLTextAreaElement>('[data-note]');
      if (area && document.activeElement !== area) area.value = noteText;
    });
  });
  ipc?.on('setting-changed', (_e: unknown, key: string, value: string) => {
    if (key === 'todos') { try { todos = JSON.parse(value) || []; } catch { todos = []; } paintTodos(); }
    if (key === 'note') {
      noteText = value || '';
      const area = document.querySelector<HTMLTextAreaElement>('[data-note]');
      if (area && document.activeElement !== area) area.value = noteText;
    }
  });

  void invoke('get-setting', 'todos', '[]').then((v: string) => { try { todos = JSON.parse(v) || []; } catch { todos = []; } paintTodos(); });
  void invoke('get-setting', 'note', '').then((v: string) => { noteText = v || ''; paintNotes(); });
  void loadAI();
  setInterval(() => { if (document.querySelector('#panel-ai.active')) paintAI(); }, 60_000);
}
