<script setup>
// A stylized mockup of the Pomelo app window for the landing hero. Placeholder
// data only (generic repo/branch names) — never real project data.
const branches = [
  { name: 'main', tag: 'golden', active: false, dot: 'ok' },
  { name: 'feat-login', tag: '3 dirty', active: true, dot: 'accent' },
  { name: 'feat-billing', tag: '1 dirty', active: false, dot: 'dim' },
  { name: 'fix-webhook-retry', tag: '', active: false, dot: 'dim' },
  { name: 'investigate-0823', tag: '', active: false, dot: 'dim' },
]
const columns = [
  { repo: 'api', count: '2/3', services: [
    { name: 'api', running: true, port: ':4001' },
    { name: 'worker', running: true, port: ':4002' },
    { name: 'scheduler', running: false, port: '' },
  ]},
  { repo: 'web', count: '1/1', services: [
    { name: 'web', running: true, port: ':3000' },
  ]},
  { repo: 'admin', count: '0/1', services: [
    { name: 'admin', running: false, port: '' },
  ]},
]
</script>

<template>
  <div class="mock">
    <div class="mock-bar">
      <span class="tl r"></span><span class="tl y"></span><span class="tl g"></span>
      <div class="mock-crumb"><span class="mock-logo"></span> myproject <span class="sep">/</span> <b>feat-login</b></div>
    </div>
    <div class="mock-body">
      <aside class="mock-side">
        <div class="mock-side-h">WORKSPACES</div>
        <div v-for="b in branches" :key="b.name" class="mock-ws" :class="{ on: b.active }">
          <span class="wd" :class="b.dot"></span>
          <span class="wn">{{ b.name }}</span>
          <span v-if="b.tag" class="wt">{{ b.tag }}</span>
        </div>
      </aside>
      <main class="mock-main">
        <div class="mock-main-h">GOLDEN SOURCE</div>
        <div class="mock-board">
          <div v-for="c in columns" :key="c.repo" class="mock-col">
            <div class="mock-col-h"><b>{{ c.repo }}</b><span>{{ c.count }}</span></div>
            <div v-for="s in c.services" :key="s.name" class="mock-card" :class="{ run: s.running }">
              <span class="sd" :class="s.running ? 'ok' : 'dim'"></span>
              <span class="sn">{{ s.name }}</span>
              <span v-if="s.port" class="sp">{{ s.port }}</span>
              <span class="sb" :class="s.running ? 'stop' : 'start'">{{ s.running ? 'stop' : 'start' }}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.mock {
  border-radius: 16px; overflow: hidden;
  background: #17121a; color: #f4eef5;
  border: 1px solid rgba(255,255,255,0.09);
  box-shadow: 0 40px 90px -30px rgba(90, 30, 90, 0.55), 0 12px 40px -12px rgba(0,0,0,0.5);
  font-size: 12px; line-height: 1.3;
}
.mock-bar {
  display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px;
  background: #1f1823; border-bottom: 1px solid rgba(255,255,255,0.07);
}
.tl { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
.tl.r { background: #ff5f57; } .tl.y { background: #febc2e; } .tl.g { background: #28c840; }
.mock-crumb { margin-left: 10px; color: rgba(240,232,245,0.65); display: flex; align-items: center; gap: 7px; font-size: 12.5px; }
.mock-crumb b { color: #f4eef5; font-weight: 600; }
.mock-crumb .sep { color: rgba(240,232,245,0.3); }
.mock-logo { width: 15px; height: 15px; border-radius: 4px; background: linear-gradient(160deg,#f9dccb,#d581cf 55%,#cdd4ee); display: inline-block; }

.mock-body { display: grid; grid-template-columns: 190px 1fr; min-height: 340px; }
.mock-side { border-right: 1px solid rgba(255,255,255,0.07); padding: 12px 8px; background: #1b141f; }
.mock-side-h, .mock-main-h { font-size: 9.5px; letter-spacing: 0.7px; font-weight: 700; color: rgba(240,232,245,0.42); padding: 4px 8px 8px; }
.mock-ws { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 7px; margin-bottom: 2px; }
.mock-ws.on { background: rgba(213,129,207,0.16); }
.wd { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.wd.ok { background: #34d058; } .wd.accent { background: #d581cf; } .wd.dim { background: rgba(240,232,245,0.28); }
.wn { flex: 1; color: rgba(240,232,245,0.9); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mock-ws.on .wn { color: #fff; font-weight: 600; }
.wt { font-size: 10px; color: rgba(240,232,245,0.4); flex: none; }

.mock-main { padding: 14px 16px; }
.mock-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 6px; }
.mock-col-h { display: flex; justify-content: space-between; align-items: baseline; padding: 0 2px 8px; }
.mock-col-h b { font-size: 12.5px; } .mock-col-h span { font-size: 10.5px; color: rgba(240,232,245,0.4); font-variant-numeric: tabular-nums; }
.mock-card {
  display: flex; align-items: center; gap: 8px; padding: 10px 11px; margin-bottom: 8px;
  background: #221a28; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px;
}
.mock-card.run { border-left: 2px solid #34d058; }
.sd { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.sd.ok { background: #34d058; } .sd.dim { background: rgba(240,232,245,0.28); }
.sn { flex: 1; font-family: var(--pom-mono); color: #f4eef5; }
.sp { font-family: var(--pom-mono); font-size: 10.5px; color: rgba(240,232,245,0.45); }
.sb { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
.sb.start { color: #34d058; background: rgba(52,208,88,0.16); }
.sb.stop { color: #ff6b6b; background: rgba(255,107,107,0.16); }

@media (max-width: 640px) {
  .mock-body { grid-template-columns: 1fr; }
  .mock-side { display: none; }
  .mock-board { grid-template-columns: 1fr; }
}
</style>
