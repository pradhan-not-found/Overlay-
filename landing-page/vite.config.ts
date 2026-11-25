import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

type Entry = { date: string; title: string; points: string[] }

/**
 * The changelog page is built from the app's commit history at build time,
 * so it is always current and works with a private repository. Website-only
 * commits and internal lines are left out.
 */
function changelog(): Plugin {
  const id = 'virtual:changelog'
  const read = (): Entry[] => {
    try {
      const raw = execFileSync('git', ['log', '--no-merges', '-n', '80', '--date=short', '--pretty=format:%ad%x1f%s%x1f%b%x1e'], {
        cwd: resolve(here, '..'),
        encoding: 'utf8',
        maxBuffer: 4_000_000,
      })
      // Leave out anything internal: hosting, tooling, file names and code.
      const hidden = /github|youtube|cursor|co-authored|claude\.com|repo|\.cjs|\.ts\b|\.md\b|landing|electron|webutils|openpath|file\.path|\beval\b|[a-z]\.[a-z]+\(|\b[a-z]+[A-Z][a-zA-Z]+\b/
      return raw.split('\x1e').map((r) => r.trim()).filter(Boolean).map((r) => {
        const [date, title, body] = r.split('\x1f')
        const points: string[] = []
        let cur = ''
        for (const line of (body || '').split('\n')) {
          if (/^\s*-\s+/.test(line)) { if (cur) points.push(cur); cur = line.replace(/^\s*-\s+/, '') }
          else if (cur && line.trim()) cur += ' ' + line.trim()
        }
        if (cur) points.push(cur)
        return { date, title: title.trim().replace(/\.$/, ''), points: points.filter((p) => !hidden.test(p)).slice(0, 5) }
      }).filter((e) => !/^landing|^fix:|^feat:|^chore|^style|^revert|^refactor|^docs|^test|^ci\b|^wip|^merge|typescript|download|filename|waitlist|for build|beta access|beta tag|navbar|header|repos/i.test(e.title) && !hidden.test(e.title))
    } catch {
      return []
    }
  }
  return {
    name: 'overlay-changelog',
    resolveId: (s) => (s === id ? '\0' + id : null),
    load: (s) => (s === '\0' + id ? `export default ${JSON.stringify(read())}` : null),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), changelog()],
})
