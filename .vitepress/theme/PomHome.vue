<script setup>
// Bespoke landing (tablepro-style): numbered mono eyebrows + two-tone headlines,
// text-only media placeholders you swap for real screenshots/video later.
const DL = 'https://github.com/toantran292/pomelo-releases/releases/latest'
const GH = 'https://github.com/toantran292/pomelo-releases'
</script>

<template>
<div class="ph">
  <!-- HERO -->
  <section class="ph-wrap ph-hero">
    <div class="hero-cols">
      <div class="hero-text">
        <div class="eyebrow">POMELO · v0.10.11 · NATIVE macOS APP</div>
        <h1>A dev environment.<br><span class="muted">One per branch.</span></h1>
        <p class="lead">A native macOS app that spins up a full, isolated, runnable
          environment for every branch — services, databases, and shared infra,
          wired automatically. No YAML archaeology, no port juggling.</p>
        <div class="ph-actions">
          <a class="btn primary" :href="DL">Download for macOS</a>
          <a class="btn ghost" :href="GH">View source</a>
        </div>
        <div class="ph-meta">macOS 14+ · Apple Silicon &amp; Intel · Notarized · No account · ~28 MB</div>
      </div>
      <img class="hero-icon" src="/hero-icon.png" alt="Pomelo" />
    </div>
    <div class="ph-media ph-media-lg">Product overview — drop a screenshot or demo video here</div>
  </section>

  <!-- 01 ISOLATION -->
  <section class="ph-wrap ph-sec">
    <div class="sec-head">
      <div class="eyebrow"><span class="bar"></span>01 · ISOLATION</div>
      <h2>One branch, one full stack.<br><span class="muted">Nothing shared, nothing to tear down.</span></h2>
    </div>
    <div class="grid3">
      <div class="pt"><h3>Own worktree</h3><p>Every branch is a real git worktree — check out ten at once, no stashing, no context loss.</p></div>
      <div class="pt"><h3>Own services &amp; DBs</h3><p>Each workspace runs its own services on its own ports with its own databases. Two branches never collide.</p></div>
      <div class="pt"><h3>Conflict-free ports</h3><p>Ports are allocated automatically and stay sticky while a service runs. You never hunt for a free port again.</p></div>
    </div>
    <div class="ph-media">Service board — drop a screenshot here</div>
  </section>

  <!-- 02 SPEED -->
  <section class="ph-wrap ph-sec">
    <div class="sec-head">
      <div class="eyebrow"><span class="bar"></span>02 · SPEED</div>
      <h2>Stop rebuilding on every switch.<br><span class="muted">Golden main, cloned in seconds.</span></h2>
    </div>
    <div class="grid2">
      <div class="pt"><h3>Databases via TEMPLATE</h3><p>New workspaces clone their databases from a prepared <code>main</code> with <code>CREATE DATABASE … TEMPLATE</code> — sample data included, in seconds.</p></div>
      <div class="pt"><h3>node_modules, copy-on-write</h3><p>Dependencies materialize from main's installed copy via APFS clone — near-instant, sharing disk blocks, keyed by lockfile hash.</p></div>
    </div>
  </section>

  <!-- 03 NATIVE -->
  <section class="ph-wrap ph-sec">
    <div class="sec-head">
      <div class="eyebrow"><span class="bar"></span>03 · NATIVE</div>
      <h2>Written in Swift, not in Electron.<br><span class="muted">Here's what that gets you.</span></h2>
    </div>
    <div class="specs">
      <div class="spec"><b>120fps</b><span>built for ProMotion; streams and terminals stay smooth</span></div>
      <div class="spec"><b>Portless</b><span>the Go core links in-process over FFI — no localhost server</span></div>
      <div class="spec"><b>Notarized</b><span>Apple Developer ID, no Gatekeeper prompts</span></div>
      <div class="spec"><b>~28 MB</b><span>self-contained app, no separate runtime</span></div>
    </div>
  </section>

  <!-- 04 AGENTS -->
  <section class="ph-wrap ph-sec">
    <div class="sec-head">
      <div class="eyebrow"><span class="bar"></span>04 · AGENTS</div>
      <h2>Config that writes itself.<br><span class="muted">Point it at repos; the agent does the rest.</span></h2>
    </div>
    <div class="grid3">
      <div class="pt"><h3>Onboarding agent</h3><p>Reads each repo, detects frameworks and services, and writes a runnable <code>pom.yml</code>.</p></div>
      <div class="pt"><h3>Config doctor</h3><p>Deterministic checks (no LLM) loop until nothing blocks the project from running.</p></div>
      <div class="pt"><h3>Claude in the window</h3><p>A built-in agent per workspace, wired to the environment it's working in.</p></div>
    </div>
    <div class="ph-media">Onboarding + doctor — drop a screenshot here</div>
  </section>

  <!-- 05 GET STARTED -->
  <section class="ph-wrap ph-sec">
    <div class="sec-head">
      <div class="eyebrow"><span class="bar"></span>05 · GET STARTED</div>
      <h2>Install it and open a branch.<br><span class="muted">There's nothing to sign up for.</span></h2>
    </div>
    <div class="grid2 gs">
      <div>
        <h3>Download</h3>
        <p>macOS 14 or later. Apple Silicon and Intel. About 28 MB.</p>
        <div class="ph-actions"><a class="btn primary" :href="DL">Download for macOS</a></div>
        <p class="fine">Open the DMG, drag Pomelo to Applications, launch it, and point it at the folder that holds your repos.</p>
      </div>
      <div>
        <h3>Learn</h3>
        <p>The docs walk through your first session, services, databases, and the config reference.</p>
        <div class="ph-actions"><a class="btn ghost" href="/docs/quickstart">Read the Quick Start</a> <a class="btn ghost" href="/docs/install">Install guide</a></div>
      </div>
    </div>
  </section>
