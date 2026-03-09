import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// REALISTIC SOUND ENGINE
// ═══════════════════════════════════════════════════════════════
function createSoundEngine() {
  let ctx = null;
  function C() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function masterGain(val = 0.7) {
    const g = C().createGain(); g.gain.value = val; g.connect(C().destination); return g;
  }

  // White/brown noise burst
  function noiseBurst(dur, gainVal, filterType = "lowpass", freq = 400, q = 1) {
    const c = C(), sr = c.sampleRate;
    const buf = c.createBuffer(1, Math.floor(sr * dur), sr);
    const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < d.length; i++) {
      const wh = Math.random() * 2 - 1;
      // Pink noise approximation
      b0=0.99886*b0+wh*0.0555179; b1=0.99332*b1+wh*0.0750759;
      b2=0.96900*b2+wh*0.1538520; b3=0.86650*b3+wh*0.3104856;
      b4=0.55000*b4+wh*0.5329522; b5=-0.7616*b5-wh*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+wh*0.5362) * 0.11;
      b6 = wh * 0.115926;
    }
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type = filterType; filt.frequency.value = freq; filt.Q.value = q;
    const env = c.createGain();
    env.gain.setValueAtTime(gainVal, c.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(filt); filt.connect(env); env.connect(c.destination);
    src.start(); src.stop(c.currentTime + dur);
    return env;
  }

  function osc(freq, dur, gainVal, type="sine", freqEnd=null, attack=0.01) {
    const c = C();
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + dur);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, c.currentTime);
    env.gain.linearRampToValueAtTime(gainVal, c.currentTime + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(env); env.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  function delay(fn, ms) { setTimeout(fn, ms); }

  return {
    resume() { C(); },

    // ── Rocket launch: deep rumble + sustained roar ──
    rocketLaunch() {
      noiseBurst(2.0, 0.5, "lowpass", 200);           // deep body rumble
      noiseBurst(1.5, 0.3, "bandpass", 600, 0.5);     // mid roar
      noiseBurst(0.8, 0.15, "highpass", 2000);         // hiss
      osc(80, 1.2, 0.2, "sawtooth", 50);              // engine fundamental
      osc(160, 0.8, 0.08, "square", 80);              // harmonic
    },

    // ── Jet turbine: whine + afterburner crack ──
    jetEngine() {
      const c = C();
      // Turbine whine — sweeping pitch
      const o1 = c.createOscillator(); o1.type = "sawtooth";
      o1.frequency.setValueAtTime(600, c.currentTime);
      o1.frequency.linearRampToValueAtTime(1800, c.currentTime + 0.3);
      o1.frequency.linearRampToValueAtTime(1200, c.currentTime + 0.8);
      const o2 = c.createOscillator(); o2.type = "square"; o2.frequency.value = 320;
      const dist = c.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; curve[i] = (Math.PI + 400) * x / (Math.PI + 400 * Math.abs(x)); }
      dist.curve = curve;
      const g = c.createGain(); g.gain.setValueAtTime(0.12, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.9);
      o1.connect(dist); o2.connect(dist); dist.connect(g); g.connect(c.destination);
      o1.start(); o1.stop(c.currentTime + 0.9);
      o2.start(); o2.stop(c.currentTime + 0.9);
      noiseBurst(0.6, 0.18, "highpass", 3000);         // high-freq scream
      noiseBurst(0.4, 0.1, "bandpass", 800, 2);        // afterburner pop
      delay(() => noiseBurst(0.3, 0.12, "lowpass", 300), 200); // secondary boom
    },

    // ── Hypersonic: sharp CRACK + plasma shriek ──
    hypersonicPass() {
      noiseBurst(0.12, 0.6, "highpass", 8000);         // sonic crack
      osc(3000, 0.2, 0.15, "sawtooth", 150);           // doppler shriek down
      noiseBurst(0.5, 0.2, "bandpass", 1500, 3);       // plasma resonance
      delay(() => {
        noiseBurst(0.3, 0.25, "lowpass", 300);          // wake boom
        osc(200, 0.4, 0.1, "sine", 60);
      }, 120);
    },

    // ── Interceptor fire: sharp pop + whoosh ──
    interceptorFire() {
      noiseBurst(0.08, 0.35, "bandpass", 3000, 4);     // sharp ignition crack
      noiseBurst(0.6, 0.2, "bandpass", 800, 1);        // rocket whoosh
      osc(500, 0.4, 0.08, "sawtooth", 200);            // thrust tone
      noiseBurst(0.3, 0.08, "highpass", 4000);         // hiss tail
    },

    // ── Big explosion: concussive boom + rumble ──
    bigExplosion() {
      noiseBurst(0.06, 0.9, "lowpass", 150);           // initial concussive thump
      delay(() => noiseBurst(2.0, 0.6, "lowpass", 120), 30);   // deep sustained rumble
      delay(() => noiseBurst(1.2, 0.35, "bandpass", 400, 0.5), 50); // mid debris
      delay(() => noiseBurst(0.6, 0.15, "highpass", 1200), 80);     // high crackle
      osc(60, 1.0, 0.4, "sine", 30);                  // sub bass thud
      delay(() => noiseBurst(0.8, 0.2, "lowpass", 200), 300);  // secondary rumble
      delay(() => noiseBurst(0.5, 0.1, "lowpass", 150), 700);  // distant echo
    },

    // ── Small explosion: sharp crack + pop ──
    smallExplosion() {
      noiseBurst(0.05, 0.4, "lowpass", 400);
      delay(() => noiseBurst(0.6, 0.2, "lowpass", 250), 20);
      osc(150, 0.3, 0.15, "sine", 60);
    },

    // ── Alert: radar warning tone ──
    alert() {
      [0, 0.22, 0.44].forEach((t, i) => {
        const c = C();
        const o = c.createOscillator(); o.type = "square";
        o.frequency.value = i === 0 ? 1200 : 900;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, c.currentTime + t);
        g.gain.linearRampToValueAtTime(0.07, c.currentTime + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.18);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.2);
      });
    },

    // ── Wave start fanfare ──
    waveStart(waveNum) {
      const freqs = [523, 659, 784, 1047];
      freqs.forEach((f, i) => delay(() => osc(f, 0.3, 0.08, "sine"), i * 120));
      delay(() => osc(waveNum > 3 ? 1200 : 900, 0.5, 0.1, "square"), 500);
    },

    // ── Power-up collect ──
    powerUp() {
      [800, 1000, 1200, 1600].forEach((f, i) => delay(() => osc(f, 0.15, 0.08, "sine"), i * 60));
    },

    // ── Shield hit ──
    shieldHit() {
      noiseBurst(0.15, 0.2, "bandpass", 2000, 5);
      osc(400, 0.2, 0.1, "sine", 600);
    },

    // ── Building damage ──
    buildingHit() {
      noiseBurst(0.8, 0.3, "lowpass", 300);
      osc(100, 0.5, 0.2, "sawtooth", 50);
      delay(() => noiseBurst(0.4, 0.15, "bandpass", 500), 100);
    },

    // ── Game over siren ──
    gameOver() {
      for (let i = 0; i < 5; i++) {
        delay(() => { osc(800, 0.3, 0.08, "sawtooth", 500); noiseBurst(0.3, 0.1, "lowpass", 200); }, i * 350);
      }
      delay(() => noiseBurst(2.5, 0.4, "lowpass", 150), 600);
    },

    // ── Area blast power-up ──
    areaBlast() {
      noiseBurst(0.08, 0.8, "lowpass", 200);
      delay(() => noiseBurst(1.5, 0.5, "lowpass", 100), 40);
      delay(() => noiseBurst(0.8, 0.3, "bandpass", 600), 100);
      osc(50, 1.0, 0.5, "sine", 20);
    },

    uiClick() { osc(660, 0.08, 0.04, "sine"); },
    uiHover() { osc(440, 0.05, 0.02, "sine"); },
  };
}

let SFX = null;
function sfx() { if (!SFX) SFX = createSoundEngine(); return SFX; }

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════
const GROUND_FRAC = 0.82;
function rand(a, b) { return Math.random() * (b - a) + a; }
let _id = 0;
const uid = () => ++_id;

