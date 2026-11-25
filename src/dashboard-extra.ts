// Dashboard pages for AI usage, to-dos and notes. All data comes from the main
// process database, and every change is broadcast so the notch stays in step.
import claudeCode from './assets/logos/claudecode.png';
import cursorMark from './assets/logos/cursor-mark.png';
import gemini from './assets/logos/gemini.svg';
import github from './assets/logos/github.svg';
import openai from './assets/logos/openai.svg';
import opencode from './assets/logos/opencode.png';

type Kind = 'claude-code' | 'codex' | 'cursor' | 'gemini-cli' | 'opencode' | 'copilot';
const NAMES: Record<Kind, string> = { 'claude-code': 'Claude Code', codex: 'Codex', cursor: 'Cursor', 'gemini-cli': 'Gemini CLI', opencode: 'OpenCode', copilot: 'Copilot CLI' };
const LOGOS: Record<Kind, { src: string; invert: boolean }> = {
  'claude-code': { src: claudeCode, invert: false }, codex: { src: openai, invert: true }, cursor: { src: cursorMark, invert: false },
  'gemini-cli': { src: gemini, invert: false }, opencode: { src: opencode, invert: true }, copilot: { src: github, invert: true },
};

const ipc: any = (() => { try { return (window as any).require('electron').ipcRenderer; } catch { return null; } })();
const invoke = (ch: string, ...a: any[]) => (ipc ? ipc.invoke(ch, ...a) : Promise.resolve(null));
const send = (ch: string, ...a: any[]) => ipc?.send(ch, ...a);

