// To-Dos, Note, Clipboard and Hardware: the notch's everyday tools.

type Invoke = (ch: string, ...a: any[]) => Promise<any>;
type Send = (ch: string, ...a: any[]) => void;

interface Todo { id: number; text: string; done: boolean }
interface Clip { id: number; text: string; at: number }

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const svg = (d: string, size = 14) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  trash: '<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="m8 5.5 10 6.5-10 6.5z"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
};

function ago(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
const bytes = (n: number) => (n >= 1e9 ? `${(n / 1073741824).toFixed(1)} GB` : `${Math.round(n / 1048576)} MB`);
const rate = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB/s` : n >= 1024 ? `${Math.round(n / 1024)} KB/s` : `${Math.round(n)} B/s`);

export function mountExtraTools(opts: { invoke: Invoke; send: Send }) {
  const { invoke, send } = opts;
  const $ = (sel: string) => document.querySelector<HTMLElement>(sel)!;

  // ── To-Dos ──────────────────────────────────────────────────────────────
  const todosEl = $('[data-space="todos"]');
  let todos: Todo[] = [];
  const saveTodos = () => send('set-setting', 'todos', JSON.stringify(todos));
  function renderTodos() {
    const open = todos.filter((t) => !t.done).length;
    todosEl.innerHTML = `
      <form class="todo-add" data-todo-form>
        <span class="todo-plus">${svg(I.plus, 15)}</span>
        <input data-todo-input placeholder="Add a to-do and press Enter" maxlength="200" />
        <span class="cnt-muted">${open} open</span>
      </form>
      <div class="todo-list">
        ${todos.length ? todos.map((t) => `
          <div class="todo${t.done ? ' done' : ''}" data-id="${t.id}">
            <button class="todo-check" data-todo-toggle title="${t.done ? 'Mark as open' : 'Mark as done'}">${t.done ? svg(I.check, 12) : ''}</button>
            <span class="todo-text">${esc(t.text)}</span>
            <button class="ibtn ibtn-sm todo-del" data-todo-del title="Delete">${svg(I.trash, 13)}</button>
          </div>`).join('') : '<p class="tool-empty">Nothing to do. Add the next small thing above.</p>'}
      </div>
      ${todos.some((t) => t.done) ? '<button class="tool-link" data-todo-clear>Clear completed</button>' : ''}`;
  }
  todosEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = todosEl.querySelector<HTMLInputElement>('[data-todo-input]')!;
    const text = input.value.trim();
    if (!text) return;
    todos.unshift({ id: Date.now(), text, done: false });
    saveTodos(); renderTodos();
    todosEl.querySelector<HTMLInputElement>('[data-todo-input]')?.focus();
  });
  todosEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    e.stopPropagation();
    const row = t.closest<HTMLElement>('.todo');
    const id = row ? Number(row.dataset.id) : 0;
    if (t.closest('[data-todo-toggle]')) { todos = todos.map((x) => (x.id === id ? { ...x, done: !x.done } : x)); todos.sort((a, b) => Number(a.done) - Number(b.done)); }
    else if (t.closest('[data-todo-del]')) todos = todos.filter((x) => x.id !== id);
    else if (t.closest('[data-todo-clear]')) todos = todos.filter((x) => !x.done);
    else return;
    saveTodos(); renderTodos();
  });
  invoke('get-setting', 'todos', '[]').then((v: string) => { try { todos = JSON.parse(v) || []; } catch { todos = []; } renderTodos(); });
  renderTodos();

  // ── Note ────────────────────────────────────────────────────────────────
  const noteEl = $('[data-space="note"]');
  noteEl.innerHTML = `<textarea class="note-area" data-note placeholder="A quick note. It saves as you type." spellcheck="true"></textarea><div class="note-foot"><span class="cnt-muted" data-note-count>0 words</span><button class="tool-link" data-note-copy>Copy</button></div>`;
  const area = noteEl.querySelector<HTMLTextAreaElement>('[data-note]')!;
  const count = noteEl.querySelector<HTMLElement>('[data-note-count]')!;
  let noteTimer: number | undefined;
  const words = () => { const n = area.value.trim() ? area.value.trim().split(/\s+/).length : 0; count.textContent = `${n} word${n === 1 ? '' : 's'}`; };
  area.addEventListener('input', () => { words(); clearTimeout(noteTimer); noteTimer = window.setTimeout(() => send('set-setting', 'note', area.value), 400); });
  noteEl.querySelector('[data-note-copy]')!.addEventListener('click', (e) => { e.stopPropagation(); void navigator.clipboard.writeText(area.value); });
  invoke('get-setting', 'note', '').then((v: string) => { area.value = v || ''; words(); });

  // ── Clipboard ───────────────────────────────────────────────────────────
  const clipEl = $('[data-space="clipboard"]');
  let clipState: { paused: boolean; items: Clip[] } = { paused: false, items: [] };
  let copied = 0;
  function renderClips() {
    const { paused, items } = clipState;
    clipEl.innerHTML = `
      <div class="clip-head">
        <span class="cnt-muted">${items.length ? `${items.length} recent item${items.length === 1 ? '' : 's'} · kept in memory only` : 'Copied text shows up here. Kept in memory only.'}</span>
        <div class="clip-actions">
          <button class="ibtn ibtn-sm" data-clip-pause title="${paused ? 'Resume' : 'Pause'} history">${svg(paused ? I.play : I.pause, 13)}</button>
          <button class="ibtn ibtn-sm" data-clip-clear title="Clear history">${svg(I.trash, 13)}</button>
        </div>
      </div>
      <div class="clip-list">
        ${paused ? '<p class="tool-empty">History is paused.</p>' : ''}
        ${items.map((c) => `
          <button class="clip${copied === c.id ? ' copied' : ''}" data-clip="${c.id}" title="Copy again">
            <span class="clip-text">${esc(c.text.replace(/\s+/g, ' ').slice(0, 160))}</span>
            <span class="clip-meta">${copied === c.id ? 'Copied' : ago(c.at)}</span>
            <span class="clip-del" data-clip-del="${c.id}" title="Remove">${svg('<path d="M17 7 7 17M7 7l10 10"/>', 12)}</span>
          </button>`).join('')}
      </div>`;
  }
  clipEl.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    e.stopPropagation();
    const del = t.closest<HTMLElement>('[data-clip-del]');
    if (del) { clipState = await invoke('clip:remove', Number(del.dataset.clipDel)); renderClips(); return; }
    if (t.closest('[data-clip-pause]')) { clipState = await invoke('clip:pause', !clipState.paused); renderClips(); return; }
    if (t.closest('[data-clip-clear]')) { clipState = await invoke('clip:clear'); renderClips(); return; }
    const item = t.closest<HTMLElement>('[data-clip]');
    if (item) { await invoke('clip:copy', Number(item.dataset.clip)); copied = Number(item.dataset.clip); renderClips(); setTimeout(() => { copied = 0; renderClips(); }, 1400); }
  });

  // ── Hardware ────────────────────────────────────────────────────────────
  const hwEl = $('[data-space="hardware"]');
  const history: number[] = [];
  function gauge(label: string, pct: number | null, sub: string, color: string) {
    const v = pct === null ? 0 : Math.min(100, Math.max(0, pct));
    const r = 22; const c = 2 * Math.PI * r;
    return `<div class="hw-gauge">
      <svg width="56" height="56" class="ring"><circle cx="28" cy="28" r="${r}" class="ring-track" stroke-width="5"/><circle cx="28" cy="28" r="${r}" class="ring-value" stroke-width="5" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}"/></svg>
      <b>${pct === null ? '—' : `${Math.round(v)}%`}</b><span>${label}</span><small>${sub}</small>
    </div>`;
  }
  function renderHw(h: any) {
    if (!h) { hwEl.innerHTML = '<p class="tool-empty">Reading hardware…</p>'; return; }
    if (typeof h.cpu === 'number') { history.push(h.cpu); if (history.length > 40) history.shift(); }
    const pts = history.map((v, k) => `${(k / 39) * 100},${30 - (v / 100) * 28}`).join(' ');
    const memPct = h.memTotal ? (h.memUsed / h.memTotal) * 100 : null;
    const diskPct = h.disk ? (h.disk.used / h.disk.size) * 100 : null;
    hwEl.innerHTML = `
      <div class="hw-gauges">
        ${gauge('CPU', h.cpu, h.temp ? `${h.temp}°C` : `${h.cores.length} threads`, '#5b8cff')}
        ${gauge('Memory', memPct, h.memTotal ? `${bytes(h.memUsed)} of ${bytes(h.memTotal)}` : '', '#3ddc97')}
        ${gauge('GPU', h.gpu && typeof h.gpu.load === 'number' ? h.gpu.load : null, h.gpu ? esc(String(h.gpu.name).replace(/\(R\)|\(TM\)|NVIDIA |AMD |Intel /gi, '').slice(0, 22)) : 'Not reported', '#ff9f43')}
        ${gauge('Disk', diskPct, h.disk ? `${bytes(h.disk.size - h.disk.used)} free` : '', '#c084fc')}
      </div>
      <div class="hw-bottom">
        <div class="hw-spark"><span class="cnt-muted">CPU, last 80 s</span><svg viewBox="0 0 100 32" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#5b8cff" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg></div>
        <div class="hw-net"><span class="cnt-muted">${h.net ? esc(h.net.name) : 'Network'}</span><b>↓ ${h.net ? rate(h.net.rx) : '—'}</b><b>↑ ${h.net ? rate(h.net.tx) : '—'}</b></div>
      </div>`;
  }
  let hwTimer: number | undefined;
  const sampleHw = async () => renderHw(await invoke('hw:sample').catch(() => null));
  renderHw(null);

  return {
    onSpace(name: string) {
      clearInterval(hwTimer);
      if (name === 'hardware') { void sampleHw(); hwTimer = window.setInterval(sampleHw, 2000); }
      if (name === 'clipboard') void invoke('clip:list').then((s: any) => { clipState = s; renderClips(); });
      if (name === 'todos') setTimeout(() => todosEl.querySelector<HTMLInputElement>('[data-todo-input]')?.focus(), 250);
      if (name === 'note') setTimeout(() => area.focus(), 250);
    },
    stop() { clearInterval(hwTimer); },
  };
}
