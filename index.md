---
layout: home

hero:
  name: Pomelo
  text: A dev environment per branch
  tagline: A native macOS app that spins up a full, isolated, runnable environment for every branch — services, databases, and shared infra, wired automatically. No YAML archaeology, no port juggling.
  image:
    src: /hero-icon.png
    alt: Pomelo
  actions:
    - theme: brand
      text: Download for macOS
      link: https://github.com/toantran292/pomelo-releases/releases/latest
    - theme: alt
      text: Get Started
      link: /docs/install
    - theme: alt
      text: GitHub
      link: https://github.com/toantran292/pomelo-releases

features:
  - icon: 🌳
    title: One environment per branch
    details: Each branch gets its own git worktree, services, and databases — fully isolated. Switch branches without tearing anything down.
  - icon: ⚡
    title: Native, not a browser tab
    details: A real macOS app built to run at 120fps. Terminals, live service previews, and Claude in one window — no localhost dashboard.
  - icon: 🧩
    title: Shared infra, zero setup
    details: Postgres, Redis, MinIO, and OpenSearch shared across workspaces with automatic, conflict-free port allocation.
  - icon: 🤖
    title: Config that writes itself
    details: Point Pomelo at your repos and an onboarding agent reads them, writes a runnable pom.yml, and loops the config doctor until it's clean.
---

<div class="pom-specs">
  <div><b>macOS 14+</b><span>Apple Silicon &amp; Intel</span></div>
  <div><b>Notarized</b><span>Developer ID, no Gatekeeper prompts</span></div>
  <div><b>Portless</b><span>native FFI core, no localhost server</span></div>
  <div><b>No account</b><span>download, open, done</span></div>
</div>

<div class="pom-section">

## From branch to running in three steps

<div class="pom-steps">
  <div class="pom-step">
    <span class="pom-num">01</span>
    <h3>Add your repos</h3>
    <p>Create a session and drop in your repositories — a local folder or a git URL. Pomelo scaffolds the project and a worktree per branch.</p>
  </div>
  <div class="pom-step">
    <span class="pom-num">02</span>
    <h3>Let the agent wire it</h3>
    <p>An onboarding agent reads each repo, writes a runnable <code>pom.yml</code> — frameworks, services, shared infra, env — and loops the config doctor until nothing is blocking.</p>
  </div>
  <div class="pom-step">
    <span class="pom-num">03</span>
    <h3>Start the branch</h3>
    <p>Hit start. Every service comes up on its own port with its own databases, isolated from every other branch. Open two, five, ten at once.</p>
  </div>
</div>

</div>

<div class="pom-section pom-cta">

## Stop rebuilding your environment every time you switch branches

Pomelo keeps a golden `main` and clones its prepared state — node modules, databases via `CREATE DATABASE … TEMPLATE` — into each new workspace. New branches come up in seconds, not minutes.

<div class="pom-cta-actions">
  <a class="pom-btn" href="https://github.com/toantran292/pomelo-releases/releases/latest">Download for macOS</a>
  <a class="pom-btn pom-btn-alt" href="/docs/quickstart">Read the Quick Start</a>
</div>

</div>