const esc = (v: string) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const logo = (k: Kind, size = 18) => `<img class="dx-logo${LOGOS[k]?.invert ? ' invert' : ''}" src="${LOGOS[k]?.src || ''}" width="${size}" height="${size}" alt="${NAMES[k] || k}"/>`;
const ico = (d: string, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
function tokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '')}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace(/\.?0+$/, '')}M`;
  return `${(n / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`;
}
const money = (v: number) => v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: v >= 100 ? 0 : 2 });
function until(ts: number | null): string {
  if (!ts) return '';
  const m = Math.max(0, Math.floor((ts - Date.now()) / 60000)); const h = Math.floor(m / 60); const d = Math.floor(h / 24);
  return d > 0 ? `resets in ${d}d ${h % 24}h` : h > 0 ? `resets in ${h}h ${m % 60}m` : `resets in ${m}m`;
}
const clean = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

export const DASH_ICONS = {
  ai: `<svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor"><path d="M50 8 58 40 90 50 58 60 50 92 42 60 10 50 42 40Z"/></svg>`,
  todos: ico('<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.25 2.4 2.4 4.6-4.9"/>', 20),
  notes: ico('<path d="M14.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5"/><path d="m18 3.5 2.5 2.5-7.5 7.5-3.25.75.75-3.25Z"/>', 20),
};

// ── AI Usage ────────────────────────────────────────────────────────────────
let snap: any = null;
let hist: any = null;
let range = 30;
let busy = false;
let note = '';

async function loadAI() {
  [snap, hist] = await Promise.all([invoke('count:snapshot'), invoke('count:history', range)]);
  paintAI();
}

function paintAI() {
  const el = document.getElementById('panel-ai');
  if (!el) return;
  if (!snap || !hist) {
    el.innerHTML = `<div class="panel-inner"><div class="panel-hdr"><div class="panel-label">AI USAGE</div><div class="panel-sub">Reading your AI tools…</div></div></div>`;
    return;
  }
  const at = snap.settings.switchAt;
  const total = hist.kinds.reduce((a: number, k: any) => a + k.tokens, 0);
  const usd = hist.kinds.reduce((a: number, k: any) => a + k.usd, 0);

  // The chart keeps the Stats page look: one bar a day, today in white.
  // Ninety days fold into weeks so the bars stay readable.
  const days = hist.daily.map((d: any) => ({ day: d.day, t: Object.values(d.parts).reduce((a: number, b: any) => a + b, 0) as number }));
  const bars = range > 30
    ? Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => {
        const chunk = days.slice(w * 7, w * 7 + 7);
        return { label: new Date(`${chunk[0].day}T12:00`).toLocaleDateString([], { day: 'numeric', month: 'short' }), t: chunk.reduce((a: number, c: any) => a + c.t, 0), today: w === Math.ceil(days.length / 7) - 1 };
      })
    : days.map((d: any, k: number) => ({
        label: range === 7 ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(`${d.day}T12:00`).getDay()] : (k % 5 === 4 || k === days.length - 1 ? String(new Date(`${d.day}T12:00`).getDate()) : ''),
        t: d.t, today: k === days.length - 1,
      }));
  const max = Math.max(1, ...bars.map((b: any) => b.t));
  const chart = bars.map((b: any) => `<div class="bar-col">
      <div class="bar-track" title="${tokens(b.t)}"><div class="bar-fill${b.today ? ' today' : ''}" style="height:${Math.max((b.t / max) * 100, b.t > 0 ? 4 : 0)}%"></div><div class="bar-tip">${tokens(b.t)}</div></div>
      <div class="bar-lbl">${b.label}</div>
    </div>`).join('');

  const groups = new Map<Kind, any[]>();
  for (const l of snap.limits) groups.set(l.kind, [...(groups.get(l.kind) || []), l]);
  const meter = (l: any) => {
    const pct = Math.round(l.usedPercent);
    const color = pct >= at ? '#ff453a' : pct >= at - 20 ? '#ffd60a' : '#ffffff';
    return `<div class="ai-meter"><span>${l.label === 'Weekly' ? 'Week' : l.label}</span><div class="ai-track"><i style="width:${Math.min(100, pct)}%;background:${color}"></i></div><b>${pct}%</b></div>`;
  };
  const limitRows = [...groups.entries()].map(([kind, items]) => `
    <div class="lap-row ai-limit-row">
      <span class="ai-tool">${logo(kind, 16)}${NAMES[kind]}</span>
      <div class="ai-meters">${items.map(meter).join('')}</div>
      <span class="lap-total">${until(items.find((i: any) => i.label === 'Session')?.resetsAt ?? items[0].resetsAt)}</span>
    </div>`).join('');

  const toolRows = hist.kinds.map((k: any) => `
    <div class="lap-row ai-tool-row">
      <span class="ai-tool">${logo(k.kind, 16)}${NAMES[k.kind as Kind] || k.kind}${k.estimated ? '<em>est.</em>' : ''}</span>
      <span class="lap-split">${tokens(k.tokens)}</span>
      <span class="lap-total">${money(k.usd)}</span>
    </div>`).join('');

  el.innerHTML = `<div class="panel-inner">
    <div class="panel-hdr"><div class="panel-label">AI USAGE</div><div class="panel-sub">Stored on this PC · synced with the notch</div></div>

    <div class="dur-row">${[7, 30, 90].map((d) => `<button class="dur-btn${d === range ? ' active' : ''}" data-range="${d}">${d}d</button>`).join('')}</div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-lbl">Today</div><div class="stat-val">${tokens(snap.today)}</div></div>
      <div class="stat-card"><div class="stat-lbl">Last 7 days</div><div class="stat-val">${tokens(snap.week)}</div></div>
      <div class="stat-card"><div class="stat-lbl">Last ${range} days</div><div class="stat-val">${tokens(total)}</div></div>
      <div class="stat-card"><div class="stat-lbl">Est. cost</div><div class="stat-val">${money(usd)}</div></div>
    </div>

    <div class="graph-section">
      <div class="graph-lbl">Tokens per ${range > 30 ? 'week' : 'day'}</div>
      <div class="bar-chart${bars.length > 14 ? ' dense' : ''}">${chart}</div>
    </div>

    ${groups.size ? `<div class="graph-section">
      <div class="graph-lbl">Plan limits · auto-switch ${snap.settings.autoSwitch ? `at ${at}%` : 'off'}</div>
      <div class="laps-list ai-list">${limitRows}</div>
    </div>` : ''}

    ${hist.kinds.length ? `<div class="graph-section">
      <div class="laps-hdr ai-hdr"><span>Tool</span><span>Tokens</span><span>Cost</span></div>
      <div class="laps-list ai-list">${toolRows}</div>
    </div>` : ''}

    <div class="ctrl-row">
      ${snap.current && snap.next ? `<button class="ctrl-btn primary" data-continue ${busy ? 'disabled' : ''}>${busy ? '<span>Preparing…</span>' : `${logo(snap.next, 16)}<span>Continue in ${NAMES[snap.next as Kind]}</span>`}</button>` : ''}
      <button class="ctrl-btn secondary" data-refresh>${ico('<path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5"/>')}<span>Sync</span></button>
    </div>
    ${note ? `<div class="panel-sub">${esc(note)}</div>` : ''}
  </div>`;
}

async function continueIn() {
  if (!snap || busy) return;
  busy = true; note = ''; paintAI();
  try {
    const r = await invoke('count:continue', snap.current, snap.next);
    note = `Opened ${NAMES[r.to as Kind]} with your context${r.file ? `. Also saved in ${r.file}` : ''}.`;
  } catch (e) { note = clean(e); } finally { busy = false; await loadAI(); }
}

