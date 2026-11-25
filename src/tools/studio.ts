// Terminal, units, water, habits, scratchpad and a prompter. Each one does the thing on this PC.

type Invoke = (ch: string, ...a: any[]) => Promise<any>;
type Send = (ch: string, ...a: any[]) => void;

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function readJSON<T>(invoke: Invoke, key: string, fallback: T): Promise<T> {
  try {
    const v = await invoke('get-setting', key, '');
    return v ? JSON.parse(v) as T : fallback;
  } catch { return fallback; }
}

const LENGTH: Record<string, number> = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254, yd: 0.9144 };
const MASS: Record<string, number> = { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523125 };

function convert(value: number, from: string, to: string): string {
  if (from === to) return String(value);
  if ((from === 'C' || from === 'F') && (to === 'C' || to === 'F')) {
    const c = from === 'F' ? (value - 32) * 5 / 9 : value;
    const out = to === 'F' ? c * 9 / 5 + 32 : c;
    return trim(out);
  }
  const table = LENGTH[from] && LENGTH[to] ? LENGTH : MASS[from] && MASS[to] ? MASS : null;
  if (!table) return '';
  return trim((value * table[from]) / table[to]);
}
const trim = (n: number) => String(Math.round(n * 1e6) / 1e6);

export function mountStudio(opts: { invoke: Invoke; send: Send }) {
  const { invoke, send } = opts;
  const term = document.querySelector<HTMLElement>('[data-space="terminal"]');
  const conv = document.querySelector<HTMLElement>('[data-space="convert"]');
  const water = document.querySelector<HTMLElement>('[data-space="water"]');
  const habits = document.querySelector<HTMLElement>('[data-space="habits"]');
  const scratch = document.querySelector<HTMLElement>('[data-space="scratch"]');
  const prompt = document.querySelector<HTMLElement>('[data-space="prompter"]');
  if (!term || !conv || !water || !habits || !scratch || !prompt) return { onSpace(_name: string) {} };

  // ── Terminal: one PowerShell session, same folder and variables between lines ─
  let cwd = '';
  let busy = false;
  const history: string[] = [];
  let histAt = -1;
  const draft = { value: '' };
  const lines: { kind: 'in' | 'out' | 'err'; text: string }[] = [];
  term.innerHTML = `<div class="term">
    <div class="term-bar"><i></i><b>PowerShell</b></div>
    <div class="term-log" data-log></div>
    <form class="term-form">
      <span class="term-ps">PS</span>
      <span data-cwd></span>
      <input data-cmd spellcheck="false" autocomplete="off" aria-label="PowerShell"/>
    </form>
  </div>`;
  const log = term.querySelector<HTMLElement>('[data-log]')!;
  const cwdEl = term.querySelector<HTMLElement>('[data-cwd]')!;
  const cmd = term.querySelector<HTMLInputElement>('[data-cmd]')!;
  const shortPath = (p: string) => (p || '~').replace(/^C:\\Users\\[^\\]+/i, '~');
  const paint = () => {
    cwdEl.textContent = shortPath(cwd);
    log.innerHTML = lines.map((l) => `<div class="term-${l.kind}">${esc(l.text)}</div>`).join('')
      || '<div class="term-out dim">Session is ready. Folder and variables stay between commands.</div>';
    log.scrollTop = log.scrollHeight;
    cmd.disabled = busy;
  };
  void invoke('term:cwd').then((v: string) => { cwd = v || ''; paint(); });
  cmd.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    if (!history.length) return;
    if (e.key === 'ArrowUp') {
      if (histAt < 0) draft.value = cmd.value;
      histAt = Math.min(history.length - 1, histAt < 0 ? 0 : histAt + 1);
      cmd.value = history[history.length - 1 - histAt] || '';
    } else {
      histAt = Math.max(-1, histAt - 1);
      cmd.value = histAt < 0 ? draft.value : history[history.length - 1 - histAt] || '';
    }
  });
  term.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = cmd.value;
    if (!text.trim() || busy) return;
    if (/^(cls|clear)$/i.test(text.trim())) {
      lines.length = 0;
      history.push(text.trim());
      histAt = -1;
      cmd.value = '';
      paint();
      return;
    }
    history.push(text);
    histAt = -1;
    cmd.value = '';
    lines.push({ kind: 'in', text: `PS ${shortPath(cwd)}> ${text}` });
    busy = true;
    paint();
    void invoke('term:run', text).then((res: { cwd?: string; out?: string; err?: string }) => {
      busy = false;
      cwd = res?.cwd || cwd;
      if (res?.out) lines.push({ kind: 'out', text: res.out });
      if (res?.err) lines.push({ kind: 'err', text: res.err });
      paint();
      cmd.focus();
    });
  });

  // ── Units ───────────────────────────────────────────────────────────────
  const groups: Record<string, string[]> = {
    Length: ['m', 'km', 'cm', 'mm', 'mi', 'ft', 'in', 'yd'],
    Weight: ['kg', 'g', 'lb', 'oz'],
    Temperature: ['C', 'F'],
  };
  let group = 'Length';
  const unitOpts = (list: string[], pick: string) => list.map((u) => `<option${u === pick ? ' selected' : ''}>${u}</option>`).join('');
  const swapMark = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8h11M15 5l3 3-3 3M17 16H6M9 13l-3 3 3 3"/></svg>`;
  const paintConv = () => {
    const list = groups[group];
    conv.innerHTML = `<div class="link-panel">
      <div class="seg">${Object.keys(groups).map((name) => `<button type="button" class="${name === group ? 'on' : ''}" data-group="${name}">${name}</button>`).join('')}</div>
      <div class="conv-row">
        <label class="conv-field">
          <input data-value inputmode="decimal" value="1" aria-label="Amount"/>
          <select data-from aria-label="From">${unitOpts(list, list[0])}</select>
        </label>
        <button class="conv-swap" type="button" data-swap aria-label="Swap units">${swapMark}</button>
        <label class="conv-field out">
          <span class="conv-out" data-result></span>
          <select data-to aria-label="To">${unitOpts(list, list[1] || list[0])}</select>
        </label>
      </div>
    </div>`;
    runConv();
  };
  const runConv = () => {
    const valueEl = conv.querySelector<HTMLInputElement>('[data-value]');
    const fromEl = conv.querySelector<HTMLSelectElement>('[data-from]');
    const toEl = conv.querySelector<HTMLSelectElement>('[data-to]');
    const outEl = conv.querySelector('[data-result]');
    if (!valueEl || !fromEl || !toEl || !outEl) return;
    const value = Number(valueEl.value);
    const out = Number.isFinite(value) ? convert(value, fromEl.value, toEl.value) : '';
    outEl.textContent = out || '—';
  };
  conv.addEventListener('input', runConv);
  conv.addEventListener('change', runConv);
  conv.addEventListener('click', (e) => {
    const g = (e.target as HTMLElement).closest<HTMLElement>('[data-group]');
    if (g?.dataset.group && groups[g.dataset.group]) { group = g.dataset.group; paintConv(); return; }
    if ((e.target as HTMLElement).closest('[data-swap]')) {
      const fromEl = conv.querySelector<HTMLSelectElement>('[data-from]');
      const toEl = conv.querySelector<HTMLSelectElement>('[data-to]');
      if (!fromEl || !toEl) return;
      const next = fromEl.value;
      fromEl.value = toEl.value;
      toEl.value = next;
      runConv();
    }
  });
  paintConv();

  // ── Water ───────────────────────────────────────────────────────────────
  let glasses = 0;
  let goal = 8;
  const waterKey = () => `water:${dayKey()}`;
  const paintWater = () => {
    water.innerHTML = `<div class="link-panel">
      <div class="link-top">
        <div class="link-id"><b>Water</b><span>${glasses} of ${goal} glasses today</span></div>
      </div>
      <div class="water-row">${Array.from({ length: goal }, (_, i) => `<button type="button" class="water-glass${i < glasses ? ' full' : ''}" data-glass="${i}" title="${i < glasses ? 'Remove this glass' : 'Add a glass'}" aria-label="Glass ${i + 1}"><svg viewBox="0 0 32 44" aria-hidden="true"><path class="glass" d="M9 5.5h14l-1.5 27.2A5.4 5.4 0 0 1 16.1 38h-.2a5.4 5.4 0 0 1-5.4-5.3L9 5.5Z"/><path class="pour" d="M10.4 16.5h11.1L20.2 31a3.6 3.6 0 0 1-3.5 2.8h-.4a3.6 3.6 0 0 1-3.5-2.8l-2.4-14.5Z"/></svg></button>`).join('')}</div>
      <div class="link-actions">
        <button class="btn btn-p" type="button" data-add>Add a glass</button>
        <button class="btn btn-g" type="button" data-sub>Undo</button>
      </div>
    </div>`;
  };
  const saveWater = () => { send('set-setting', waterKey(), String(glasses)); send('set-setting', 'waterGoal', String(goal)); paintWater(); };
  water.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-add]')) { glasses = Math.min(goal, glasses + 1); saveWater(); }
    else if (t.closest('[data-sub]')) { glasses = Math.max(0, glasses - 1); saveWater(); }
    else if (t.closest('[data-glass]')) {
      const i = Number((t.closest('[data-glass]') as HTMLElement).dataset.glass);
      glasses = i < glasses ? i : i + 1;
      saveWater();
    }
  });

  // ── Habits ──────────────────────────────────────────────────────────────
  type Habit = { id: string; name: string; days: string[] };
  let habitList: Habit[] = [];
  const paintHabits = () => {
    const today = dayKey();
    habits.innerHTML = `<div class="link-panel">
      <div class="habit-list">${habitList.map((h) => {
        const on = h.days.includes(today);
        let streak = 0;
        const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
        if (!on) cursor.setDate(cursor.getDate() - 1);
        while (h.days.includes(dayKeyFrom(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
        return `<button type="button" class="habit${on ? ' on' : ''}" data-habit="${h.id}"><b>${esc(h.name)}</b><span>${on ? 'Done' : 'Today'} · ${streak}d</span></button>`;
      }).join('') || '<p class="link-lead">Add a habit. Checking it records today on this PC.</p>'}</div>
      <form class="link-user" data-habit-form>
        <input data-habit-name placeholder="Habit name" maxlength="40"/>
        <button class="btn btn-g" type="submit">Add</button>
      </form>
    </div>`;
  };
  const saveHabits = () => { send('set-setting', 'habits', JSON.stringify(habitList)); paintHabits(); };
  habits.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = habits.querySelector<HTMLInputElement>('[data-habit-name]');
    const name = input?.value.trim();
    if (!name) return;
    habitList.push({ id: Math.random().toString(36).slice(2, 8), name, days: [] });
    saveHabits();
  });
  habits.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-habit]');
    if (!row) return;
    const h = habitList.find((x) => x.id === row.dataset.habit);
    if (!h) return;
    const today = dayKey();
    h.days = h.days.includes(today) ? h.days.filter((d) => d !== today) : [...h.days, today];
    saveHabits();
  });

  // ── Scratchpad ──────────────────────────────────────────────────────────
  scratch.innerHTML = `<div class="link-panel"><textarea class="scratch" data-scratch spellcheck="false" placeholder="Code and notes stay on this PC."></textarea></div>`;
  const area = scratch.querySelector<HTMLTextAreaElement>('[data-scratch]')!;
  let scratchTimer: ReturnType<typeof setTimeout> | undefined;
  area.addEventListener('input', () => {
    clearTimeout(scratchTimer);
    scratchTimer = setTimeout(() => send('set-setting', 'scratchpad', area.value), 250);
  });

  // ── Prompter ────────────────────────────────────────────────────────────
  prompt.innerHTML = `<div class="link-panel">
    <div class="prompt-stage" data-stage><div data-script>Paste a script, then start.</div></div>
    <div class="link-actions">
      <button class="btn btn-p" type="button" data-play>Start</button>
      <label class="prompt-speed">Speed <input type="range" min="8" max="80" value="28" data-speed/></label>
    </div>
    <textarea class="scratch short" data-prompt placeholder="The words to read."></textarea>
  </div>`;
  const stage = prompt.querySelector<HTMLElement>('[data-script]')!;
  const scriptBox = prompt.querySelector<HTMLTextAreaElement>('[data-prompt]')!;
  let playing = false;
  let offset = 0;
  let last = 0;
  let raf = 0;
  const frame = (now: number) => {
    if (!playing) return;
    const speed = Number(prompt.querySelector<HTMLInputElement>('[data-speed]')!.value);
    if (last) offset += ((now - last) / 1000) * speed;
    last = now;
    stage.style.transform = `translateY(${-offset}px)`;
    raf = requestAnimationFrame(frame);
  };
  prompt.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('[data-play]')) return;
    playing = !playing;
    const btn = prompt.querySelector('[data-play]')!;
    btn.textContent = playing ? 'Pause' : 'Start';
    if (playing) {
      stage.textContent = scriptBox.value || 'Nothing to read yet.';
      last = 0;
      raf = requestAnimationFrame(frame);
    } else cancelAnimationFrame(raf);
  });
  scriptBox.addEventListener('input', () => {
    if (!playing) stage.textContent = scriptBox.value || 'Paste a script, then start.';
    send('set-setting', 'prompter', scriptBox.value);
  });

  void (async () => {
    glasses = Number(await invoke('get-setting', waterKey(), '0')) || 0;
    goal = Number(await invoke('get-setting', 'waterGoal', '8')) || 8;
    paintWater();
    habitList = await readJSON(invoke, 'habits', []);
    paintHabits();
    area.value = String(await invoke('get-setting', 'scratchpad', '') || '');
    scriptBox.value = String(await invoke('get-setting', 'prompter', '') || '');
    if (scriptBox.value) stage.textContent = scriptBox.value;
  })();

  return {
    onSpace(name: string) {
      if (name === 'terminal') setTimeout(() => cmd.focus(), 220);
      if (name === 'scratch') setTimeout(() => area.focus(), 220);
    },
  };
}

function dayKeyFrom(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
