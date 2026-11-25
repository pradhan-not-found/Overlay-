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
const COLORS: Record<Kind, string> = { 'claude-code': '#d97757', codex: '#10a37f', cursor: '#9a9aa6', 'gemini-cli': '#8e75b2', opencode: '#f5a524', copilot: '#8b5cf6' };

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

function limitSpark(kind: Kind, label: string): string {
  const pts = (hist?.limitHistory || []).filter((r: any) => r.kind === kind && r.label === label);
  if (pts.length < 2) return '';
  const t0 = Date.now() - 7 * 86_400_000;
  const line = pts.map((p: any) => `${(((p.ts - t0) / (7 * 86_400_000)) * 100).toFixed(2)},${(24 - (p.pct / 100) * 22).toFixed(2)}`).join(' ');
  return `<svg class="dx-spark" viewBox="0 0 100 26" preserveAspectRatio="none"><polyline points="${line}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}

function paintAI() {
  const el = document.getElementById('panel-ai');
  if (!el) return;
  if (!snap || !hist) { el.innerHTML = '<div class="dx-wrap"><p class="dx-muted">Reading your AI tools…</p></div>'; return; }
  const at = snap.settings.switchAt;
  const tone = (p: number) => (p >= at ? '#ff5a4e' : p >= at - 20 ? '#ffb340' : '#6f8dff');
  const groups = new Map<Kind, any[]>();
  for (const l of snap.limits) groups.set(l.kind, [...(groups.get(l.kind) || []), l]);
  const total = hist.kinds.reduce((a: number, k: any) => a + k.tokens, 0);
  const usd = hist.kinds.reduce((a: number, k: any) => a + k.usd, 0);
  const peak = Math.max(1, ...hist.daily.map((d: any) => Object.values(d.parts).reduce((a: number, b: any) => a + b, 0) as number));
  const ready = snap.tools.find((t: any) => t.kind === snap.next)?.ready;
  const sinceText = hist.since ? new Date(`${hist.since}T12:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  el.innerHTML = `<div class="dx-wrap">
    <header class="dx-head">
      <div><h1>AI Usage</h1><p class="dx-muted">Read from your tools' local logs and stored on this PC${sinceText ? ` since ${sinceText}` : ''}.</p></div>
      <div class="dx-actions">
        <div class="dx-seg">${[7, 30, 90].map((d) => `<button class="${d === range ? 'on' : ''}" data-range="${d}">${d} days</button>`).join('')}</div>
        <button class="dx-icon-btn" data-refresh title="Rescan now">${ico('<path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5"/>')}</button>
      </div>
    </header>

    <section class="dx-kpis">
      <div class="dx-kpi"><span>Today</span><b>${tokens(snap.today)}</b><small>tokens</small></div>
      <div class="dx-kpi"><span>Last 7 days</span><b>${tokens(snap.week)}</b><small>${snap.prevWeek ? `${snap.week >= snap.prevWeek ? '↑' : '↓'} ${Math.abs(Math.round(((snap.week - snap.prevWeek) / snap.prevWeek) * 100))}% vs the week before` : 'tokens'}</small></div>
      <div class="dx-kpi"><span>Last ${range} days</span><b>${tokens(total)}</b><small>tokens</small></div>
      <div class="dx-kpi"><span>Est. cost, ${range} days</span><b>${money(usd)}</b><small>at API list prices</small></div>
    </section>

    <section class="dx-grid">
      <div class="dx-card">
        <div class="dx-card-head"><h2>Plan limits</h2><span class="dx-muted">${snap.settings.autoSwitch ? `Auto-switch at ${at}%` : 'Auto-switch off'}</span></div>
        ${groups.size ? [...groups.entries()].map(([kind, items]) => `
          <div class="dx-limit">
            <div class="dx-limit-head">${logo(kind)}<b>${NAMES[kind]}</b>${kind === snap.current ? '<span class="dx-tag">In use</span>' : ''}</div>
            ${items.map((l: any) => `
              <div class="dx-bar-row">
                <span>${l.label === 'Weekly' ? 'Week' : l.label}</span>
                <div class="dx-bar"><i style="width:${Math.min(100, l.usedPercent)}%;background:${tone(l.usedPercent)}"></i></div>
                <b>${Math.round(l.usedPercent)}%</b>
                <small>${until(l.resetsAt)}</small>
              </div>
              <div class="dx-spark-row" style="color:${tone(l.usedPercent)}">${limitSpark(kind, l.label)}</div>`).join('')}
          </div>`).join('') : '<p class="dx-muted">Session and weekly limits appear once Claude Code or Codex has run on this PC.</p>'}
      </div>
      <div class="dx-card dx-now">
        <div class="dx-card-head"><h2>Right now</h2>${snap.lastSwitch ? `<span class="dx-muted">Last handoff ${new Date(snap.lastSwitch.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>` : ''}</div>
        ${snap.current ? `<div class="dx-current">${logo(snap.current, 28)}<div><b>${NAMES[snap.current as Kind]}</b><span class="dx-muted">Your most recent AI tool</span></div></div>` : '<p class="dx-muted">No AI tool activity yet.</p>'}
        ${snap.current && snap.next ? `
          <button class="dx-primary" data-continue ${busy ? 'disabled' : ''}>${busy ? 'Preparing your context…' : `${logo(snap.next, 16)} Continue in ${NAMES[snap.next as Kind]}`}</button>
          <p class="dx-muted dx-center">${ready ? 'Opens it in a terminal in your project with your prompts, files and git status.' : 'Not signed in or not installed as a CLI, so your context is copied instead.'}</p>` : ''}
        ${note ? `<p class="dx-note">${esc(note)}</p>` : ''}
      </div>
    </section>

    <section class="dx-card">
      <div class="dx-card-head"><h2>Daily tokens</h2>
        <div class="dx-legend">${hist.kinds.map((k: any) => `<span><i style="background:${COLORS[k.kind as Kind] || '#888'}"></i>${NAMES[k.kind as Kind] || k.kind}</span>`).join('')}</div></div>
      <div class="dx-chart">${hist.daily.map((d: any) => {
        const t = Object.values(d.parts).reduce((a: number, b: any) => a + b, 0) as number;
        const parts = (Object.entries(d.parts) as [Kind, number][]).map(([k, v]) => `<i style="flex:${v};background:${COLORS[k] || '#888'}"></i>`).join('');
        return `<div class="dx-col" title="${new Date(`${d.day}T12:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} · ${tokens(t)}"><div class="dx-stack" style="height:${t ? Math.max(2, (t / peak) * 100) : 0}%">${parts}</div></div>`;
      }).join('')}</div>
      <div class="dx-axis"><span>${new Date(`${hist.daily[0].day}T12:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span><span>Today</span></div>
    </section>

    <section class="dx-grid">
      <div class="dx-card">
        <div class="dx-card-head"><h2>By tool</h2><span class="dx-muted">last ${range} days</span></div>
        <table class="dx-table">
          <thead><tr><th>Tool</th><th>Input</th><th>Cache</th><th>Output</th><th>Cost</th></tr></thead>
          <tbody>${hist.kinds.map((k: any) => `
            <tr><td><div class="dx-tool">${logo(k.kind)}<span>${NAMES[k.kind as Kind] || k.kind}${k.estimated ? ' <em title="This tool does not store exact counts">est.</em>' : ''}</span></div>
              <div class="dx-bar thin"><i style="width:${total ? (k.tokens / total) * 100 : 0}%;background:${COLORS[k.kind as Kind] || '#888'}"></i></div></td>
            <td>${tokens(k.input)}</td><td>${tokens(k.cache)}</td><td>${tokens(k.output)}</td><td>${money(k.usd)}</td></tr>`).join('') || '<tr><td colspan="5" class="dx-muted">No usage in this range.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="dx-card">
        <div class="dx-card-head"><h2>Top models</h2></div>
        ${hist.models.map((m: any) => `<div class="dx-model">${logo(m.kind, 14)}<code>${esc(m.model)}</code><span>${tokens(m.tokens)}</span></div>`).join('') || '<p class="dx-muted">No usage in this range.</p>'}
      </div>
    </section>
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
  el.innerHTML = `<div class="dx-wrap dx-narrow">
    <header class="dx-head"><div><h1>To-Dos</h1><p class="dx-muted">${open} open · synced with the notch</p></div>
      <div class="dx-seg">${(['open', 'done', 'all'] as const).map((f) => `<button class="${f === filter ? 'on' : ''}" data-filter="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div></header>
    <form class="dx-add" data-todo-form>${ico('<path d="M12 5.5v13M5.5 12h13"/>')}<input data-todo-input placeholder="Add a to-do and press Enter" maxlength="200"/></form>
    <div class="dx-todos">${shown.map((t) => `
      <div class="dx-todo${t.done ? ' done' : ''}" data-id="${t.id}">
        <button class="dx-check" data-toggle>${t.done ? ico('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 12) : ''}</button>
        <span>${esc(t.text)}</span>
        <button class="dx-icon-btn dx-del" data-del title="Delete">${ico('<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5"/>', 14)}</button>
      </div>`).join('') || `<p class="dx-muted dx-empty">${filter === 'done' ? 'Nothing finished yet.' : 'Nothing to do.'}</p>`}</div>
    ${todos.some((t) => t.done) ? '<button class="dx-link" data-clear>Clear completed</button>' : ''}
  </div>`;
}

// ── Notes ───────────────────────────────────────────────────────────────────
let noteText = '';
let noteTimer: number | undefined;
function paintNotes() {
  const el = document.getElementById('panel-notes');
  if (!el) return;
  const words = noteText.trim() ? noteText.trim().split(/\s+/).length : 0;
  el.innerHTML = `<div class="dx-wrap dx-narrow dx-fill">
    <header class="dx-head"><div><h1>Note</h1><p class="dx-muted" data-note-meta>${words} word${words === 1 ? '' : 's'} · synced with the notch</p></div>
      <button class="dx-secondary" data-note-copy>${ico('<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>', 14)} Copy</button></header>
    <textarea class="dx-note-area" data-note placeholder="Write anything. It saves as you type.">${esc(noteText)}</textarea>
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
      if (t.closest('[data-refresh]')) void invoke('count:refresh').then(loadAI);
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
    if (meta) meta.textContent = `${words} word${words === 1 ? '' : 's'} · saving…`;
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => { send('set-setting', 'note', noteText); if (meta) meta.textContent = `${words} word${words === 1 ? '' : 's'} · saved`; }, 400);
  });

  // Live sync from the notch and the background scanner.
  ipc?.on('count:update', () => void loadAI());
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
