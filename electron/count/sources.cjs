'use strict';
/**
 * Count: finds the AI coding tools on this machine and reads the usage they
 * already log locally. Nothing is uploaded and nothing needs connecting.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const home = (...p) => path.join(os.homedir(), ...p);
const appData = (...p) => path.join(process.env.APPDATA || home('AppData', 'Roaming'), ...p);

const SOURCES = [
  { kind: 'claude-code', name: 'Claude Code', env: 'CLAUDE_CONFIG_DIR', roots: () => [home('.claude', 'projects'), home('.config', 'claude', 'projects'), appData('Claude', 'projects')] },
  { kind: 'codex', name: 'Codex', env: 'CODEX_HOME', roots: () => [home('.codex', 'sessions'), home('.codex', 'archived_sessions')] },
  {
    kind: 'cursor', name: 'Cursor', env: 'CURSOR_DATA_DIR', roots: () => [
      appData('Cursor', 'User', 'globalStorage', 'state.vscdb'),
      home('.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      home('Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
    ],
  },
  { kind: 'gemini-cli', name: 'Gemini CLI', env: 'GEMINI_DATA_DIR', roots: () => [home('.gemini', 'tmp')] },
  { kind: 'opencode', name: 'OpenCode', env: 'OPENCODE_DATA_DIR', roots: () => [home('.local', 'share', 'opencode')] },
  { kind: 'copilot', name: 'Copilot CLI', env: 'COPILOT_OTEL_DIR', roots: () => [home('.copilot', 'otel')] },
];

const NAMES = Object.fromEntries(SOURCES.map((s) => [s.kind, s.name]));

function roots(kind) {
  const def = SOURCES.find((s) => s.kind === kind);
  const env = process.env[def.env];
  if (env) {
    const base = env.split(',').map((s) => s.trim()).filter(Boolean);
    if (kind === 'claude-code') return base.map((b) => path.join(b, 'projects'));
    if (kind === 'codex') return base.map((b) => path.join(b, 'sessions'));
    return base;
  }
  return def.roots();
}

const exists = (f) => { try { return fs.existsSync(f); } catch { return false; } };

function walk(dir, match, out, depth = 0, budget = { n: 0 }) {
  if (depth > 8 || budget.n > 6000) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'bin') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full, match, out, depth + 1, budget); continue; }
    budget.n++;
    if (!match(e.name)) continue;
    try {
      const st = fs.statSync(full);
      if (st.size <= 60_000_000) out.push({ file: full, mtime: st.mtimeMs, size: st.size });
    } catch {}
  }
}

function listFiles(kind) {
  const out = [];
  for (const root of roots(kind)) {
    if (!exists(root)) continue;
    if (kind === 'cursor') {
      try { const st = fs.statSync(root); out.push({ file: root, mtime: st.mtimeMs, size: st.size }); } catch {}
      continue;
    }
    const match = kind === 'gemini-cli' ? (n) => n.startsWith('session-') && n.endsWith('.json')
      : kind === 'opencode' ? (n) => n.endsWith('.json') || n.endsWith('.db')
        : (n) => n.endsWith('.jsonl');
    walk(root, match, out);
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

function fingerprint(kind) {
  const files = listFiles(kind);
  let latest = 0; let size = 0;
  for (const f of files) { latest = Math.max(latest, f.mtime); size += f.size; }
  return `${files.length}:${Math.round(latest)}:${size}`;
}

function detect(hidden = []) {
  const found = [];
  for (const def of SOURCES) {
    if (hidden.includes(def.kind)) continue;
    const root = roots(def.kind).find(exists);
    if (!root) continue;
    const files = listFiles(def.kind);
    if (!files.length) continue;
    found.push({ kind: def.kind, name: def.name, path: root, lastActive: files[0].mtime });
  }
  return found;
}

async function* lines(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line || line.length < 2) continue;
    try {
      const v = JSON.parse(line);
      if (v && typeof v === 'object' && !Array.isArray(v)) yield v;
    } catch {}
  }
}

const rec = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const ts = (v, fb) => {
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  if (typeof v === 'string') { const p = Date.parse(v); if (Number.isFinite(p)) return p; }
  return fb;
};
const label = (v, fb) => String(v || fb).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120) || fb;
const projectOf = (cwd, fb) => (typeof cwd === 'string' && cwd ? path.basename(cwd) : fb);

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// USD per 1M tokens. Cache reads bill at roughly a tenth of input.
const PRICES = [
  [/gpt-4o-mini|gpt-4\.1-mini|gpt-5-mini|nano/i, 0.15, 0.6],
  [/gpt-4o|gpt-4\.1|gpt-5|chatgpt|codex/i, 1.25, 10],
  [/\bo1\b|\bo3\b|\bo4\b/i, 15, 60],
  [/haiku/i, 0.8, 4],
  [/opus/i, 15, 75],
  [/sonnet|claude/i, 3, 15],
  [/flash/i, 0.1, 0.4],
  [/gemini/i, 1.25, 10],
];
function cost(model, input, cache, output) {
  const row = PRICES.find(([re]) => re.test(model)) || [null, 3, 15];
  return (input * row[1] + cache * row[1] * 0.1 + output * row[2]) / 1e6;
}

function row(model, when, project, input, cache, output, exact = true) {
  return { day: dayKey(new Date(when)), at: when, model, project, input, cache, output, exact, usd: cost(model, input, cache, output) };
}

function claudeProject(file) {
  const parts = file.split(path.sep);
  const i = parts.lastIndexOf('projects');
  const seg = (i >= 0 ? parts[i + 1] || '' : '').split('-').filter(Boolean);
  return seg[seg.length - 1] || 'unknown';
}

async function scanClaude() {
  const rows = []; const seen = new Set();
  for (const item of listFiles('claude-code')) {
    const fb = claudeProject(item.file);
    for await (const r of lines(item.file)) {
      if (r.type === 'user') continue;
      const m = rec(r.message); const u = rec(m && m.usage);
      if (!m || !u || typeof u.input_tokens !== 'number') continue;
      if (m.model === '<synthetic>' || r.isApiErrorMessage) continue;
      const key = `${m.id || ''}:${r.requestId || ''}`;
      if (key !== ':' && seen.has(key)) continue;
      seen.add(key);
      const input = n(u.input_tokens) + n(u.cache_creation_input_tokens);
      const cache = n(u.cache_read_input_tokens);
      const output = n(u.output_tokens);
      if (!input && !cache && !output) continue;
      rows.push(row(label(m.model, 'claude'), ts(r.timestamp, item.mtime), projectOf(r.cwd, fb), input, cache, output));
    }
  }
  return rows;
}

async function scanCodex() {
  const rows = [];
  for (const item of listFiles('codex')) {
    let cwd = ''; let model = 'gpt-5';
    const exact = []; const fallback = [];
    for await (const r of lines(item.file)) {
      const p = rec(r.payload);
      if (!p) continue;
      if (r.type === 'session_meta' || r.type === 'turn_context') {
        if (typeof p.cwd === 'string') cwd = p.cwd;
        if (typeof p.model === 'string') model = p.model;
        continue;
      }
      const when = ts(r.timestamp, item.mtime);
      const push = (list, u) => {
        const cached = n(u.cached_input_tokens);
        list.push(row(model, when, projectOf(cwd, 'codex'), Math.max(0, n(u.input_tokens) - cached), cached, n(u.output_tokens)));
      };
      if (r.type === 'token_usage_record' && rec(p.usage)) push(exact, p.usage);
      else if (r.type === 'event_msg' && p.type === 'token_count') {
        const last = rec(rec(p.info) && p.info.last_token_usage);
        if (last) push(fallback, last);
      }
    }
    rows.push(...(exact.length ? exact : fallback));
  }
  return rows;
}

async function scanGemini() {
  const rows = [];
  for (const item of listFiles('gemini-cli')) {
    let data;
    try { data = rec(JSON.parse(fs.readFileSync(item.file, 'utf8'))); } catch { continue; }
    for (const m of (data && Array.isArray(data.messages) ? data.messages : [])) {
      const t = rec(m && m.tokens);
      if (!t) continue;
      const cache = n(t.cached);
      const input = Math.max(0, n(t.input) - cache);
      const output = n(t.output) + n(t.thoughts);
      if (!input && !output) continue;
      rows.push(row(label(m.model, 'gemini'), ts(m.timestamp, item.mtime), 'gemini', input, cache, output));
    }
  }
  return rows;
}

function scanCursor() {
  let Database;
  try { Database = require('better-sqlite3'); } catch { return []; }
  const rows = [];
  for (const item of listFiles('cursor')) {
    let db;
    try {
      db = new Database(item.file, { readonly: true, fileMustExist: true });
      const exact = new Map();
      for (const r of db.prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'").iterate()) {
        if (!r.value) continue;
        const text = typeof r.value === 'string' ? r.value : r.value.toString('utf8');
        if (!text.includes('"tokenCount"')) continue;
        try {
          const b = JSON.parse(text); const c = rec(b && b.tokenCount);
          if (!c || b.type !== 2 || (!n(c.inputTokens) && !n(c.outputTokens))) continue;
          const id = r.key.split(':')[1] || 'unknown';
          const prev = exact.get(id) || { i: 0, o: 0 };
          exact.set(id, { i: prev.i + n(c.inputTokens), o: prev.o + n(c.outputTokens) });
        } catch {}
      }
      for (const r of db.prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'").iterate()) {
        if (!r.value) continue;
        try {
          const d = JSON.parse(typeof r.value === 'string' ? r.value : r.value.toString('utf8'));
          const id = String(d.composerId || r.key.split(':')[1]);
          const when = n(d.lastUpdatedAt) || n(d.createdAt) || item.mtime;
          const model = label(rec(d.modelConfig) && d.modelConfig.modelName, 'cursor');
          const c = exact.get(id);
          if (c) { rows.push(row(model, when, 'cursor', c.i, 0, c.o)); continue; }
          const ctx = n(d.contextTokensUsed);
          if (ctx) rows.push(row(model, when, 'cursor', ctx, 0, 0, false));
        } catch {}
      }
    } catch {} finally { try { db && db.close(); } catch {} }
  }
  return rows;
}

async function scanOpenCode() {
  const rows = [];
  for (const item of listFiles('opencode')) {
    if (!item.file.includes(`${path.sep}message${path.sep}`)) continue;
    try {
      const d = rec(JSON.parse(fs.readFileSync(item.file, 'utf8'))); const t = rec(d && d.tokens);
      if (!t) continue;
      const cache = n(rec(t.cache) && t.cache.read);
      rows.push(row(label(d.modelID, 'opencode'), ts(rec(d.time) && d.time.created, item.mtime), projectOf(rec(d.path) && d.path.cwd, 'opencode'), n(t.input), cache, n(t.output)));
    } catch {}
  }
  return rows;
}

async function scanCopilot() {
  const rows = [];
  for (const item of listFiles('copilot')) {
    for await (const r of lines(item.file)) {
      const a = rec(r.attributes) || rec(r.Attributes);
      if (!a) continue;
      const i = n(a['gen_ai.usage.input_tokens']); const o = n(a['gen_ai.usage.output_tokens']);
      if (i || o) rows.push(row(label(a['gen_ai.response.model'], 'copilot'), ts(r.timestamp || r.Timestamp, item.mtime), 'copilot', i, 0, o));
    }
  }
  return rows;
}

async function scan(kind) {
  if (kind === 'claude-code') return scanClaude();
  if (kind === 'codex') return scanCodex();
  if (kind === 'gemini-cli') return scanGemini();
  if (kind === 'cursor') return scanCursor();
  if (kind === 'opencode') return scanOpenCode();
  return scanCopilot();
}

/** Codex writes its own rate-limit state into every session log. */
async function codexLimits() {
  let best = null;
  for (const item of listFiles('codex').slice(0, 3)) {
    for await (const r of lines(item.file)) {
      const p = rec(r.payload);
      if (r.type !== 'event_msg' || !p || p.type !== 'token_count') continue;
      const l = rec(p.rate_limits);
      if (!l) continue;
      const at = ts(r.timestamp, item.mtime);
      if (best && best.at >= at) continue;
      const win = (v) => {
        const w = rec(v);
        if (!w) return null;
        const reset = w.resets_at;
        return { usedPercent: Math.min(100, Math.max(0, n(w.used_percent))), resetsAt: typeof reset === 'number' ? reset * (reset > 1e12 ? 1 : 1000) : null };
      };
      best = { session: win(l.primary), weekly: win(l.secondary), at };
    }
    if (best) break;
  }
  return best;
}