const LS_KEY = "mdefe_scores_v2";
function loadScores() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function saveScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(LS_KEY, JSON.stringify(scores.slice(0, 10)));
  return scores.slice(0, 10);
}

// Power-up types
const POWERUPS = {
  shield:    { color: "#00ccff", icon: "🛡", label: "SHIELD",      dur: 600 },
  rapidfire: { color: "#ffcc00", icon: "⚡", label: "RAPID FIRE",  dur: 400 },
  areaBlast: { color: "#ff6600", icon: "💥", label: "AREA BLAST",  dur: 1   },
  extraLife: { color: "#ff4444", icon: "❤",  label: "+1 LIFE",     dur: 1   },
};

// Wave definitions
const WAVES = [
  { num:1, count:6,  types:["missile"],                   msg:"WAVE 1 — INCOMING MISSILES!" },
  { num:2, count:8,  types:["missile","missile","f35"],   msg:"WAVE 2 — JETS DETECTED!" },
  { num:3, count:10, types:["missile","f35","jet"],        msg:"WAVE 3 — F-22 RAPTORS!" },
  { num:4, count:12, types:["f35","jet","missile"],        msg:"WAVE 4 — HEAVY ASSAULT!" },
  { num:5, count:14, types:["jet","f35","hypersonic"],    msg:"WAVE 5 — HYPERSONICS!" },
  { num:6, count:16, types:["hypersonic","jet","f35"],    msg:"WAVE 6 — CRITICAL THREAT!" },
];

