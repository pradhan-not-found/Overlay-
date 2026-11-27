import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { seo } from './seo.plugin.ts'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))

type Entry = { date: string; title: string; points: string[]; version: string; size: 'launch' | 'big' | 'small'; count: number }

/**
 * The changelog page is built from the app's commit history at build time,
 * so it is always current and works with a private repository. Website-only
 * commits and internal lines are left out.
 */
function changelog(): Plugin {
  const id = 'virtual:changelog'
  // The release a change first shipped in; newer changes carry the app's current version.
  const current = (() => { try { return JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8')).version as string } catch { return 'Beta' } })()
  // Which release each commit first shipped in, worked out once from the tags.
  const releases = (cwd: string) => {
    const of = new Map<string, string>()
    try {
      const tags = execFileSync('git', ['tag', '--sort=creatordate'], { cwd, encoding: 'utf8' }).split('\n').map((t) => t.trim()).filter(Boolean)
      for (const tag of tags) {
        const revs = execFileSync('git', ['rev-list', tag], { cwd, encoding: 'utf8', maxBuffer: 8_000_000 }).split('\n').filter(Boolean)
        for (const h of revs) if (!of.has(h)) of.set(h, tag.replace(/^v/, ''))
      }
    } catch { /* no tags yet */ }
    return of
  }

  /**
   * The whole story, from the first commit: commits are grouped into working sessions (a gap of more
   * than 90 minutes starts a new one), each with a date, a headline, what changed and the release it
   * shipped in. Busy sessions and releases get a large picture, the rest a small one, and the very
   * first is the launch.
   */
  const read = (): Entry[] => {
    try {
      const cwd = resolve(here, '..')
      const raw = execFileSync('git', ['log', '--no-merges', '--reverse', '--date=iso-strict', '--pretty=format:%H%x1f%ad%x1f%s%x1f%b%x1e'], { cwd, encoding: 'utf8', maxBuffer: 16_000_000 })
      const shippedIn = releases(cwd)
      // Leave out anything internal: hosting, tooling, file names, keys and code.
      const hidden = /github|youtube|cursor agent|co-authored|claude\.com|\brepo|\.cjs|\.ts\b|\.md\b|webutils|openpath|file\.path|\beval\b|[a-z]\.[a-z]+\(|vercel|rewrite|workflow|runner|powershell|\bnpm\b|electron-builder|typescript|tsconfig|script url|apps script|\btoken\b|secret|\benv\b|gitignore|lockfile|merge branch|^wip\b|revert|\/api\/|^overlay \d|^\(?\d+\.\d+\.\d+\)?$/i
      // camelCase names are code; checked case-sensitively
      const code = /\b[a-z]+[A-Z][a-zA-Z]+\b/
      const isHidden = (t: string) => hidden.test(t) || code.test(t)
      const tidy = (t: string) => {
        let s = t.trim().replace(/\.$/, '')
          .replace(/^(feat|fix|style|chore|refactor|docs|perf|ui|build)(\([^)]*\))?\s*:\s*/i, '')
          .replace(/^(website|app|overlay|landing|notch)\s*:\s*/i, (m) => (/notch/i.test(m) ? 'Notch: ' : ''))
          .replace(/\s*Co-Authored-By:.*$/is, '').replace(/\s*Built with npm run build.*$/is, '').replace(/\s*\((?:a later|the old)[^)]*\)/gi, '')
        s = s.replace(/\s*\(\d+\.\d+\.\d+\)$/, '').replace(/\s+Build$/, '').replace(/^./, (c) => c.toUpperCase())
        return s
      }
      type C = { at: number; date: string; title: string; points: string[]; version: string }
      const commits: C[] = raw.split('\x1e').map((r) => r.trim()).filter(Boolean).map((r) => {
        const [hash, iso, title, body] = r.split('\x1f')
        const points: string[] = []
        let cur = ''
        for (const line of (body || '').split('\n')) {
          if (/^\s*-\s+/.test(line)) { if (cur) points.push(cur); cur = line.replace(/^\s*-\s+/, '') }
          else if (cur && line.trim()) cur += ' ' + line.trim()
        }
        if (cur) points.push(cur)
        return { at: Date.parse(iso), date: iso.slice(0, 10), title: tidy(title), points: points.map(tidy), version: shippedIn.get(hash) || current }
      })

      // Working sessions
      const sessions: C[][] = []
      for (const c of commits) {
        const last = sessions[sessions.length - 1]
        // a new session after 45 quiet minutes, on a new day, or once one holds 8 changes
        if (last && c.at - last[last.length - 1].at < 45 * 60_000 && c.date === last[0].date && last.length < 8) last.push(c)
        else sessions.push([c])
      }

      const entries: Entry[] = []
      sessions.forEach((group, n) => {
        const keep = group.filter((c) => c.title && !isHidden(c.title) && !/^initial commit$/i.test(c.title))
        if (!keep.length && n !== 0) return
        // the headline: the commit that says the most about this session
        const lead = [...keep].sort((a, b) => b.points.length - a.points.length || b.title.length - a.title.length)[0]
        const lines = [
          ...keep.filter((c) => c !== lead).map((c) => c.title),
          ...(lead ? lead.points : []),
        ].filter((p) => p && !isHidden(p))
        const seen = new Set<string>()
        const points = lines.filter((p) => { const k = p.toLowerCase().slice(0, 40); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 8)
        const first = n === 0
        const version = group[group.length - 1].version
        const released = n > 0 && sessions[n - 1][sessions[n - 1].length - 1].version !== version
        entries.push({
          date: group[0].date,
          title: first ? 'Overlay begins' : (lead?.title || 'Improvements'),
          points: first ? ['The first build of Overlay: a notch at the top of the Windows screen, its logo and a landing page.', ...points].slice(0, 6) : points,
          version,
          // a large picture for releases and the fullest sessions; a small screen for the rest
          size: first ? 'launch' : (released || (group.length >= 7 && points.length >= 6)) ? 'big' : 'small',
          count: group.length,
        })
      })
      return entries.reverse()
    } catch {
      return []
    }
  }
  // Hosts like Vercel clone only the last few commits, which would cut the story short. A full
  // local history refreshes a saved copy (src/changelog.json, committed); a shallow clone uses that
  // copy, plus any newer sessions it can see.
  const saved = resolve(here, 'src/changelog.json')
  // A hand-written changelog (src/releases.json) wins when present: clear, professional entries for
  // the features and fixes that matter, instead of raw commit messages.
  const curated = resolve(here, 'src/releases.json')
  const story = (): Entry[] => {
    try { const list = JSON.parse(readFileSync(curated, 'utf8')); if (Array.isArray(list) && list.length) return list } catch { /* none yet */ }
    let shallow = true
    try { shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: here, encoding: 'utf8' }).trim() === 'true' } catch { /* no git */ }
    const fresh = read()
    if (!shallow && fresh.length) { writeFileSync(saved, JSON.stringify(fresh, null, 1) + '\n'); return fresh }
    let kept: Entry[] = []
    try { kept = JSON.parse(readFileSync(saved, 'utf8')) } catch { /* none saved */ }
    const newest = kept[0]?.date || ''
    // newer days seen in the shallow clone go on top (the oldest one it sees may be partial, so skip it)
    const extra = fresh.filter((e) => e.date > newest && e.size !== 'launch')
    return [...extra, ...kept]
  }
  return {
    name: 'overlay-changelog',
    resolveId: (s) => (s === id ? '\0' + id : null),
    load: (s) => (s === '\0' + id ? `export default ${JSON.stringify(story())}` : null),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), changelog(), seo()],
})