/** Claude Code logs an API error line when the plan limit is hit. */
async function claudeLimitHit() {
  let hit = null;
  for (const item of listFiles('claude-code').slice(0, 4)) {
    if (Date.now() - item.mtime > 6 * 3600_000) continue;
    for await (const r of lines(item.file)) {
      if (!r.isApiErrorMessage) continue;
      const text = JSON.stringify(r.message || '').toLowerCase();
      if (!text.includes('limit')) continue;
      const at = ts(r.timestamp, item.mtime);
      if (Date.now() - at > 5 * 3600_000) continue;
      const m = /limit reached\|(\d{9,13})/.exec(text);
      const resetsAt = m ? Number(m[1]) * (m[1].length > 10 ? 1 : 1000) : null;
      if (!hit || at > hit.at) hit = { at, resetsAt };
    }
  }
  return hit;
}

function textOf(v) {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(textOf).filter(Boolean).join('\n');
  const r = rec(v);
  if (!r) return '';
  if (['text', 'input_text', 'output_text'].includes(r.type)) return textOf(r.text);
  if ('content' in r) return textOf(r.content);
  return '';
}
const clean = (v, max = 600) => v.replace(/\s+/g, ' ').trim().slice(0, max);

/** The latest session of a tool, so its work can be handed to another. */
async function latestSession(kind) {
  if (kind !== 'claude-code' && kind !== 'codex') return null;
  const item = listFiles(kind)[0];
  if (!item) return null;
  const ctx = { kind, file: item.file, cwd: null, prompts: [], lastReply: null, files: [], updatedAt: item.mtime };
  const touched = new Set();
  for await (const r of lines(item.file)) {
    if (kind === 'claude-code') {
      if (typeof r.cwd === 'string') ctx.cwd = r.cwd;
      const m = rec(r.message);
      if (!m) continue;
      if (r.type === 'user' && m.role === 'user' && !r.isMeta && !r.toolUseResult) {
        // Only what the person typed: a plain string or text blocks, never tool results.
        const blocks = Array.isArray(m.content) ? m.content : [m.content];
        if (blocks.some((x) => rec(x) && x.type === 'tool_result')) continue;
        const t = blocks.map((x) => (typeof x === 'string' ? x : rec(x) && x.type === 'text' ? x.text : '')).join(' ').trim();
        if (t && !t.startsWith('<') && !/^\[Request interrupted/.test(t)) ctx.prompts.push(clean(t));
      }
      if (r.type === 'assistant' && Array.isArray(m.content)) {
        for (const part of m.content) {
          const b = rec(part);
          if (b && b.type === 'text' && typeof b.text === 'string' && b.text.trim()) ctx.lastReply = clean(b.text, 1500);
          const inp = rec(b && b.input);
          if (b && b.type === 'tool_use' && inp && typeof inp.file_path === 'string') touched.add(inp.file_path);
        }
      }
      continue;
    }
    const p = rec(r.payload);
    if (!p) continue;
    if ((r.type === 'session_meta' || r.type === 'turn_context') && typeof p.cwd === 'string') ctx.cwd = p.cwd;
    if (r.type === 'event_msg' && p.type === 'user_message' && typeof p.message === 'string') ctx.prompts.push(clean(p.message));
    if (r.type === 'event_msg' && p.type === 'agent_message' && typeof p.message === 'string') ctx.lastReply = clean(p.message, 1500);
    if (r.type === 'event_msg' && p.type === 'patch_apply_end' && rec(p.changes)) Object.keys(p.changes).forEach((f) => touched.add(f));
    if (r.type === 'response_item' && (p.type === 'custom_tool_call' || p.type === 'function_call')) {
      const input = typeof p.input === 'string' ? p.input : typeof p.arguments === 'string' ? p.arguments : '';
      for (const m of input.matchAll(/\*\*\* (?:Update|Add|Delete) File: (.+)/g)) touched.add(m[1].trim());
    }
  }
  ctx.prompts = ctx.prompts.filter((p) => p.length > 1).slice(-8);
  ctx.files = [...touched].map((f) => (ctx.cwd && f.startsWith(ctx.cwd) ? path.relative(ctx.cwd, f) : f)).slice(-25);
  return ctx;
}

module.exports = { SOURCES, NAMES, detect, fingerprint, scan, codexLimits, claudeLimitHit, latestSession, dayKey };