</div>
</template>

<style scoped>
.ph { width: 100vw; margin-left: calc(50% - 50vw); padding-bottom: 96px; }
.ph-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }

.eyebrow {
  font-family: var(--pom-mono); font-size: 12px; font-weight: 700; letter-spacing: 0.14em;
  color: var(--pom-yellow); display: flex; align-items: center; gap: 10px;
}
.eyebrow .bar { width: 26px; height: 2px; background: var(--pom-yellow); display: inline-block; }

h1, h2 { border: 0; padding: 0; letter-spacing: -0.03em; font-weight: 800; line-height: 1.04; color: var(--vp-c-text-1); }
h1 { font-size: clamp(2.4rem, 6vw, 4.2rem); margin: 18px 0 0; }
h2 { font-size: clamp(1.8rem, 3.6vw, 2.9rem); margin: 14px 0 0; }
.muted { color: var(--vp-c-text-3); }

/* HERO */
.ph-hero { padding-top: clamp(48px, 8vw, 104px); text-align: left; }
.ph-hero .eyebrow { justify-content: flex-start; }
.hero-cols { display: flex; align-items: center; gap: 48px; }
.hero-text { flex: 1; min-width: 0; }
.hero-icon { width: clamp(150px, 22vw, 300px); height: auto; flex: none;
  filter: drop-shadow(0 30px 60px rgba(120,30,110,0.42)); }
@media (max-width: 860px) {
  .hero-cols { flex-direction: column-reverse; align-items: flex-start; gap: 20px; }
  .hero-icon { width: 128px; }
}
.lead { max-width: 56ch; margin: 22px 0 0; font-size: clamp(15px, 1.5vw, 18px); line-height: 1.65; color: var(--vp-c-text-2); }
.ph-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
.ph-meta { margin-top: 18px; font-family: var(--pom-mono); font-size: 12px; color: var(--vp-c-text-3); }

.btn { display: inline-block; font-size: 14px; font-weight: 600; text-decoration: none; padding: 11px 22px; border-radius: 24px; transition: background 0.16s, border-color 0.16s; }
.btn.primary { background: var(--vp-c-brand-1); color: #fff; }
.dark .btn.primary { color: #1a0f18; }
.btn.primary:hover { background: var(--vp-c-brand-3); }
.btn.ghost { border: 1px solid var(--vp-c-border); color: var(--vp-c-text-1); }
.btn.ghost:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }

/* Media placeholder — TEXT only, never cropped */
.ph-media {
  margin-top: 40px; aspect-ratio: 16 / 9; border-radius: 16px;
  border: 1px dashed var(--vp-c-border); background: var(--vp-c-bg-soft);
  display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px;
  color: var(--vp-c-text-3); font-family: var(--pom-mono); font-size: 13px;
}
.ph-media-lg { margin-top: 48px; box-shadow: 0 50px 120px -60px rgba(120,30,110,0.5); }

/* Sections */
.ph-sec { padding-top: clamp(64px, 9vw, 128px); }
.sec-head { margin-bottom: 36px; }

.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px; }
@media (max-width: 820px) { .grid3, .grid2 { grid-template-columns: 1fr; } }
.pt h3 { font-size: 17px; font-weight: 700; margin: 0 0 8px; color: var(--vp-c-text-1); }
.pt p { margin: 0; font-size: 14.5px; line-height: 1.6; color: var(--vp-c-text-2); }

.specs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 820px) { .specs { grid-template-columns: repeat(2, 1fr); } }
.spec { border: 1px solid var(--vp-c-border); border-radius: 14px; padding: 18px; background: var(--vp-c-bg-soft); }
.spec b { display: block; font-size: 18px; color: var(--vp-c-text-1); }
.spec span { display: block; margin-top: 6px; font-size: 13px; line-height: 1.5; color: var(--vp-c-text-3); }

.gs h3 { font-size: 18px; margin: 0 0 8px; }
.gs p { color: var(--vp-c-text-2); font-size: 14.5px; line-height: 1.6; }
.fine { color: var(--vp-c-text-3) !important; font-size: 13px !important; margin-top: 14px; }

:deep(code) { font-family: var(--pom-mono); font-size: 0.85em; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); padding: 2px 6px; border-radius: 6px; }
</style>