// ── To-Dos ──────────────────────────────────────────────────────────────────
interface Todo { id: number; text: string; done: boolean }
let todos: Todo[] = [];
let filter: 'all' | 'open' | 'done' = 'open';
const saveTodos = () => send('set-setting', 'todos', JSON.stringify(todos));

function paintTodos() {
  const el = document.getElementById('panel-todos');
  if (!el) return;
  const open = todos.filter((t) => !t.done).length;
  const shown = todos.filter((t) => (filter === 'all' ? true : filter === 'open' ? !t.done : t.done));
  el.innerHTML = `<div class="panel-inner">
    <div class="panel-hdr"><div class="panel-label">TO-DOS</div><div class="panel-sub">${open} open · synced with the notch</div></div>
    <div class="dur-row">${(['open', 'done', 'all'] as const).map((f) => `<button class="dur-btn${f === filter ? ' active' : ''}" data-filter="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div>
    <form class="todo-add-row" data-todo-form>
      <input class="cal-inp" data-todo-input placeholder="Add a to-do…" maxlength="200" />
      <button class="ctrl-btn primary" type="submit">${ico('<path d="M12 5.5v13M5.5 12h13"/>')}<span>Add</span></button>
    </form>
    <div class="cal-evs-list todo-list">${shown.map((t) => `
      <div class="cal-ev-item dx-todo${t.done ? ' done' : ''}" data-id="${t.id}">
        <button class="todo-tick" data-toggle title="${t.done ? 'Mark as open' : 'Mark as done'}">${t.done ? ico('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 11) : ''}</button>
        <span class="cal-ev-title">${esc(t.text)}</span>
        <button class="ev-del" data-del title="Delete">${ico('<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5"/>', 14)}</button>
      </div>`).join('') || `<div class="cal-empty-msg">${filter === 'done' ? 'Nothing finished yet' : 'Nothing to do'}</div>`}</div>
    ${todos.some((t) => t.done) ? '<button class="ctrl-btn secondary" data-clear><span>Clear completed</span></button>' : ''}
  </div>`;
}

// ── Notes ───────────────────────────────────────────────────────────────────
let noteText = '';
let noteTimer: number | undefined;
function paintNotes() {
  const el = document.getElementById('panel-notes');
  if (!el) return;
  const words = noteText.trim() ? noteText.trim().split(/\s+/).length : 0;
  el.innerHTML = `<div class="panel-inner">
    <div class="panel-hdr"><div class="panel-label">NOTE</div><div class="panel-sub" data-note-meta>${words} word${words === 1 ? '' : 's'} · synced with the notch</div></div>
    <textarea class="cal-inp note-area" data-note placeholder="Write anything. It saves as you type.">${esc(noteText)}</textarea>
    <div class="ctrl-row"><button class="ctrl-btn secondary" data-note-copy>${ico('<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>')}<span>Copy</span></button></div>
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
      const row = t.closest<HTMLElement>('.dx-todo');
      const id = row ? Number(row.dataset.id) : 0;
      const f = t.closest<HTMLElement>('[data-filter]');
      if (f) { filter = f.dataset.filter as any; paintTodos(); return; }
      if (t.closest('[data-toggle]')) { todos = todos.map((x) => (x.id === id ? { ...x, done: !x.done } : x)); todos.sort((a, b) => Number(a.done) - Number(b.done)); }
      else if (t.closest('[data-del]')) todos = todos.filter((x) => x.id !== id);
      else if (t.closest('[data-clear]')) todos = todos.filter((x) => !x.done);
      else return;
      saveTodos(); paintTodos();
    }
    if (t.closest('[data-note-copy]')) void navigator.clipboard.writeText(noteText);
  });
  document.addEventListener('submit', (e) => {
    const form = (e.target as HTMLElement).closest('[data-todo-form]');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>('[data-todo-input]')!;
    const text = input.value.trim();
    if (!text) return;
    todos.unshift({ id: Date.now(), text, done: false });
    saveTodos(); paintTodos();
    document.querySelector<HTMLInputElement>('#panel-todos [data-todo-input]')?.focus();
  });
  document.addEventListener('input', (e) => {
    const area = (e.target as HTMLElement).closest<HTMLTextAreaElement>('[data-note]');
    if (!area) return;
    noteText = area.value;
    const words = noteText.trim() ? noteText.trim().split(/\s+/).length : 0;
    const meta = document.querySelector('[data-note-meta]');
    if (meta) meta.textContent = `${words} word${words === 1 ? '' : 's'} · saving`;
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => { send('set-setting', 'note', noteText); if (meta) meta.textContent = `${words} word${words === 1 ? '' : 's'} · synced with the notch`; }, 400);
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