const BUILDINGS = [
  [0.02,0.055,0.14,1],[0.07,0.04,0.10,3],[0.10,0.05,0.18,1],
  [0.14,0.025,0.22,2],[0.17,0.06,0.13,0],[0.22,0.04,0.09,3],
  [0.25,0.05,0.16,1],[0.29,0.025,0.20,2],[0.31,0.065,0.12,0],
  [0.37,0.04,0.10,3],[0.40,0.05,0.17,1],[0.44,0.025,0.24,2],
  [0.46,0.065,0.14,0],[0.52,0.04,0.11,3],[0.55,0.05,0.19,1],
  [0.59,0.025,0.22,2],[0.61,0.065,0.13,0],[0.67,0.04,0.10,3],
  [0.70,0.04,0.16,1],[0.74,0.025,0.21,2],[0.76,0.06,0.12,0],
  [0.81,0.04,0.09,3],[0.84,0.05,0.17,1],[0.88,0.025,0.20,2],
  [0.90,0.055,0.14,0],[0.95,0.04,0.11,3],[0.97,0.045,0.15,1],
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function MissileDefense() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 400, y: 300 });
  const [phase, setPhase] = useState("menu"); // menu | playing | paused | gameover | wavebreak | leaderboard
  const [uiData, setUiData] = useState({
    score: 0, lives: 3, wave: 1, interceptorsLeft: 3, reloadPct: 0,
    activePowerups: [], shieldActive: false, rapidFireActive: false,
    waveMsg: "", waveComplete: false,
  });
  const [scores, setScores] = useState(loadScores());
  const [playerName, setPlayerName] = useState("PLAYER");
  const phaseRef = useRef("menu");

  function setPhaseSync(p) { phaseRef.current = p; setPhase(p); }

  function makeState() {
    return {
      missiles: [], interceptors: [], explosions: [], clouds: [], birds: [],
      debris: [], powerupItems: [], floatingTexts: [],
      buildingDamage: {}, // key = building index, value = damage 0..3
      score: 0, lives: 3, wave: 0, interceptorsLeft: 3,
      reloadTimer: 0, reloadDuration: 180,
      spawnTimer: 0, spawnInterval: 120,
      waveSpawned: 0, waveTotal: 0, waveTypes: [],
      frameCount: 0, sunAngle: 0.35, phase: "playing",
      shieldTimer: 0, rapidFireTimer: 0,
      screenShake: 0,
    };
  }

  function initEnv(s, W, H) {
    s.clouds = Array.from({ length: 9 }, () => ({
      x: rand(0, W), y: rand(H * 0.04, H * 0.28), w: rand(90, 250), h: rand(30, 75),
      speed: rand(0.1, 0.38), puffs: Math.floor(rand(3, 7)),
    }));
    s.birds = Array.from({ length: 9 }, () => ({
      x: rand(0, W), y: rand(H * 0.07, H * 0.22), speed: rand(0.5, 2.0),
      flapT: rand(0, Math.PI * 2), dir: Math.random() > 0.5 ? 1 : -1, size: rand(0.7, 1.4),
    }));
  }

  function startWave(s, W, H, waveNum) {
    const wDef = WAVES[Math.min(waveNum - 1, WAVES.length - 1)];
    const extraCount = waveNum > WAVES.length ? (waveNum - WAVES.length) * 3 : 0;
    s.wave = waveNum;
    s.waveTotal = wDef.count + extraCount;
    s.waveSpawned = 0;
    s.waveTypes = wDef.types;
    s.spawnInterval = Math.max(40, 120 - waveNum * 10);
    s.spawnTimer = 0;
    sfx().waveStart(waveNum);
    setUiData(u => ({ ...u, wave: waveNum, waveMsg: wDef.msg + (waveNum > WAVES.length ? ` (×${waveNum})` : "") }));
    setTimeout(() => setUiData(u => ({ ...u, waveMsg: "" })), 3000);
  }

  function spawnThreat(s, W, H) {
    const groundY = H * GROUND_FRAC, baseX = W / 2;
    const types = s.waveTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    const startX = rand(W * 0.05, W * 0.95);
    const startY = rand(-70, -10);
    const targetX = rand(baseX - 110, baseX + 110);
    const targetY = groundY - 12;
    const dx = targetX - startX, dy = targetY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const speed = type === "hypersonic" ? rand(5.5, 9) : type === "jet" || type === "f35" ? rand(3, 5) : rand(1.2, 2.2);
    const rawVx = (dx / len) * speed, rawVy = (dy / len) * speed;
    const minVy = speed * 0.68;
    const clVy = Math.max(rawVy, minVy);
    const sc = speed / Math.sqrt(rawVx * rawVx + clVy * clVy);
    s.missiles.push({
      id: uid(), type, x: startX, y: startY,
      vx: rawVx * sc, vy: clVy * sc,
      targetX, targetY, trail: [],
      health: type === "hypersonic" ? 2 : 1,
    });
    s.waveSpawned++;
    if (type === "missile") sfx().rocketLaunch();
    else if (type === "jet" || type === "f35") sfx().jetEngine();
    else sfx().hypersonicPass();
    sfx().alert();
  }

  function spawnPowerup(s, W, H) {
    const keys = Object.keys(POWERUPS);
    const type = keys[Math.floor(Math.random() * keys.length)];
    s.powerupItems.push({
      id: uid(), type, x: rand(W * 0.1, W * 0.9), y: -30,
      vy: rand(0.8, 1.4), bobT: rand(0, Math.PI * 2), life: 1,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (phase !== "playing") { cancelAnimationFrame(animRef.current); return; }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!stateRef.current) {
      stateRef.current = makeState();
      initEnv(stateRef.current, canvas.width, canvas.height);
      startWave(stateRef.current, canvas.width, canvas.height, 1);
    }
    const s = stateRef.current;

    function W() { return canvas.width; }
    function H() { return canvas.height; }
    function gY() { return H() * GROUND_FRAC; }
    function bX() { return W() / 2; }
    function bY() { return gY() - 8; }

    // ── Sky / environment ──────────────────────────────────────
    function lerpC(a, b, t) {
      const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
      const r = Math.round(((ah>>16)&0xff)+(((bh>>16)&0xff)-((ah>>16)&0xff))*t);
      const g = Math.round(((ah>>8)&0xff)+(((bh>>8)&0xff)-((ah>>8)&0xff))*t);
      const bl = Math.round((ah&0xff)+((bh&0xff)-(ah&0xff))*t);
      return `rgb(${r},${g},${bl})`;
    }

    function drawSky() {
      s.sunAngle += 0.00012;
      const t = s.sunAngle % 1;
      let top, mid, bot;
      if (t < 0.2) { const p=t/0.2; top=lerpC("#e87c1e","#3a78c9",p); mid=lerpC("#f5a623","#6aaee0",p); bot=lerpC("#f9c87a","#b8d8f5",p); }
      else if (t < 0.7) { top="#3a78c9"; mid="#6aaee0"; bot="#b8d8f5"; }
      else { const p=(t-0.7)/0.3; top=lerpC("#3a78c9","#c0392b",p); mid=lerpC("#6aaee0","#e67e22",p); bot=lerpC("#b8d8f5","#f39c12",p); }
      const g = ctx.createLinearGradient(0,0,0,gY());
      g.addColorStop(0,top); g.addColorStop(0.5,mid); g.addColorStop(1,bot);
      ctx.fillStyle=g; ctx.fillRect(0,0,W(),gY());
    }

    function drawSun() {
      const t = s.sunAngle%1, a = t*Math.PI*2-Math.PI*1.5;
      const cx=W()*0.5+Math.cos(a)*W()*0.42, cy=gY()*0.5+Math.sin(a)*gY()*0.6;
      if (cy>gY()+50) return;
      const r=Math.min(W(),H())*0.036, col=t<0.15||t>0.85?"#ff8c42":"#fff9c4";
      const glo=ctx.createRadialGradient(cx,cy,0,cx,cy,r*3.5);
      glo.addColorStop(0,col+"88"); glo.addColorStop(1,"transparent");
      ctx.fillStyle=glo; ctx.beginPath(); ctx.arc(cx,cy,r*3.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
      ctx.strokeStyle=col+"88"; ctx.lineWidth=1.5;
      for(let i=0;i<14;i++){const ang=(i/14)*Math.PI*2,r1=r*1.3,r2=r*(1.9+Math.sin(Date.now()*0.002+i)*0.2);ctx.beginPath();ctx.moveTo(cx+Math.cos(ang)*r1,cy+Math.sin(ang)*r1);ctx.lineTo(cx+Math.cos(ang)*r2,cy+Math.sin(ang)*r2);ctx.stroke();}
    }

    function drawClouds() {
      s.clouds.forEach(c => {
        c.x+=c.speed; if(c.x>W()+c.w) c.x=-c.w;
        ctx.save(); ctx.globalAlpha=0.84;
        for(let i=0;i<c.puffs;i++){
          const px=c.x+(i/(c.puffs-1))*c.w, py=c.y+Math.sin(i*1.4)*c.h*0.25, pr=c.h*(0.48+Math.sin(i*0.9)*0.18);
          const cg=ctx.createRadialGradient(px,py-pr*0.15,0,px,py,pr);
          cg.addColorStop(0,"#fff"); cg.addColorStop(0.6,"#e8f4fd"); cg.addColorStop(1,"rgba(200,220,240,0)");
          ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(px,py,pr,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1; ctx.restore();
      });
    }

    function drawBirds() {
      s.birds.forEach(b => {
        b.x+=b.speed*b.dir; b.flapT+=0.12;
        if(b.x>W()+40) b.x=-40; if(b.x<-40) b.x=W()+40;
        const w=b.size*10;
        ctx.save(); ctx.translate(b.x,b.y); ctx.scale(b.dir,1);
        ctx.strokeStyle="#2c3e50"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(-w,Math.sin(b.flapT)*w*0.7); ctx.quadraticCurveTo(-w*0.4,0,0,2);
        ctx.moveTo(w,Math.sin(b.flapT)*w*0.7); ctx.quadraticCurveTo(w*0.4,0,0,2); ctx.stroke(); ctx.restore();
      });
    }

    function drawMountains() {
      ctx.fillStyle="#c5d5e8"; ctx.beginPath(); ctx.moveTo(0,gY());
      [[0,.18],[.08,.09],[.15,.15],[.22,.06],[.3,.13],[.38,.07],[.45,.16],[.52,.08],[.6,.14],[.68,.06],[.75,.15],[.82,.09],[.9,.12],[1,.17]].forEach(([px,py])=>ctx.lineTo(px*W(),gY()-py*H()));
      ctx.lineTo(W(),gY()); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#8aaa6a"; ctx.beginPath(); ctx.moveTo(0,gY());
      [[0,.09],[.06,.04],[.14,.10],[.22,.03],[.31,.08],[.4,.02],[.5,.07],[.6,.03],[.7,.09],[.8,.04],[.9,.08],[1,.05]].forEach(([px,py])=>ctx.lineTo(px*W(),gY()-py*H()));
      ctx.lineTo(W(),gY()); ctx.closePath(); ctx.fill();
    }

    function drawLevantineCity() {
      BUILDINGS.forEach(([xf,wf,hf,style], idx) => {
        const bx=xf*W(), bw=Math.max(wf*W(),16), bh=hf*H(), by=gY()-bh;
        const dmg = s.buildingDamage[idx] || 0;
        ctx.save();
        ctx.fillStyle="rgba(0,0,0,0.1)"; ctx.fillRect(bx+4,by+4,bw,bh);
        if (style===2) {
          const mw=bw*0.38, mg=ctx.createLinearGradient(bx,by,bx+mw,by);
          mg.addColorStop(0,dmg>0?"#c4a070":"#e8d5a3"); mg.addColorStop(1,dmg>0?"#9a7040":"#c9b07a");
          ctx.fillStyle=mg; ctx.fillRect(bx+bw*0.31,by,mw,bh);
          ctx.fillStyle="#b8975a"; ctx.fillRect(bx+bw*0.22,by+bh*0.6,bw*0.56,bh*0.04);
          ctx.beginPath(); ctx.arc(bx+bw*0.5,by+bh*0.07,mw*0.68,0,Math.PI*2);
          ctx.fillStyle=dmg>1?"#5a8080":"#7ab0d4"; ctx.fill();
          ctx.strokeStyle="#c0a000"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(bx+bw*0.5,by-bh*0.02,mw*0.32,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
        } else if (style===0) {
          const mg=ctx.createLinearGradient(bx,by,bx,gY());
          mg.addColorStop(0,dmg>0?"#d4c098":"#f0e6c8"); mg.addColorStop(1,dmg>0?"#b09060":"#d4c090");
          ctx.fillStyle=mg; ctx.fillRect(bx,by+bh*0.12,bw,bh*0.88);
          ctx.beginPath(); ctx.arc(bx+bw*0.5,by+bh*0.18,bw*0.42,Math.PI,0);
          ctx.fillStyle=dmg>1?"#5a8090":"#7ab0d4"; ctx.fill(); ctx.strokeStyle="#5590b4"; ctx.lineWidth=1.5; ctx.stroke();
          for(let i=0;i<3;i++){const wx=bx+(i+0.5)*(bw/3)-6,wy=by+bh*0.55;ctx.fillStyle="#aad0ee";ctx.fillRect(wx,wy,12,18);ctx.beginPath();ctx.arc(wx+6,wy,6,Math.PI,0);ctx.fill();}
        } else if (style===1) {
          const colors=["#e8c99a","#d4b483","#c8aa78","#ddc89a"];
          const col=dmg>0?["#c8a070","#b49060","#a88050","#bcaa70"][Math.floor(bx/30)%4]:colors[Math.floor(bx/30)%4];
          const bg=ctx.createLinearGradient(bx,by,bx+bw,by);
          bg.addColorStop(0,col); bg.addColorStop(1,dmg>0?"#907040":"#b89060");
          ctx.fillStyle=bg; ctx.fillRect(bx,by,bw,bh);
          ctx.fillStyle="#c8a870"; ctx.fillRect(bx,by,bw,4);
          const cols2=Math.max(1,Math.floor(bw/14)),rows=Math.max(1,Math.floor(bh/18));
          for(let r=0;r<rows;r++) for(let c2=0;c2<cols2;c2++){
            const wx=bx+(c2+0.4)*(bw/cols2)-4,wy=by+bh*0.12+r*(bh*0.8/rows);
            ctx.fillStyle=dmg>1&&Math.random()>0.5?"#553322":"#aad4f0"; ctx.fillRect(wx,wy,8,10);
          }
        } else {
          ctx.fillStyle=dmg>0?"#b49070":"#d4b890"; ctx.fillRect(bx,by,bw,bh);
          const aw=["#cc4444","#4488cc","#44aa44","#cc8844"][Math.floor(bx/20)%4];
          ctx.fillStyle=aw; ctx.fillRect(bx-2,by+bh*0.45,bw+4,bh*0.1);
          ctx.fillStyle="#a06020"; ctx.fillRect(bx+bw*0.2,by+bh*0.6,bw*0.6,bh*0.4);
        }
        // Damage cracks/scorch
        if (dmg > 0) {
          ctx.save(); ctx.globalAlpha = dmg * 0.35;
          ctx.fillStyle = "#220000";
          ctx.fillRect(bx + rand(0,bw*0.5), by + bh*0.3, rand(bw*0.2,bw*0.6), rand(bh*0.1,bh*0.4));
          ctx.globalAlpha = 1; ctx.restore();
        }
        if (dmg > 1) {
          // Rubble chunks missing from top
          ctx.save(); ctx.globalAlpha = 1;
          ctx.fillStyle = dmg > 2 ? "#7a5a3a" : "#c8a870";
          for (let ci = 0; ci < 5; ci++) {
            ctx.fillRect(bx+rand(0,bw), by+rand(0,bh*0.3), rand(3,10), rand(3,10));
          }
          ctx.restore();
        }
        ctx.restore();
      });
    }

    function drawGround() {
      const gg=ctx.createLinearGradient(0,gY(),0,H());
      gg.addColorStop(0,"#9aaa78"); gg.addColorStop(0.3,"#7a8a5a"); gg.addColorStop(1,"#5a6a40");
      ctx.fillStyle=gg; ctx.fillRect(0,gY(),W(),H()-gY());
      ctx.fillStyle="#b8a888"; ctx.fillRect(0,gY()+H()*0.02,W(),H()*0.04);
      ctx.strokeStyle="#9a9070"; ctx.lineWidth=2; ctx.setLineDash([30,18]);
      ctx.beginPath(); ctx.moveTo(0,gY()+H()*0.04); ctx.lineTo(W(),gY()+H()*0.04); ctx.stroke(); ctx.setLineDash([]);
      [0.04,0.09,0.17,0.26,0.33,0.67,0.74,0.82,0.91,0.96].forEach(tx=>{
        const ox=tx*W(),oy=gY(),th=H()*0.075;
        ctx.fillStyle="#7a5c30"; ctx.fillRect(ox-3,oy-th,6,th);
        ctx.fillStyle="#6a8844"; ctx.beginPath(); ctx.ellipse(ox,oy-th-th*0.25,th*0.55,th*0.4,0.2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#5a7836"; ctx.beginPath(); ctx.ellipse(ox-th*0.2,oy-th,th*0.35,th*0.28,-0.4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ox+th*0.22,oy-th+th*0.05,th*0.3,th*0.25,0.5,0,Math.PI*2); ctx.fill();
      });
      [0.13,0.35,0.64,0.78,0.88].forEach(tx=>{
        const cx=tx*W(),cy=gY(),ch=H()*0.11;
        ctx.fillStyle="#5c4422"; ctx.fillRect(cx-2,cy-ch,4,ch);
        ctx.fillStyle="#2d6b2d"; ctx.beginPath(); ctx.moveTo(cx,cy-ch-ch*0.3); ctx.lineTo(cx-ch*0.14,cy-ch*0.1); ctx.lineTo(cx+ch*0.14,cy-ch*0.1); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#3a8a3a"; ctx.beginPath(); ctx.moveTo(cx,cy-ch-ch*0.1); ctx.lineTo(cx-ch*0.18,cy-ch*0.4); ctx.lineTo(cx+ch*0.18,cy-ch*0.4); ctx.closePath(); ctx.fill();
      });
    }

    function drawBase() {
      // Shield visual
      if (s.shieldTimer > 0) {
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.005));
        ctx.save(); ctx.globalAlpha = pulse * 0.45;
        ctx.strokeStyle = "#00ddff"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(bX(), bY(), 55 + Math.sin(Date.now()*0.003)*4, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = pulse * 0.12;
        ctx.fillStyle = "#00aaff";
        ctx.beginPath(); ctx.arc(bX(), bY(), 55, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1; ctx.restore();
      }
      ctx.save();
      ctx.fillStyle="#7a8898"; ctx.fillRect(bX()-60,gY()-28,120,28);
      ctx.fillStyle="#8a9aaa"; ctx.fillRect(bX()-55,gY()-24,110,5);
      ctx.beginPath(); ctx.arc(bX(),bY(),26,Math.PI,0);
      const dg=ctx.createLinearGradient(bX()-26,bY()-26,bX()+26,bY());
      dg.addColorStop(0, s.shieldTimer>0?"#88eeff":"#aac8e8");
      dg.addColorStop(1, s.shieldTimer>0?"#004466":"#335566");
      ctx.fillStyle=dg; ctx.fill(); ctx.strokeStyle="#88bbdd"; ctx.lineWidth=2; ctx.stroke();
      // Cannon
      const mx=mouseRef.current.x,my=mouseRef.current.y;
      const ang=Math.atan2(my-bY(),mx-bX());
      ctx.translate(bX(),bY()); ctx.rotate(ang);
      const cg=ctx.createLinearGradient(-6,-36,6,0);
      cg.addColorStop(0, s.rapidFireTimer>0?"#ffee88":"#cce0f0");
      cg.addColorStop(1,"#223344");
      ctx.fillStyle=cg; ctx.fillRect(-6,-36,12,36);
      ctx.fillStyle=s.rapidFireTimer>0?"#ffcc00":"#99ccee"; ctx.fillRect(-8,-38,16,9);
      ctx.restore();
      ctx.save(); ctx.translate(bX()+38,gY()-30); ctx.rotate(Date.now()*0.003);
      ctx.strokeStyle="#66aaff"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,14,-Math.PI*0.8,Math.PI*0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-14); ctx.stroke(); ctx.restore();
    }

    function drawMissileShape(m) {
      ctx.save(); ctx.translate(m.x, m.y);
      m.trail.forEach((t, i) => {
        const a=(i/m.trail.length)*0.55, r=(i/m.trail.length)*5;
        ctx.beginPath(); ctx.arc(t.x-m.x,t.y-m.y,r,0,Math.PI*2);
        ctx.fillStyle = m.type==="hypersonic"?`rgba(100,200,255,${a})`:m.type==="jet"||m.type==="f35"?`rgba(200,200,200,${a*0.5})`:`rgba(255,130,0,${a})`;
        ctx.fill();
      });
      const ang = Math.atan2(m.vy, m.vx) + Math.PI/2;
      ctx.rotate(ang);
      if (m.type==="missile") {
        ctx.fillStyle="#880000"; ctx.fillRect(-4,-16,8,26);
        ctx.beginPath(); ctx.moveTo(-4,-16); ctx.lineTo(0,-28); ctx.lineTo(4,-16); ctx.fillStyle="#cc0000"; ctx.fill();
        ctx.fillStyle="#550000";
        ctx.beginPath(); ctx.moveTo(-4,6); ctx.lineTo(-12,18); ctx.lineTo(-4,14); ctx.fill();
        ctx.beginPath(); ctx.moveTo(4,6); ctx.lineTo(12,18); ctx.lineTo(4,14); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4,10); ctx.lineTo(0,20+Math.random()*8); ctx.lineTo(4,10);
        ctx.fillStyle=`rgba(255,${140+Math.random()*115},0,0.95)`; ctx.fill();
      } else if (m.type==="f35") {
        ctx.fillStyle="#556677"; ctx.fillRect(-4,-22,8,40);
        ctx.beginPath(); ctx.moveTo(-4,-2); ctx.lineTo(-24,14); ctx.lineTo(-4,16); ctx.fillStyle="#445566"; ctx.fill();
        ctx.beginPath(); ctx.moveTo(4,-2); ctx.lineTo(24,14); ctx.lineTo(4,16); ctx.fill();
        ctx.fillStyle="#334455";
        ctx.beginPath(); ctx.moveTo(-4,12); ctx.lineTo(-12,22); ctx.lineTo(-4,18); ctx.fill();
        ctx.beginPath(); ctx.moveTo(4,12); ctx.lineTo(12,22); ctx.lineTo(4,18); ctx.fill();
        ctx.fillStyle="#88aacc"; ctx.beginPath(); ctx.ellipse(0,-12,3,6,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3,18); ctx.lineTo(0,28+Math.random()*7); ctx.lineTo(3,18);
        ctx.fillStyle="rgba(100,180,255,0.85)"; ctx.fill();
      } else if (m.type==="jet") {
        ctx.fillStyle="#4a5566"; ctx.fillRect(-5,-20,10,40);
        ctx.beginPath(); ctx.moveTo(-5,-8); ctx.lineTo(-28,14); ctx.lineTo(-5,10); ctx.fillStyle="#3a4455"; ctx.fill();
        ctx.beginPath(); ctx.moveTo(5,-8); ctx.lineTo(28,14); ctx.lineTo(5,10); ctx.fill();
        ctx.fillStyle="#2a3344";
        ctx.beginPath(); ctx.moveTo(-5,12); ctx.lineTo(-12,22); ctx.lineTo(-5,20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(5,12); ctx.lineTo(12,22); ctx.lineTo(5,20); ctx.fill();
        ctx.fillStyle="#7799bb"; ctx.beginPath(); ctx.ellipse(0,-12,4,6,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(80,160,255,0.85)";
        ctx.beginPath(); ctx.moveTo(-4,20); ctx.lineTo(-2,30+Math.random()*7); ctx.lineTo(0,20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0,20); ctx.lineTo(2,30+Math.random()*7); ctx.lineTo(4,20); ctx.fill();
      } else if (m.type==="hypersonic") {
        ctx.fillStyle="#112233";
        ctx.beginPath(); ctx.moveTo(0,-28); ctx.lineTo(-7,10); ctx.lineTo(0,8); ctx.lineTo(7,10); ctx.closePath(); ctx.fill();
        const pg=ctx.createRadialGradient(0,-15,0,0,-15,22);
        pg.addColorStop(0,"rgba(100,220,255,0.7)"); pg.addColorStop(1,"rgba(0,100,255,0)");
        ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(0,-10,22,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=`rgba(100,200,255,${0.3+Math.random()*0.4})`; ctx.lineWidth=1;
        for(let i=1;i<=3;i++){ctx.beginPath();ctx.moveTo(-i*5,-28+i*5);ctx.lineTo(-i*8,i*6);ctx.moveTo(i*5,-28+i*5);ctx.lineTo(i*8,i*6);ctx.stroke();}
      }
      ctx.restore();
    }

    function drawInterceptors() {
      s.interceptors.forEach(ic => {
        ic.trail.forEach((t,i)=>{
          const a=(i/ic.trail.length)*0.7,r=(i/ic.trail.length)*3.5;
          ctx.beginPath(); ctx.arc(t.x,t.y,r,0,Math.PI*2);
          ctx.fillStyle=`rgba(0,220,255,${a})`; ctx.fill();
        });
        ctx.save(); ctx.translate(ic.x,ic.y); ctx.rotate(Math.atan2(ic.vy,ic.vx)+Math.PI/2);
        const ig=ctx.createLinearGradient(-3,-14,3,0);
        ig.addColorStop(0,"#88eeff"); ig.addColorStop(1,"#0066aa");
        ctx.fillStyle=ig; ctx.fillRect(-3,-14,6,20);
        ctx.beginPath(); ctx.moveTo(-3,-14); ctx.lineTo(0,-22); ctx.lineTo(3,-14); ctx.fillStyle="#00ddff"; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3,6); ctx.lineTo(0,13+Math.random()*6); ctx.lineTo(3,6);
        ctx.fillStyle="rgba(0,200,255,0.85)"; ctx.fill(); ctx.restore();
      });
    }

    function drawExplosions() {
      s.explosions.forEach(ex=>{
        const {x,y,r,life,big}=ex;
        const fg=ctx.createRadialGradient(x,y,0,x,y,Math.max(r,1));
        fg.addColorStop(0,`rgba(255,255,220,${life})`);
        fg.addColorStop(0.25,`rgba(255,160,0,${life*0.85})`);
        fg.addColorStop(0.6,`rgba(200,60,0,${life*0.5})`);
        fg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(x,y,Math.max(r,1),0,Math.PI*2); ctx.fillStyle=fg; ctx.fill();
        if(big){ctx.beginPath();ctx.arc(x,y,Math.max(r*1.1,1),0,Math.PI*2);ctx.strokeStyle=`rgba(80,80,80,${life*0.3})`;ctx.lineWidth=r*0.15;ctx.stroke();}
        // Shockwave ring
        ctx.beginPath(); ctx.arc(x,y,Math.max(r*(1.4-life*0.4),1),0,Math.PI*2);
        ctx.strokeStyle=`rgba(255,200,100,${life*0.18})`; ctx.lineWidth=2; ctx.stroke();
      });
    }

    function drawDebris() {
      s.debris.forEach(d=>{
        d.x+=d.vx; d.y+=d.vy; d.vy+=0.18; d.life-=0.02; d.rot+=d.rotV;
        ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.rot); ctx.globalAlpha=d.life;
        ctx.fillStyle=d.color; ctx.fillRect(-d.size/2,-d.size/2,d.size,d.size);
        ctx.restore();
      });
      s.debris=s.debris.filter(d=>d.life>0);
    }

    function spawnDebris(x,y,n=8,color="#ff6600"){
      for(let i=0;i<n;i++) s.debris.push({x,y,vx:rand(-5,5),vy:rand(-7,1),life:rand(0.5,1),size:rand(2,7),rot:rand(0,Math.PI*2),rotV:rand(-0.25,0.25),color});
    }

    function drawPowerups() {
      s.powerupItems.forEach(p=>{
        p.bobT+=0.05; const py=p.y+Math.sin(p.bobT)*4;
        const info=POWERUPS[p.type];
        ctx.save();
        // Glow
        const glo=ctx.createRadialGradient(p.x,py,0,p.x,py,28);
        glo.addColorStop(0,info.color+"66"); glo.addColorStop(1,"transparent");
        ctx.fillStyle=glo; ctx.beginPath(); ctx.arc(p.x,py,28,0,Math.PI*2); ctx.fill();
        // Circle
        ctx.strokeStyle=info.color; ctx.lineWidth=2.5;
        ctx.fillStyle=info.color+"33";
        ctx.beginPath(); ctx.arc(p.x,py,18,0,Math.PI*2); ctx.fill(); ctx.stroke();
        // Icon
        ctx.font="18px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillStyle="#fff"; ctx.fillText(info.icon,p.x,py);
        // Label
        ctx.font="bold 9px 'Courier New'"; ctx.fillStyle=info.color;
        ctx.fillText(info.label,p.x,py+26);
        ctx.restore();
      });
    }

    function drawFloatingTexts() {
      s.floatingTexts.forEach(ft=>{
        ft.y-=1.2; ft.life-=0.025; ft.x+=ft.vx||0;
        ctx.save(); ctx.globalAlpha=ft.life;
        ctx.font=`bold ${ft.size||18}px 'Courier New'`; ctx.textAlign="center";
        ctx.fillStyle=ft.color||"#ffdd00";
        ctx.shadowColor=ft.color||"#ffdd00"; ctx.shadowBlur=8;
        ctx.fillText(ft.text,ft.x,ft.y); ctx.shadowBlur=0;
        ctx.restore();
      });
      s.floatingTexts=s.floatingTexts.filter(ft=>ft.life>0);
    }

    function addFloat(text,x,y,color="#ffdd00",size=18,vx=0){
      s.floatingTexts.push({text,x,y,color,size,life:1,vx});
    }

    function drawCrosshair() {
      if(s.phase!=="playing") return;
      const {x,y}=mouseRef.current;
      ctx.save();
      const col=s.rapidFireTimer>0?"rgba(255,220,0,0.9)":"rgba(255,60,60,0.9)";
      ctx.strokeStyle=col; ctx.lineWidth=1.5;
      const sz=18;
      ctx.beginPath();
      ctx.moveTo(x-sz,y);ctx.lineTo(x-6,y);ctx.moveTo(x+6,y);ctx.lineTo(x+sz,y);
      ctx.moveTo(x,y-sz);ctx.lineTo(x,y-6);ctx.moveTo(x,y+6);ctx.lineTo(x,y+sz);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.strokeStyle=col.replace("0.9","0.45"); ctx.stroke();
      // Nearest threat label
      const near=s.missiles.reduce((b,m)=>{const d=Math.hypot(m.x-x,m.y-y);return d<(b?.d??180)?{m,d}:b;},null);
      if(near){
        ctx.font="11px 'Courier New'"; ctx.fillStyle="#ff8888"; ctx.textAlign="left";
        const L={missile:"BALLISTIC",jet:"F-22 RAPTOR",f35:"F-35 LIGHTNING",hypersonic:"HYPERSONIC ×2"};
        ctx.fillText(L[near.m.type]||near.m.type.toUpperCase(),x+14,y-14);
      }
      ctx.restore();
    }

    function drawHUD() {
      // Top bar
      ctx.fillStyle="rgba(0,12,28,0.7)"; ctx.fillRect(0,0,W(),56);
      // Lives
      ctx.font="bold 20px 'Courier New'"; ctx.fillStyle="#ff5555";
      for(let i=0;i<s.lives;i++) ctx.fillText("♥",16+i*28,36);
      // Interceptor pods
      const podX=W()*0.36;
      ctx.font="10px 'Courier New'"; ctx.fillStyle="#88aacc"; ctx.textAlign="center";
      ctx.fillText("INTERCEPTORS",podX,15);
      const maxPods=s.rapidFireTimer>0?5:3;
      for(let i=0;i<3;i++){
        const px=podX-22+i*22;
        ctx.fillStyle=i<s.interceptorsLeft?(s.rapidFireTimer>0?"#ffcc00":"#00ddff"):"#1a3344";
        ctx.fillRect(px-7,19,14,24);
        ctx.strokeStyle="#334455"; ctx.lineWidth=1; ctx.strokeRect(px-7,19,14,24);
      }
      if(s.interceptorsLeft<3){
        const pct=s.reloadTimer/s.reloadDuration;
        ctx.fillStyle="#112233"; ctx.fillRect(podX-36,45,72,6);
        const rColor=s.rapidFireTimer>0?"#ffcc00":"#00aaff";
        ctx.fillStyle=rColor; ctx.fillRect(podX-36,45,72*pct,6);
      }
      // Score
      ctx.font="bold 22px 'Courier New'"; ctx.fillStyle="#e8f4aa"; ctx.textAlign="right";
      ctx.fillText(`SCORE: ${s.score}`,W()-14,36);
      // Wave
      ctx.font="bold 14px 'Courier New'"; ctx.fillStyle="#ffdd44"; ctx.textAlign="center";
      ctx.fillText(`⚡ WAVE ${s.wave}`,W()/2,32);
      // Active powerup icons
      let pix=14;
      if(s.shieldTimer>0){
        ctx.font="14px sans-serif"; ctx.fillStyle="#00ddff"; ctx.textAlign="left";
        ctx.fillText(`🛡 ${Math.ceil(s.shieldTimer/60)}s`,pix,52); pix+=70;
      }
      if(s.rapidFireTimer>0){
        ctx.font="14px sans-serif"; ctx.fillStyle="#ffcc00"; ctx.textAlign="left";
        ctx.fillText(`⚡ ${Math.ceil(s.rapidFireTimer/60)}s`,pix,52);
      }
      ctx.textAlign="left";
    }

    function drawWaveMsg() {
      // drawn from React overlay
    }

    // ── UPDATE ─────────────────────────────────────────────────
    function update() {
      if(s.phase!=="playing") return;
      s.frameCount++;
      if(s.screenShake>0) s.screenShake-=0.5;
      // Powerup timers
      if(s.shieldTimer>0) s.shieldTimer--;
      if(s.rapidFireTimer>0) {
        s.rapidFireTimer--;
        s.reloadDuration=80;
      } else {
        s.reloadDuration=180;
      }

      // Spawn threat
      const waveStillSpawning = s.waveSpawned < s.waveTotal;
      if(waveStillSpawning){
        s.spawnTimer++;
        if(s.spawnTimer>=s.spawnInterval){
          s.spawnTimer=0;
          spawnThreat(s,W(),H());
        }
      }

      // Spawn powerup occasionally
      if(s.frameCount%420===0 && Math.random()<0.65) spawnPowerup(s,W(),H());

      // Wave complete?
      const waveAllDone = s.waveSpawned>=s.waveTotal && s.missiles.length===0 && s.interceptors.length===0;
      if(waveAllDone && s.phase==="playing"){
        s.phase="wavebreak";
        const bonus=s.lives*100+(s.wave*50);
        s.score+=bonus;
        addFloat(`WAVE ${s.wave} CLEAR! +${bonus}`,W()/2,H()*0.4,"#00ffcc",26);
        sfx().waveStart(s.wave+1);
        setTimeout(()=>{
          if(phaseRef.current==="playing"){
            s.phase="playing";
            startWave(s,W(),H(),s.wave+1);
          }
        },3500);
      }

      // Reload
      if(s.interceptorsLeft<3){
        s.reloadTimer++;
        if(s.reloadTimer>=s.reloadDuration){s.interceptorsLeft=3;s.reloadTimer=0;}
      }

      // Move missiles
      s.missiles.forEach(m=>{m.trail.push({x:m.x,y:m.y});if(m.trail.length>22)m.trail.shift();m.x+=m.vx;m.y+=m.vy;});

      // Move interceptors
      s.interceptors.forEach(ic=>{ic.trail.push({x:ic.x,y:ic.y});if(ic.trail.length>14)ic.trail.shift();ic.x+=ic.vx;ic.y+=ic.vy;});

      // Powerup movement & collection
      s.powerupItems.forEach(p=>{p.y+=p.vy;});
      for(let i=s.powerupItems.length-1;i>=0;i--){
        const p=s.powerupItems[i];
        if(Math.hypot(p.x-bX(),p.y-bY())<50){
          sfx().powerUp();
          if(p.type==="shield") s.shieldTimer=POWERUPS.shield.dur;
          else if(p.type==="rapidfire"){s.rapidFireTimer=POWERUPS.rapidfire.dur;s.interceptorsLeft=3;}
          else if(p.type==="areaBlast"){
            sfx().areaBlast();
            s.missiles.forEach(m=>{
              s.explosions.push({id:uid(),x:m.x,y:m.y,r:0,maxR:55,life:1,big:true});
              spawnDebris(m.x,m.y,10,m.type==="jet"||m.type==="f35"?"#aaaaaa":"#ff6600");
              s.score+=150;
            });
            s.missiles=[];
            s.screenShake=20;
            addFloat("AREA BLAST!",W()/2,H()*0.35,"#ff8800",30);
          } else if(p.type==="extraLife"){
            s.lives=Math.min(s.lives+1,6);
            addFloat("❤ +1 LIFE",bX(),bY()-60,"#ff4444",22);
          }
          const info=POWERUPS[p.type];
          addFloat(info.icon+" "+info.label,p.x,p.y-20,info.color,18);
          s.powerupItems.splice(i,1);
        } else if(p.y>gY()+40){
          s.powerupItems.splice(i,1);
        }
      }

      // Interceptor vs missile collision
      for(let i=s.interceptors.length-1;i>=0;i--){
        const ic=s.interceptors[i]; let hit=false;
        for(let j=s.missiles.length-1;j>=0;j--){
          const m=s.missiles[j];
          if(Math.hypot(ic.x-m.x,ic.y-m.y)<28){
            m.health--;
            if(m.health<=0){
              const big=m.type==="hypersonic"||m.type==="jet"||m.type==="f35";
              const pts=m.type==="hypersonic"?400:m.type==="jet"||m.type==="f35"?250:100;
              s.explosions.push({id:uid(),x:m.x,y:m.y,r:0,maxR:big?65:42,life:1,big});
              spawnDebris(m.x,m.y,big?14:8,m.type==="jet"||m.type==="f35"?"#aaaaaa":"#ff6600");
              sfx().bigExplosion(); s.missiles.splice(j,1); s.score+=pts; hit=true;
              addFloat(`+${pts}`,m.x,m.y,big?"#ff8844":"#ffdd44",big?22:16,rand(-0.5,0.5));
              s.screenShake=big?12:5;
            } else {
              s.explosions.push({id:uid(),x:m.x,y:m.y,r:0,maxR:22,life:1,big:false});
              sfx().smallExplosion(); hit=true;
              addFloat("HIT!",m.x,m.y,"#ff6600",14);
            }
            break;
          }
        }
        const ddx=ic.x-ic.tx,ddy=ic.y-ic.ty;
        if(hit||Math.hypot(ddx,ddy)<14||ic.x<0||ic.x>W()||ic.y<0||ic.y>H()){
          if(!hit){s.explosions.push({id:uid(),x:ic.tx,y:ic.ty,r:0,maxR:22,life:1,big:false});sfx().smallExplosion();}
          s.interceptors.splice(i,1);
        }
      }

      // Missiles hitting ground / base
      for(let j=s.missiles.length-1;j>=0;j--){
        const m=s.missiles[j];
        const atBase=Math.hypot(m.x-bX(),m.y-bY())<38;
        if(m.y>=gY()||atBase){
          if(s.shieldTimer>0){
            // Shield absorbs it
            sfx().shieldHit();
            s.explosions.push({id:uid(),x:m.x,y:atBase?bY():gY(),r:0,maxR:45,life:1,big:false});
            spawnDebris(m.x,atBase?bY():gY(),8,"#00aaff");
            addFloat("SHIELD!",bX(),bY()-80,"#00ddff",20);
            s.missiles.splice(j,1);
            continue;
          }
          // Find nearest building and damage it
          let nearIdx=-1, nearDist=Infinity;
          BUILDINGS.forEach(([xf,,],bi)=>{const d=Math.abs(m.x-xf*W());if(d<nearDist){nearDist=d;nearIdx=bi;}});
          if(nearIdx>=0){
            s.buildingDamage[nearIdx]=(s.buildingDamage[nearIdx]||0)+1;
            sfx().buildingHit();
          }
          s.explosions.push({id:uid(),x:m.x,y:atBase?bY():gY(),r:0,maxR:75,life:1,big:true});
          spawnDebris(m.x,atBase?bY():gY(),18,"#ff4400");
          sfx().bigExplosion(); s.screenShake=18;
          s.missiles.splice(j,1); s.lives--;
          addFloat("💥 BASE HIT!",W()/2,H()*0.45,"#ff3333",24);
          if(s.lives<=0){
            s.phase="gameover"; sfx().gameOver();
            const finalScores=saveScore({name:playerName,score:s.score,wave:s.wave,date:new Date().toLocaleDateString()});
            setScores(finalScores);
            setPhaseSync("gameover");
            setUiData(u=>({...u,lives:0,score:s.score,wave:s.wave}));
          } else {
            setUiData(u=>({...u,lives:s.lives}));
          }
        }
      }

      // Explosions
      s.explosions.forEach(ex=>{ex.r=ex.maxR*Math.min(1,(1-ex.life)*3.5);ex.life-=0.028;});
      s.explosions=s.explosions.filter(e=>e.life>0);

      setUiData({
        score:s.score,lives:s.lives,wave:s.wave,
        interceptorsLeft:s.interceptorsLeft,reloadPct:s.reloadTimer/s.reloadDuration,
        shieldActive:s.shieldTimer>0,rapidFireActive:s.rapidFireTimer>0,
        waveMsg:"",
      });
    }

    function loop() {
      const shake=s.screenShake;
      if(shake>0){ctx.save();ctx.translate(rand(-shake,shake),rand(-shake,shake));}
      ctx.clearRect(-50,-50,W()+100,H()+100);
      drawSky(); drawSun(); drawMountains(); drawClouds(); drawBirds();
      drawGround(); drawLevantineCity(); drawBase();
      s.missiles.forEach(m=>drawMissileShape(m));
      drawInterceptors(); drawExplosions(); drawDebris();
      drawPowerups(); drawFloatingTexts();
      drawCrosshair(); drawHUD();
      if(shake>0) ctx.restore();
      update();
      animRef.current=requestAnimationFrame(loop);
    }
    animRef.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(animRef.current);
  }, [phase, playerName]);

  useEffect(()=>{
    function onResize(){if(canvasRef.current){canvasRef.current.width=window.innerWidth;canvasRef.current.height=window.innerHeight;}}
    window.addEventListener("resize",onResize);
    return ()=>window.removeEventListener("resize",onResize);
  },[]);

  const handleClick=useCallback((e)=>{
    sfx().resume();
    const s=stateRef.current;
    if(!s||s.phase!=="playing") return;
    if(s.interceptorsLeft<=0) return;
    const rect=canvasRef.current.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    const baseX=canvasRef.current.width/2,baseY=canvasRef.current.height*GROUND_FRAC-8;
    const dx=x-baseX,dy=y-baseY,len=Math.sqrt(dx*dx+dy*dy);
    const spd=s.rapidFireTimer>0?9:7;
    s.interceptors.push({id:uid(),x:baseX,y:baseY,vx:(dx/len)*spd,vy:(dy/len)*spd,tx:x,ty:y,trail:[]});
    s.interceptorsLeft--;
    sfx().interceptorFire();
  },[]);

  const handleTouch=useCallback((e)=>{
    e.preventDefault();
    sfx().resume();
    const s=stateRef.current;
    if(!s||s.phase!=="playing") return;
    Array.from(e.changedTouches).forEach(touch=>{
      if(s.interceptorsLeft<=0) return;
      const rect=canvasRef.current.getBoundingClientRect();
      const x=touch.clientX-rect.left,y=touch.clientY-rect.top;
      const baseX=canvasRef.current.width/2,baseY=canvasRef.current.height*GROUND_FRAC-8;
      const dx=x-baseX,dy=y-baseY,len=Math.sqrt(dx*dx+dy*dy);
      const spd=s.rapidFireTimer>0?9:7;
      s.interceptors.push({id:uid(),x:baseX,y:baseY,vx:(dx/len)*spd,vy:(dy/len)*spd,tx:x,ty:y,trail:[]});
      s.interceptorsLeft--;
      sfx().interceptorFire();
    });
  },[]);

  const handleMouseMove=useCallback((e)=>{
    const rect=canvasRef.current?.getBoundingClientRect();
    if(!rect) return;
    mouseRef.current={x:e.clientX-rect.left,y:e.clientY-rect.top};
  },[]);

  const handleTouchMove=useCallback((e)=>{
    const rect=canvasRef.current?.getBoundingClientRect();
    if(!rect) return;
    const t=e.touches[0];
    mouseRef.current={x:t.clientX-rect.left,y:t.clientY-rect.top};
  },[]);

  function handleStart(){
    sfx().uiClick(); sfx().resume();
    stateRef.current=makeState();
    const c=canvasRef.current;
    if(c) initEnv(stateRef.current,c.width,c.height);
    phaseRef.current="playing";
    setPhase("playing");
    setUiData({score:0,lives:3,wave:1,interceptorsLeft:3,reloadPct:0,shieldActive:false,rapidFireActive:false,waveMsg:""});
  }
  function handlePause(){
    sfx().uiClick();
    if(!stateRef.current) return;
    if(phase==="playing"){stateRef.current.phase="paused";setPhaseSync("paused");}
    else if(phase==="paused"){stateRef.current.phase="playing";setPhaseSync("playing");}
  }
  function handleQuit(){
    sfx().uiClick(); cancelAnimationFrame(animRef.current); stateRef.current=null;
    setPhaseSync("menu");
  }

  const B=(props)=>{
    const {children,onClick,style={},danger=false}=props;
    const base={padding:"11px 28px",fontFamily:"'Courier New',monospace",fontSize:15,fontWeight:"bold",letterSpacing:2,border:"2px solid",borderRadius:4,cursor:"pointer",transition:"all 0.15s",textTransform:"uppercase",outline:"none",...style};
    const normal=danger?{background:"rgba(35,0,0,0.9)",color:"#ff8888",borderColor:"#882222"}:{background:"rgba(0,25,50,0.9)",color:"#00ddff",borderColor:"#00aaff"};
    return <button style={{...base,...normal}} onClick={onClick}
      onMouseEnter={e=>{e.target.style.background=danger?"rgba(80,0,0,0.95)":"rgba(0,60,100,0.95)";sfx().uiHover();}}
      onMouseLeave={e=>e.target.style.background=normal.background}>{children}</button>;
  };

  const overlay={position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20};
  const title=(text,color="#00ccff",size="clamp(28px,5vw,62px)")=>
    <div style={{fontFamily:"'Courier New',monospace",color,fontSize:size,fontWeight:"bold",letterSpacing:5,textShadow:`0 0 30px ${color}`,textAlign:"center"}}>{text}</div>;

  return (
    <div style={{width:"100vw",height:"100vh",overflow:"hidden",background:"#000",cursor:"none",position:"relative"}}>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight}
        onClick={handleClick} onMouseMove={handleMouseMove}
        onTouchStart={handleTouch} onTouchMove={handleTouchMove}
        style={{display:"block",width:"100vw",height:"100vh",touchAction:"none"}} />

      {/* ── MAIN MENU ── */}
      {phase==="menu" && (
        <div style={{...overlay,background:"rgba(0,8,18,0.82)"}}>
          {title("⚔ MISSILE DEFENSE")}
          <div style={{fontFamily:"'Courier New',monospace",color:"#aaccdd",fontSize:"clamp(12px,1.5vw,16px)",textAlign:"center",lineHeight:2,maxWidth:560,padding:"0 20px"}}>
            Defend the Levantine city from incoming air attacks.<br/>
            <span style={{color:"#ff8844"}}>🚀 Missiles</span> · <span style={{color:"#88bbee"}}>✈ F-35</span> · <span style={{color:"#aabbcc"}}>✈ F-22</span> · <span style={{color:"#44ccff"}}>⚡ Hypersonics ×2 hits</span><br/>
            <span style={{color:"#00ffcc"}}>🛡 Shield · ⚡ Rapid Fire · 💥 Area Blast · ❤ Extra Life</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginTop:4}}>
            <div style={{fontFamily:"'Courier New',monospace",color:"#888",fontSize:13}}>ENTER YOUR NAME:</div>
            <input value={playerName} onChange={e=>setPlayerName(e.target.value.toUpperCase().slice(0,12))}
              style={{background:"rgba(0,30,50,0.9)",border:"2px solid #00aaff",color:"#00ddff",padding:"8px 16px",fontFamily:"'Courier New',monospace",fontSize:18,fontWeight:"bold",letterSpacing:4,textAlign:"center",outline:"none",borderRadius:4,width:200}}/>
          </div>
          <div style={{display:"flex",gap:14,marginTop:4}}>
            <B onClick={handleStart} style={{fontSize:20,padding:"16px 50px",boxShadow:"0 0 24px #00aaff44"}}>▶ START</B>
            <B onClick={()=>{sfx().uiClick();setPhase("leaderboard");}} style={{fontSize:16,padding:"12px 28px"}}>🏆 SCORES</B>
          </div>
        </div>
      )}

      {/* ── PLAYING: in-game buttons ── */}
      {(phase==="playing"||phase==="paused") && (
        <div style={{position:"absolute",top:60,right:14,display:"flex",gap:8,zIndex:10}}>
          <B onClick={handlePause} style={{fontSize:12,padding:"7px 16px"}}>{phase==="paused"?"▶ RESUME":"⏸ PAUSE"}</B>
          <B onClick={handleQuit} danger style={{fontSize:12,padding:"7px 16px"}}>✕ QUIT</B>
        </div>
      )}

      {/* ── WAVE message banner ── */}
      {phase==="playing" && uiData.waveMsg && (
        <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",fontFamily:"'Courier New',monospace",color:"#ffdd44",fontSize:"clamp(16px,3vw,28px)",fontWeight:"bold",background:"rgba(0,0,0,0.6)",padding:"14px 36px",borderRadius:6,border:"2px solid #ffdd44",letterSpacing:3,textShadow:"0 0 16px #ffaa00",zIndex:20,pointerEvents:"none",animation:"fadeSlide 0.4s ease-out"}}>
          {uiData.waveMsg}
        </div>
      )}

      {/* ── PAUSED ── */}
      {phase==="paused" && (
        <div style={{...overlay,background:"rgba(0,0,0,0.55)"}}>
          {title("⏸ PAUSED","#ffdd44")}
          <div style={{display:"flex",gap:14}}>
            <B onClick={handlePause}>▶ RESUME</B>
            <B onClick={handleQuit} danger>✕ QUIT</B>
          </div>
        </div>
      )}

      {/* ── GAME OVER ── */}
      {phase==="gameover" && (
        <div style={{...overlay,background:"rgba(0,0,0,0.78)"}}>
          {title("☠ BASE DESTROYED","#ff2222")}
          <div style={{fontFamily:"'Courier New',monospace",color:"#ffdd44",fontSize:"clamp(18px,3vw,32px)",fontWeight:"bold"}}>
            SCORE: {uiData.score}
          </div>
          <div style={{fontFamily:"'Courier New',monospace",color:"#aaa",fontSize:15}}>Wave reached: {uiData.wave}</div>
          {/* Mini leaderboard */}
          <div style={{background:"rgba(0,20,40,0.8)",border:"1px solid #334",borderRadius:6,padding:"12px 24px",marginTop:4,minWidth:280}}>
            <div style={{fontFamily:"'Courier New',monospace",color:"#ffdd44",fontSize:13,fontWeight:"bold",letterSpacing:3,marginBottom:8,textAlign:"center"}}>🏆 TOP SCORES</div>
            {scores.slice(0,5).map((sc,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",gap:24,fontFamily:"'Courier New',monospace",fontSize:13,color:i===0?"#ffdd44":i<3?"#aaccee":"#667788",padding:"2px 0"}}>
                <span>{i+1}. {sc.name}</span><span>{sc.score}</span><span style={{color:"#556677"}}>W{sc.wave}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:14,marginTop:4}}>
            <B onClick={handleStart} style={{fontSize:17}}>▶ PLAY AGAIN</B>
            <B onClick={handleQuit} style={{fontSize:17}}>⬅ MENU</B>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {phase==="leaderboard" && (
        <div style={{...overlay,background:"rgba(0,8,20,0.92)"}}>
          {title("🏆 LEADERBOARD","#ffdd44","clamp(24px,4vw,48px)")}
          <div style={{background:"rgba(0,20,40,0.9)",border:"2px solid #446",borderRadius:8,padding:"18px 36px",minWidth:340,marginTop:8}}>
            {scores.length===0
              ? <div style={{fontFamily:"'Courier New',monospace",color:"#556",textAlign:"center",padding:20}}>No scores yet. Play to set a record!</div>
              : scores.map((sc,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",gap:32,fontFamily:"'Courier New',monospace",fontSize:15,color:i===0?"#ffdd44":i<3?"#aaccee":"#8899aa",padding:"5px 0",borderBottom:i<scores.length-1?"1px solid #223":"none"}}>
                  <span style={{color:i===0?"#ffaa00":"#667"}}>{i+1}.</span>
                  <span style={{flex:1}}>{sc.name}</span>
                  <span style={{color:"#00ddff"}}>{sc.score}</span>
                  <span style={{color:"#556677"}}>Wave {sc.wave}</span>
                  <span style={{color:"#445",fontSize:11}}>{sc.date}</span>
                </div>
              ))
            }
          </div>
          <div style={{display:"flex",gap:14,marginTop:12}}>
            <B onClick={handleStart}>▶ PLAY</B>
            <B onClick={()=>{sfx().uiClick();setPhase("menu");}}>⬅ BACK</B>
            <B onClick={()=>{sfx().uiClick();localStorage.removeItem(LS_KEY);setScores([]);}} danger style={{fontSize:12,padding:"8px 16px"}}>🗑 CLEAR</B>
          </div>
        </div>
      )}

      {/* ── Reload warning ── */}
      {phase==="playing" && uiData.interceptorsLeft===0 && (
        <div style={{position:"absolute",bottom:22,left:"50%",transform:"translateX(-50%)",fontFamily:"'Courier New',monospace",color:"#ff5555",fontSize:13,fontWeight:"bold",background:"rgba(0,0,0,0.7)",padding:"7px 20px",borderRadius:4,border:"1px solid #ff4444",letterSpacing:2,animation:"blink 0.55s infinite alternate",pointerEvents:"none"}}>
          ⚠ RELOADING {Math.round(uiData.reloadPct*100)}%
        </div>
      )}

      <style>{`
        @keyframes blink{from{opacity:0.5}to{opacity:1}}
        @keyframes fadeSlide{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        *{box-sizing:border-box;}
        input{cursor:text!important;}
      `}</style>
    </div>
  );
}
