// Âm thanh tổng hợp bằng WebAudio (không cần file): hiệu ứng + nhạc nền nhẹ theo khu vực.
let ctx = null, S = () => ({}), area = 'forest', n = 0;
const SCALES = { forest: [0, 2, 4, 7, 9], cave: [0, 3, 5, 7, 10], volcano: [0, 1, 5, 7, 8], ice: [0, 2, 3, 7, 9], dark: [0, 1, 3, 6, 8], tower: [0, 2, 4, 6, 9], survival: [0, 3, 5, 6, 10] };

function tone(f, d, type, v, slide) {
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(ctx.destination); o.start(); o.stop(t + d);
}

export function initAudio(getSet, areaId) {
  S = getSet; area = areaId;
  const unlock = () => { // trình duyệt chỉ cho phát âm thanh sau thao tác của người dùng
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  };
  ['pointerdown', 'keydown'].forEach(e => window.addEventListener(e, unlock));
  setInterval(() => {
    const s = S();
    if (!ctx || ctx.state !== 'running' || !s.music) return;
    const sc = SCALES[area] || SCALES.forest;
    if (n++ % 2 === 0) tone(110 * Math.pow(2, sc[(n >> 1) % sc.length] / 12) * (n % 16 < 8 ? 1 : 1.5), 0.4, 'sine', 0.05 * s.vol);
  }, 420);
}

export function sfx(name) {
  const s = S();
  if (!ctx || ctx.state !== 'running' || !s.sfx) return;
  const v = 0.15 * s.vol;
  const fx = {
    hit: () => tone(220, 0.08, 'square', v, 110), crit: () => tone(440, 0.12, 'square', v, 220),
    skill: () => tone(300, 0.25, 'sawtooth', v, 900), hurt: () => tone(120, 0.2, 'sawtooth', v, 60),
    pick: () => tone(660, 0.1, 'triangle', v, 990),
    level: () => { tone(523, 0.2, 'triangle', v); setTimeout(() => tone(784, 0.3, 'triangle', v), 150); },
  };
  if (fx[name]) fx[name]();
}
