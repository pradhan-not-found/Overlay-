import type { Plugin } from 'vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
type Page = { path: string; title: string; description: string }
type Seo = { name: string; tagline: string; author: { name: string; url: string }; pages: Record<string, Page>; faq: { q: string; a: string }[] }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Search and AI-answer friendly pages. Every route gets its own HTML file with
 * its own title, description, canonical link, Open Graph and Twitter tags, so
 * crawlers that do not run JavaScript still see the right page. The build also
 * writes sitemap.xml, robots.txt and llms.txt, and adds structured data
 * (SoftwareApplication, Organization, WebSite, FAQPage) to the home page.
 *
 * The site address comes from SITE_URL, or Vercel's production domain when it
 * builds there, so links always point at the real site.
 */
export function seo(): Plugin {
  const data: Seo = JSON.parse(readFileSync(resolve(here, 'src/seo.json'), 'utf8'))
  const site = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://overlay.app')).replace(/\/+$/, '')
  const download = 'https://github.com/pradhan-not-found/overlay-releases/releases/latest/download/Overlay-Setup.exe'
  const url = (p: string) => `${site}${p === '/' ? '/' : p}`

  const structured = () => {
    const app = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: data.name,
      alternateName: `${data.name} for Windows`,
      description: data.pages.home.description,
      applicationCategory: 'UtilitiesApplication',
      applicationSubCategory: 'Productivity',
      operatingSystem: 'Windows 10, Windows 11',
      url: site + '/',
      downloadUrl: download,
      image: `${site}/og.png`,
      screenshot: `${site}/og.png`,
      author: { '@type': 'Person', name: data.author.name, url: data.author.url },
      offers: [
        { '@type': 'Offer', name: 'Basic', price: '0', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pro', price: '49', priceCurrency: 'USD', description: 'Per year' },
        { '@type': 'Offer', name: 'Lifetime', price: '149', priceCurrency: 'USD', description: 'One payment' },
      ],
      featureList: [
        'Dynamic Island style notch for Windows',
        'Now Playing with synced lyrics for Spotify and any media player',
        'AI usage limits for Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Copilot CLI and Antigravity',
        'One-click handoff between AI coding tools with context',
        'Google Calendar and a focus timer',
        'Discord voice calls with mute, deafen and leave',
        'GitHub contributions, to-dos, notes and clipboard history',
        'Hardware stats, weather, world clocks, calculator, colour picker and file shelf',
      ],
    }
    const website = { '@context': 'https://schema.org', '@type': 'WebSite', name: data.name, url: site + '/' }
    const org = { '@context': 'https://schema.org', '@type': 'Organization', name: data.name, url: site + '/', logo: `${site}/logo.png` }
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: data.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    }
    return [app, website, org, faq].map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n    ')
  }

  const head = (key: string) => {
    const p = data.pages[key]
    return [
      `<title>${esc(p.title)}</title>`,
      `<meta name="description" content="${esc(p.description)}" />`,
      `<meta name="robots" content="index, follow, max-image-preview:large" />`,
      `<meta name="author" content="${esc(data.author.name)}" />`,
      `<link rel="canonical" href="${url(p.path)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${esc(data.name)}" />`,
      `<meta property="og:url" content="${url(p.path)}" />`,
      `<meta property="og:title" content="${esc(p.title)}" />`,
      `<meta property="og:description" content="${esc(p.description)}" />`,
      `<meta property="og:image" content="${site}/og.png" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="${esc(data.name)}: ${esc(data.tagline)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(p.title)}" />`,
      `<meta name="twitter:description" content="${esc(p.description)}" />`,
      `<meta name="twitter:image" content="${site}/og.png" />`,
      `<link rel="sitemap" type="application/xml" href="/sitemap.xml" />`,
      key === 'home' ? structured() : '',
    ].filter(Boolean).join('\n    ')
  }

  let outDir = resolve(here, 'dist')
  return {
    name: 'overlay-seo',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir) },
    transformIndexHtml(html) { return html.replace('<!--seo-->', head('home')) },
    closeBundle() {
      let base = ''
      try { base = readFileSync(resolve(outDir, 'index.html'), 'utf8') } catch { return }
      const homeHead = head('home')
      // One HTML file per page, each with its own head.
      for (const key of Object.keys(data.pages)) {
        if (key === 'home') continue
        const html = base.replace(homeHead, head(key))
        mkdirSync(resolve(outDir, key), { recursive: true })
        writeFileSync(resolve(outDir, key, 'index.html'), html)
      }
      const today = new Date().toISOString().slice(0, 10)
      writeFileSync(resolve(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.values(data.pages).map((p) => `  <url><loc>${url(p.path)}</loc><lastmod>${today}</lastmod><changefreq>${p.path === '/changelog' ? 'daily' : 'weekly'}</changefreq><priority>${p.path === '/' ? '1.0' : p.path === '/features' || p.path === '/pricing' ? '0.8' : '0.5'}</priority></url>`).join('\n')}
</urlset>
`)
      writeFileSync(resolve(outDir, 'robots.txt'), `# Search engines and AI assistants are welcome.
User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`)
      // llms.txt: a plain summary for AI assistants and answer engines.
      writeFileSync(resolve(outDir, 'llms.txt'), `# ${data.name}

> ${data.pages.home.description}

${data.name} is a desktop app for Windows 10 and 11 by ${data.author.name}. It runs locally and keeps everything on the user's PC.

## Pages

${Object.entries(data.pages).map(([, p]) => `- [${p.title}](${url(p.path)}): ${p.description}`).join('\n')}

## Download

- [Overlay-Setup.exe for Windows](${download})

## Pricing

- Basic: $0, forever
- Pro: $49 per year
- Lifetime: $149 once

## Frequently asked questions

${data.faq.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}
`)
    },
  }
}
