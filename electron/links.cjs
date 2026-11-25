'use strict';
/**
 * GitHub, Discord and LeetCode for the notch.
 * Reads public profiles only. Opens those apps through Electron, never inside the page.
 */
const { ipcMain, shell } = require('electron');
const { execFile } = require('child_process');

const GH_USER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const LC_USER = /^[A-Za-z0-9_-]{1,30}$/;
const INVITE = /^https:\/\/(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+$/;
const UA = 'Overlay/1.1 (desktop notch)';

const memory = new Map();

function remember(key, ttl, load) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
  return load().then((value) => {
    if (value && !value.error) memory.set(key, { at: Date.now(), value });
    return value;
  });
}

async function getText(url, headers) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(9000) });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

function parseContributions(html) {
  const totalMatch = html.match(/([\d,]+)\s+contributions/i);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : 0;
  const days = [];
  for (const block of html.split(/<td\b/i).slice(1)) {
    const head = block.slice(0, block.indexOf('>'));
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(head);
    if (!date) continue;
    const level = Number((/data-level="(\d)"/.exec(head) || [])[1] || 0);
    const inner = block.slice(block.indexOf('>') + 1, block.indexOf('</td>')).replace(/<[^>]+>/g, ' ');
    const num = /(\d+)\s+contribution/i.exec(inner);
    days.push({ date: date[1], level, count: num ? Number(num[1]) : (level > 0 ? 1 : 0) });
  }
  return { total, days };
}

async function github(user) {
  const name = String(user || '').trim();
  if (!GH_USER.test(name)) return { error: 'name' };
  return remember(`gh:${name.toLowerCase()}`, 10 * 60 * 1000, async () => {
    try {
      const res = await getText(`https://github.com/users/${name}/contributions`, { Accept: 'text/html' });
      if (res.status === 404) return { error: 'missing' };
      if (!res.ok) return { error: 'failed' };
      const parsed = parseContributions(res.text);
      if (!parsed.days.length) return { error: 'parse' };
      return { user: name, total: parsed.total, days: parsed.days };
    } catch {
      return { error: 'offline' };
    }
  });
}

async function leetcode(user) {
  const name = String(user || '').trim();
  if (!LC_USER.test(name)) return { error: 'name' };
  return remember(`lc:${name.toLowerCase()}`, 10 * 60 * 1000, async () => {
    try {
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
        body: JSON.stringify({
          query: `query overlay($username: String!) {
            matchedUser(username: $username) {
              submitStatsGlobal { acSubmissionNum { difficulty count } }
              userCalendar { streak totalActiveDays submissionCalendar }
            }
          }`,
          variables: { username: name },
        }),
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) return { error: 'failed' };
      const json = await res.json();
      const userData = json && json.data && json.data.matchedUser;
      if (!userData) return { error: 'missing' };
      const stats = (userData.submitStatsGlobal && userData.submitStatsGlobal.acSubmissionNum) || [];
      const pick = (label) => {
        const row = stats.find((s) => s.difficulty === label);
        return row ? row.count : 0;
      };
      const cal = userData.userCalendar || {};
      let raw = {};
      try { raw = JSON.parse(cal.submissionCalendar || '{}'); } catch { raw = {}; }
      const days = Object.entries(raw).map(([sec, count]) => {
        const n = Number(count) || 0;
        const date = new Date(Number(sec) * 1000).toISOString().slice(0, 10);
        const level = n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4;
        return { date, count: n, level };
      });
      return {
        user: name,
        streak: cal.streak || 0,
        active: cal.totalActiveDays || 0,
        solved: pick('All'),
        easy: pick('Easy'),
        medium: pick('Medium'),
        hard: pick('Hard'),
        days,
      };
    } catch {
      return { error: 'offline' };
    }
  });
}

function discordRunning() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) return resolve({ running: false });
      resolve({ running: /Discord(PTB|Canary)?\.exe/i.test(stdout) });
    });
  });
}

async function openLink(payload) {
  if (!payload || typeof payload !== 'object') return false;
  let url = '';
  if (payload.kind === 'github' && GH_USER.test(payload.user || '')) url = `https://github.com/${payload.user}`;
  else if (payload.kind === 'leetcode' && LC_USER.test(payload.user || '')) url = `https://leetcode.com/u/${encodeURIComponent(payload.user)}/`;
  else if (payload.kind === 'discord') url = 'discord://-/';
  else if (payload.kind === 'discord-web') url = 'https://discord.com/app';
  else if (payload.kind === 'discord-invite' && INVITE.test(payload.url || '')) url = payload.url;
  else return false;
  await shell.openExternal(url);
  return true;
}

function githubLogin() {
  return new Promise((resolve) => {
    execFile('gh', ['api', 'user', '--jq', '.login'], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      const name = String(stdout || '').trim();
      resolve(!err && GH_USER.test(name) ? name : '');
    });
  });
}

function init() {
  ipcMain.handle('links:github-login', () => githubLogin());
  ipcMain.handle('links:github', (_e, user) => github(user));
  ipcMain.handle('links:leetcode', (_e, user) => leetcode(user));
  ipcMain.handle('links:discord', () => discordRunning());
  ipcMain.handle('links:open', (_e, payload) => openLink(payload));
}

module.exports = { init };
