# Product Spec: Overlay

*A Dynamic Island-style command center for Windows, with a built-in focus timer.*

---

## 1. Naming

**Suggested name: Overlay**

Rationale:
- Plain, category-defining word — it names exactly what the product is (a persistent surface that sits above everything else on screen) rather than reaching for a cute metaphor.
- Reads as a real, professional utility name — sits comfortably next to established productivity tools rather than as an Apple-styled knockoff.
- No trademark overlap with Apple's "Dynamic Island" or "Notch," and no reliance on borrowed visual language to justify the name.
- Easy to say, easy to spell, and future-proof if the product expands beyond the notch form factor — "Overlay" still describes any always-on-top surface it might grow into.

Alternates if "Overlay" is taken or doesn't land: **Verge**, **Meridian**, **Topline**.

Use **Overlay** consistently in the spec below; swap freely if the agent building this prefers an alternate.

---

## 2. Product Vision

Overlay turns the empty space at the top of a Windows display into a living, glanceable control surface — media playback, calendar, battery, file drop, system HUDs, and quick actions — all inside one elegant, expandable pill. It should feel native to Windows (not a macOS costume), fast, and quiet by default.

**Design principle:** calm at rest, expressive on interaction. The pill is small and unobtrusive until the user engages with it; expansion and content should feel physical and immediate, never gimmicky.

---

## 3. Target Platform

- Windows 10 and Windows 11 (desktop).
- Built to sit above all windows, respecting multi-monitor setups (primary display gets the full pill; secondary displays get an optional minimal status indicator).
- Distributed as a signed installer (.exe) with auto-update support.

---

## 4. Design Direction

- **Move away from macOS-coded visuals.** Avoid Apple's blue/green gradient language and SF-style rounded icons. Use a distinct palette: deep graphite background (`#121316`), a single confident accent (ice-blue or violet — pick one and use it sparingly), and soft neutral text tones. No cream/terracotta, no default acid-green-on-black — pick a palette that feels like it belongs to this product specifically.
- **Typography:** one characterful display face for headings, a clean readable body face, and a small utility face for timestamps/labels. Avoid default system-stack-only type; give the brand a voice.
- **Motion:** the pill's expand/contract transition is the signature interaction — invest real care here (spring physics, not linear easing). Keep everything else restrained: no extraneous animation on marketing copy, no scroll-jacking.
- **No emoji in UI or marketing copy.** Feature names and descriptions should read as considered, professional copy — plain, specific, active voice ("Drop a file to share it instantly," not "Drag, drop, done! 🚀").
- **Copy voice:** speak from the user's side of the screen. Describe what the person can do, not how the system is built underneath.

---

## 5. Core Features (carried over, refined)

1. **Media Controls** — album art, track info, and playback controls surface automatically when music or video is playing; color accents can subtly reflect the current album art.
2. **Calendar & Meetings** — upcoming events and one-tap join links for Zoom/Meet/Teams appear ahead of time, not just at the moment of the meeting.
3. **Camera Preview** — quick self-view check before joining a call.
4. **Battery & Power** — clear charge status and time-remaining estimate, with a low-battery warning state.
5. **Quick File Share** — drag a file onto the pill to copy its path, share via nearby device, or attach to the last-used app.
6. **System HUD Replacement** — custom volume/brightness sliders rendered inside the pill instead of the default Windows overlay.
7. **Adaptive Visuals** — subtle color and blur responses tied to content (e.g., music, calls), applied with restraint.

---

## 6. New Feature: Lock In (Focus Timer)

**Summary:** A Pomodoro-style focus mode that lives in the pill, letting someone start a focus session without opening a separate app, and giving a persistent, glanceable sense of time remaining and progress through their session plan.

### Behavior
- **Start a session** directly from the pill: tap "Lock In," choose a duration (default 25 min work / 5 min break, but adjustable), and the pill visually contracts into a minimal focus state — a slim progress ring or bar and a countdown, nothing else competing for attention.
- **Session states:** Focus → Short Break → (after N cycles) Long Break, cycling automatically, matching standard Pomodoro structure. The person can adjust cycle count and durations in settings.
- **Ambient signaling:** the pill's accent color or fill shifts gradually as time elapses, so remaining time is readable at a glance without reading numbers.
- **Do Not Disturb integration:** starting a Lock In session automatically suppresses non-essential notifications for the session duration (with an override if something urgent needs to break through).
- **Session end:** a gentle, non-jarring transition (sound + brief pill animation) signals break time; the pill offers "Start Break" or "Skip Break."
- **History:** a lightweight daily log of completed focus sessions (count + total focused time), viewable by expanding the pill — no separate dashboard required for v1.
- **Interruption handling:** if the person manually dismisses or overrides a session, log it as "ended early" rather than silently discarding it, so their history stays honest.

### Non-goals (v1)
- No task/to-do list management — this is a timer and focus signal, not a project manager.
- No cross-device sync in the first release.
- No mandatory account or sign-in to use Lock In.

### Copy examples
- Button: "Lock In" (starts a session), not "Begin Pomodoro Session."
- End of session: "Focus session complete. Take a break?" — plain, no false enthusiasm.
- Skipped break: logged plainly as "Break skipped," not flagged as a failure.

---

## 7. Technical Considerations (for the build)

- Likely stack: a lightweight always-on-top overlay window (WinUI 3 / WPF, or Electron if cross-framework flexibility is preferred), positioned at the top of the primary display, with hooks into:
  - Windows Media Session API (now-playing info/controls)
  - Windows Calendar/Outlook API or ICS feed for meetings
  - Camera device access (with a clear permission prompt for the preview)
  - Battery status API
  - System volume/brightness APIs (to intercept and replace default HUDs)
  - Windows Focus Assist / notification suppression APIs (for Lock In's do-not-disturb behavior)
- Auto-update mechanism and a signed installer are required for a trustworthy first impression — no unsigned .exe distribution for the public release.
- Respect multi-monitor configurations from day one; don't bolt it on later.

---

## 8. Success Criteria

- The pill feels like it belongs on Windows, not like a ported macOS skin.
- Lock In can be started in one tap from an idle state and requires no separate app.
- No feature listed here should require the user to leave the pill to complete a common action (join a meeting, skip a track, start focus time).
- Marketing site and in-product copy share the same professional, plain-spoken voice — no emoji, no filler adjectives.

---

*This document is meant as a working brief — the responsible agent should feel free to refine palette specifics, exact API choices, and copy details, provided they stay within the direction above.*
