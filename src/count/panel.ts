import claudeCode from '../assets/logos/claudecode.png';
import cursorMark from '../assets/logos/cursor-mark.png';
import gemini from '../assets/logos/gemini.svg';
import github from '../assets/logos/github.svg';
import openai from '../assets/logos/openai.svg';
import opencode from '../assets/logos/opencode.png';
import { countMark, countTile } from './mark';

type Kind = 'claude-code' | 'codex' | 'cursor' | 'gemini-cli' | 'opencode' | 'copilot';

interface Limit { kind: Kind; source: string; label: string; usedPercent: number; resetsAt: number | null }
interface Source { kind: Kind; name: string; path: string; lastActive: number | null; today: number; todayUsd: number; week: number; weekUsd: number; month: number; estimated: boolean }
interface Tool { kind: Kind; name: string; command: string | null; loggedIn: boolean; ready: boolean }
interface Snapshot {
  today: number; week: number; prevWeek: number; month: number; monthUsd: number;
  daily: { day: string; parts: Partial<Record<Kind, number>> }[];
  sources: Source[];
  models: { model: string; kind: Kind; tokens: number }[];
  limits: Limit[];
  tools: Tool[];
  current: Kind | null;
  next: Kind | null;
  lastSwitch: { at: number; from: Kind; to: Kind; project: string | null; file: string | null; reason: string; launched: boolean } | null;
  settings: { autoSwitch: boolean; switchAt: number; writeContextFile: boolean };
  syncing: boolean;
}

const NAMES: Record<Kind, string> = {
  'claude-code': 'Claude Code', codex: 'Codex', cursor: 'Cursor', 'gemini-cli': 'Gemini CLI', opencode: 'OpenCode', copilot: 'Copilot CLI',
};
// Transparent marks; `invert` turns a black mark white on the dark notch.
const LOGOS: Record<Kind, { src: string; invert: boolean }> = {
  'claude-code': { src: claudeCode, invert: false },
  codex: { src: openai, invert: true },
  cursor: { src: cursorMark, invert: false },
  'gemini-cli': { src: gemini, invert: false },
  opencode: { src: opencode, invert: true },
  copilot: { src: github, invert: true },
};
const COLORS: Record<Kind, string> = {
  'claude-code': '#d97757', codex: '#10a37f', cursor: '#9a9aa6', 'gemini-cli': '#8e75b2', opencode: '#f5a524', copilot: '#8b5cf6',
};

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const logo = (kind: Kind, size = 16) =>
  `<img class="tool-logo${LOGOS[kind].invert ? ' invert' : ''}" src="${LOGOS[kind].src}" width="${size}" height="${size}" alt="${NAMES[kind]}" draggable="false">`;

function tokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '')}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace(/\.?0+$/, '')}M`;
  return `${(n / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`;
}
const money = (usd: number) => usd.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: usd >= 100 ? 0 : 2 });
function until(ts: number | null): string {
  if (!ts) return '';
  const m = Math.max(0, Math.floor((ts - Date.now()) / 60000));
  const h = Math.floor(m / 60); const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}
function ago(ts: number | null): string {
  if (!ts) return 'never';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
const tone = (pct: number, at: number) => (pct >= at ? 'var(--red)' : pct >= at - 20 ? 'var(--amber)' : 'var(--accent)');

function grouped(limits: Limit[]): { kind: Kind; items: Limit[]; peak: number }[] {
  const map = new Map<Kind, Limit[]>();
  for (const l of limits) map.set(l.kind, [...(map.get(l.kind) || []), l]);
  return [...map.entries()].map(([kind, items]) => ({ kind, items, peak: Math.max(...items.map((i) => i.usedPercent)) }));
}

let snap: Snapshot | null = null;
let busy = false;
let note: string | null = null;
let ctx: { sidebar: HTMLElement; space: HTMLElement; openSidebar: () => void; close: () => void; invoke: (ch: string, ...a: any[]) => Promise<any> } | null = null;

const cleanErr = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

async function load() {
  if (!ctx) return;
  try { snap = await ctx.invoke('count:snapshot'); } catch { /* engine not ready */ }
  render();
}

async function continueIn() {
  if (!ctx || !snap || busy) return;
  busy = true; note = null; render();
  try {
    const r = await ctx.invoke('count:continue', snap.current, snap.next);
    note = `Opened ${NAMES[r.to as Kind]} with your context${r.file ? `, saved in ${r.file.split(/[\\/]/).pop()}` : ''}.`;
  } catch (e) {
    note = cleanErr(e);
  } finally {
    busy = false; await load();
  }
}

function continueButton(s: Snapshot, compact = false): string {
  if (!s.current || !s.next) {
    return `<p class="cnt-muted">${s.sources.length ? 'Install a second AI tool to hand work between them.' : 'No AI tools found yet.'}</p>`;
  }
  const ready = s.tools.find((t) => t.kind === s.next)?.ready;
  return `
    <button class="cnt-continue${busy ? ' busy' : ''}" data-act="continue" ${busy ? 'disabled' : ''}>
      ${busy ? countMark(14, '#fff', true) : logo(s.next, 16)}
      <span>${busy ? 'Preparing your context…' : `Continue in ${NAMES[s.next]}`}</span>
      ${busy ? '' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cnt-arrow"><path d="M7 17 17 7M8 7h9v9"/></svg>'}
    </button>
    ${compact ? '' : `<p class="cnt-caption">${ready ? `Opens ${NAMES[s.next]} in a terminal in your project, already holding your prompts, files and git status.` : `${NAMES[s.next]} isn't signed in or installed as a CLI, so your context is copied instead.`}</p>`}`;
}

/** Session nested inside the weekly limit: two concentric rings. */
function nestedRing(session: number, week: number, size = 34): string {
  const ring = (r: number, pct: number, color: string, w: number) => {
    const c = 2 * Math.PI * r;
    return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="${w}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(100, pct) / 100)}" class="ring-value"/>`;
  };
  return `<svg class="ring" width="${size}" height="${size}">${ring(size / 2 - 2, week, '#8fa8ff', 3)}${ring(size / 2 - 7, session, 'var(--amber)', 3)}</svg>`;
}

function renderOverviewChip(s: Snapshot) {
  const el = document.getElementById('ov-ai');
  if (!el) return;
  const g = grouped(s.limits).sort((a, b) => b.peak - a.peak)[0];
  if (!g) { el.innerHTML = `${countMark(16, '#fff')}<span><b>${tokens(s.today)}</b><small>tokens today</small></span>`; return; }
  const session = g.items.find((i) => i.label === 'Session')?.usedPercent ?? 0;
  const week = g.items.find((i) => i.label === 'Weekly')?.usedPercent ?? 0;
  el.innerHTML = `<div class="ov-ai-ring">${nestedRing(session, week, 38)}<span>${logo(g.kind, 14)}</span></div><span><b>${Math.round(session)}% · ${Math.round(week)}%</b><small>${NAMES[g.kind]} session · week</small></span>`;
}

function renderSpace(s: Snapshot) {
  renderOverviewChip(s);
  const byKind = new Map(grouped(s.limits).map((g) => [g.kind, g]));
  const cards = s.sources.filter((src) => src.kind !== 'copilot' || src.month > 0).slice(0, 3);
  ctx!.space.innerHTML = `
    <div class="ai-cards">
      ${cards.length ? cards.map((src) => {
        const g = byKind.get(src.kind);
        return `
        <div class="ai-card${src.kind === s.current ? ' current' : ''}">
          <div class="ai-head">${logo(src.kind, 16)}<b>${NAMES[src.kind]}</b>${src.kind === s.current ? '<span class="pill-tag">In use</span>' : ''}</div>
          <div class="ai-limits">
            ${g ? g.items.map((l) => `
              <div class="ai-limit">
                <div class="ai-row"><span>${l.label === 'Weekly' ? 'Week' : l.label}</span><b>${Math.round(l.usedPercent)} %</b></div>
                <div class="cnt-bar"><i style="width:${Math.min(100, l.usedPercent)}%;background:${l.usedPercent >= s.settings.switchAt - 20 ? tone(l.usedPercent, s.settings.switchAt) : '#d9dbe4'}"></i></div>
                <div class="ai-row dim"><span>${l.resetsAt ? `in ${until(l.resetsAt)}` : ''}</span><span>${Math.max(0, 100 - Math.round(l.usedPercent))} % left</span></div>
              </div>`).join('') : `<p class="cnt-muted">No plan limit reported. Usage below is read from local logs.</p>`}
          </div>
          <div class="ai-foot">
            <div><span>Today</span><span>${tokens(src.today)}</span><b>${money(src.todayUsd)}</b></div>
            <div><span>7 days</span><span>${tokens(src.week)}</span><b>${money(src.weekUsd)}</b></div>
          </div>
        </div>`;
      }).join('') : '<p class="cnt-muted">No AI tools found yet. Overlay watches for Claude Code, Codex, Cursor, Gemini CLI, OpenCode and Copilot.</p>'}
    </div>
    <div class="ai-actions">
      ${continueButton(s, true)}
      <button class="cnt-ghost" data-act="sidebar" title="Open AI Usage in the Dashboard">Open in Dashboard</button>
    </div>
    ${note ? `<p class="cnt-note">${esc(note)}</p>` : ''}`;
}

function renderSidebar(s: Snapshot) {
  const groups = grouped(s.limits);
  const peak = Math.max(1, ...s.daily.map((d) => Object.values(d.parts).reduce((a, b) => a + (b || 0), 0)));
  const current = s.sources.find((x) => x.kind === s.current);
  const live = current && Date.now() - (current.lastActive || 0) < 10 * 60_000;
  const trend = s.prevWeek > 0 ? Math.round(((s.week - s.prevWeek) / s.prevWeek) * 100) : null;
  ctx!.sidebar.innerHTML = `
    <header class="cnt-head">
      ${countTile(28)}
      <div class="cnt-title"><b>Count</b><span>AI usage on this PC</span></div>
      <button class="ibtn ibtn-sm" data-act="refresh" title="Rescan">${s.syncing ? countMark(14, 'currentColor', true) : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5"/></svg>'}</button>
      <button class="ibtn ibtn-sm" data-act="close" title="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 7 7 17M7 7l10 10"/></svg>
      </button>
    </header>

    <div class="cnt-scroll">
      <section class="cnt-hero">
        <div><p class="p-label">Today</p><span class="cnt-big">${tokens(s.today)}</span><span class="cnt-unit">tokens</span></div>
        <div class="cnt-hero-side">
          <div><small>7 days</small><b>${tokens(s.week)}</b>${trend === null ? '' : `<em class="${trend >= 0 ? 'up' : 'down'}">${trend >= 0 ? '↑' : '↓'}${Math.abs(trend)}%</em>`}</div>
          <div><small>This month</small><b>${money(s.monthUsd)}</b><em>est. at API prices</em></div>
        </div>
      </section>

      <section class="cnt-card">
        <div class="cnt-card-head"><p class="p-label">Right now</p>${s.lastSwitch ? `<span class="cnt-muted">Last handoff ${ago(s.lastSwitch.at)}</span>` : ''}</div>
        ${current ? `
          <div class="cnt-now">
            <span class="cnt-now-logo">${logo(current.kind, 22)}</span>
            <div><b>${current.name}</b><span class="cnt-muted">${live ? '<i class="live"></i>Active now' : `Last used ${ago(current.lastActive)}`}</span></div>
          </div>` : ''}
        ${continueButton(s)}
        ${note ? `<p class="cnt-note">${esc(note)}</p>` : ''}
      </section>

      <section class="cnt-card">
        <div class="cnt-card-head"><p class="p-label">Plan limits</p><span class="cnt-muted">${s.settings.autoSwitch ? `Auto-switch at ${s.settings.switchAt}%` : 'Auto-switch off'}</span></div>
        ${groups.length ? groups.map((g) => `
          <div class="cnt-limit">
            <div class="cnt-limit-head">${logo(g.kind, 16)}<b>${NAMES[g.kind]}</b>${g.kind === s.current ? '<span class="pill-tag">In use</span>' : ''}</div>
            ${g.items.map((l) => `
              <div class="cnt-bar-row">
                <span>${l.label}</span>
                <div class="cnt-bar"><i style="width:${Math.min(100, l.usedPercent)}%;background:${tone(l.usedPercent, s.settings.switchAt)}"></i></div>
                <b>${Math.round(l.usedPercent)}%</b>
                <small>${until(l.resetsAt)}</small>
              </div>`).join('')}
          </div>`).join('') : '<p class="cnt-muted">Session and weekly limits appear once Claude Code or Codex has run on this machine.</p>'}
      </section>

      <section class="cnt-card">
        <div class="cnt-card-head"><p class="p-label">Last 30 days</p><span class="cnt-muted">${tokens(s.month)} this month</span></div>
        <div class="cnt-chart">
          ${s.daily.map((d) => {
            const total = Object.values(d.parts).reduce((a, b) => a + (b || 0), 0);
            const parts = (Object.entries(d.parts) as [Kind, number][]).map(([k, v]) => `<i style="flex:${v};background:${COLORS[k]}"></i>`).join('');
            return `<div class="cnt-col" title="${d.day} · ${tokens(total)}"><div class="cnt-stack" style="height:${total ? Math.max(4, (total / peak) * 100) : 0}%">${parts}</div></div>`;
          }).join('')}
        </div>
      </section>

      <section class="cnt-card">
        <div class="cnt-card-head"><p class="p-label">Sources</p><span class="cnt-muted">found automatically</span></div>
        ${s.sources.length ? s.sources.map((src) => `
          <div class="cnt-src">
            ${logo(src.kind, 18)}
            <div class="cnt-src-main">
              <div class="cnt-src-top"><b>${src.name}</b><span>${tokens(src.month)}${src.estimated ? '<sup title="Estimated: this tool does not store exact counts">≈</sup>' : ''}</span></div>
              <div class="cnt-bar thin"><i style="width:${s.month ? (src.month / s.month) * 100 : 0}%;background:${COLORS[src.kind]}"></i></div>
            </div>
          </div>`).join('') : '<p class="cnt-muted">Watching for Claude Code, Codex, Cursor, Gemini CLI, OpenCode and Copilot.</p>'}
      </section>

      ${s.models.length ? `
      <section class="cnt-card">
        <div class="cnt-card-head"><p class="p-label">Top models</p><span class="cnt-muted">this month</span></div>
        ${s.models.map((m) => `<div class="cnt-model">${logo(m.kind, 14)}<code>${esc(m.model)}</code><span>${tokens(m.tokens)}</span></div>`).join('')}
      </section>` : ''}

      <section class="cnt-card">
        <p class="p-label">Automatic switching</p>
        <label class="cnt-toggle"><span><b>Hand off when a limit runs out</b><small>Prepares your context for the tool with the most headroom, then notifies you.</small></span>
          <input type="checkbox" data-set="autoSwitch" ${s.settings.autoSwitch ? 'checked' : ''}><i></i></label>
        <label class="cnt-toggle"><span><b>Write it into the project</b><small>When you click Continue, a marked block goes into CLAUDE.md or AGENTS.md, replaced each time.</small></span>
          <input type="checkbox" data-set="writeContextFile" ${s.settings.writeContextFile ? 'checked' : ''}><i></i></label>
        <label class="cnt-select"><span>Switch at</span>
          <select data-set="switchAt">${[80, 85, 90, 95, 100].map((v) => `<option value="${v}" ${v === s.settings.switchAt ? 'selected' : ''}>${v}% used</option>`).join('')}</select></label>
      </section>
      <p class="cnt-foot">Read from local logs. Nothing leaves this machine.</p>
    </div>`;
}

function render() {
  if (!ctx) return;
  if (!snap) {
    const loading = `<div class="cnt-loading">${countMark(22, '#fff', true)}<span>Reading your AI tools…</span></div>`;
    ctx.sidebar.innerHTML = loading;
    ctx.space.innerHTML = loading;
    return;
  }
  renderSpace(snap);
  renderSidebar(snap);
}

function wire(root: HTMLElement) {
  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !ctx) return;
    e.stopPropagation();
    const act = el.dataset.act;
    if (act === 'continue') void continueIn();
    if (act === 'sidebar') ctx.openSidebar();
    if (act === 'close') ctx.close();
    if (act === 'refresh') { if (snap) snap.syncing = true; render(); void ctx.invoke('count:refresh').then(load); }
  });
  root.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const key = el.dataset.set;
    if (!key || !ctx) return;
    const value = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : Number(el.value);
    void ctx.invoke('count:settings', { [key]: value }).then((s: Snapshot) => { snap = s; render(); });
  });
}

export function mountCount(options: {
  sidebar: HTMLElement; space: HTMLElement; openSidebar: () => void; close: () => void;
  invoke: (ch: string, ...a: any[]) => Promise<any>; on: (ch: string, fn: () => void) => void;
}) {
  ctx = options;
  wire(options.sidebar);
  wire(options.space);
  options.on('count:update', () => void load());
  render();
  void load();
  // Keep reset countdowns fresh.
  setInterval(() => { if (snap) render(); }, 60_000);
}

export function openCountSpace() {
  void load();
}
