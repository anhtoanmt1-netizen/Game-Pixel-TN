// LÒ RÈN: bảng giao diện riêng cho Cường hóa · Đổi dòng · Thức tỉnh · Đột phá, có hoạt ảnh, ánh sáng và hạt năng lượng.
// Thay thế hoàn toàn các hộp confirm/alert/prompt cũ. Logic nằm trong items.js (hàm thuần); ở đây chỉ hiển thị và phát hiệu ứng.
import { RARITY, BONUS_LABEL, fmt2, enhanceInfo, doEnhance, itemLines, diffTotals, withChange, rerollOptions, applyReroll, rerollCost,
  awakenState, awkLv, doAwaken, rerollAwakenCost, AW, AWK_MULT, CLASS_FX, TRANS_TIERS, TRANS_MAIN, transState, doTranscend, trTier, enhCap, msCount } from './items.js';
import { icon, statIcon } from './icons.js';
import { itemName, iconStyle, glowColor } from './inv.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FLAT = new Set(['atk', 'hp', 'def']);
const val = (t, v) => FLAT.has(t) ? String(Math.round(v)) : fmt2(v) + '%';
const lab = t => (BONUS_LABEL[t] || t) + (t.endsWith('_pct') ? ' (%)' : '');
const sgn = (t, v) => (v >= 0 ? '+' : '−') + val(t, Math.abs(v));
export const MODES = {
  enhance:   { name: 'Cường Hóa', icon: 'enhance', color: '#ff9a3c', verb: 'CƯỜNG HÓA', sub: 'Tăng chỉ số chính và mọi dòng phụ của trang bị' },
  reroll:    { name: 'Đổi Dòng', icon: 'reroll', color: '#4ad8f0', verb: 'QUAY DÒNG', sub: 'Chọn 1 trong 3 thuộc tính mới cho một dòng phụ' },
  awaken:    { name: 'Thức Tỉnh', icon: 'awaken', color: '#b78bff', verb: 'THỨC TỈNH', sub: 'Mở dòng đặc biệt và nội tại riêng của lớp nhân vật' },
  transcend: { name: 'Đột Phá', icon: 'transcend', color: '#ffd34d', verb: 'ĐỘT PHÁ', sub: 'Vượt giới hạn: nhân chỉ số chính, thêm dòng và dư chấn' },
};
const ORDER = ['enhance', 'reroll', 'awaken', 'transcend'];

const CSS = `
.fg{position:absolute;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,#0b0d14ee,#000000f7);font-family:'Montserrat',sans-serif;color:#eadfc6;font-size:calc(var(--u,10)*.92px);--c:#ff9a3c}
.fg.on{display:flex;animation:fgIn .35s cubic-bezier(.2,.9,.3,1)}
.fg *{box-sizing:border-box}
@keyframes fgIn{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:none}}
.fgp{position:relative;width:80%;height:84%;display:flex;flex-direction:column;border-radius:.7em;background:linear-gradient(160deg,#1b1d26,#0c0d12 70%);border:.2em solid #9c7a3c;box-shadow:0 0 0 .15em #231707,0 0 0 .32em #6b4a1a,0 0 3.5em #000,0 0 5em color-mix(in srgb,var(--c) 28%,transparent),inset 0 0 3em #000;transition:box-shadow .5s}
.fgp::before{content:"";position:absolute;inset:0;border-radius:.5em;pointer-events:none;background:radial-gradient(ellipse at 28% 45%,color-mix(in srgb,var(--c) 16%,transparent),transparent 60%);transition:background .5s}
.fgc{position:absolute;width:2.4em;height:2.4em;pointer-events:none;color:#e6bf6a;z-index:3}.fgc svg{width:100%;height:100%}
.fgc.a{left:-.9em;top:-.9em}.fgc.b{right:-.9em;top:-.9em;transform:scaleX(-1)}.fgc.c{left:-.9em;bottom:-.9em;transform:scaleY(-1)}.fgc.d{right:-.9em;bottom:-.9em;transform:scale(-1)}
.fgh{display:flex;align-items:center;gap:1em;padding:.7em 1.2em;border-bottom:.1em solid #3d2f14;background:linear-gradient(180deg,#2a2112,#16120b);border-radius:.5em .5em 0 0;position:relative;z-index:2}
.fgh h2{margin:0;font-size:1.5em;letter-spacing:.14em;color:#ffe7b0;text-shadow:0 0 .8em var(--c),0 .1em .2em #000;white-space:nowrap;display:flex;align-items:center;gap:.5em}
.fgtabs{display:flex;gap:.5em;margin-left:auto}
.fgtab{display:flex;align-items:center;gap:.45em;padding:.4em .9em;border:.1em solid #4a3a1c;border-radius:.5em;background:#14110a;color:#b9a77d;font:700 .9em Montserrat,sans-serif;cursor:pointer;transition:all .25s;position:relative;overflow:hidden}
.fgtab:hover{filter:brightness(1.25)}
.fgtab.on{color:#fff;border-color:var(--tc);background:linear-gradient(180deg,color-mix(in srgb,var(--tc) 42%,#14110a),#14110a);box-shadow:0 0 1em color-mix(in srgb,var(--tc) 60%,transparent),inset 0 0 .8em color-mix(in srgb,var(--tc) 40%,transparent)}
.fgx{width:2.2em;height:2.2em;border:.1em solid #6b4a1a;border-radius:50%;background:#14110a;color:#e6bf6a;cursor:pointer;font:800 1em Montserrat,sans-serif}.fgx:hover{background:#3a1a14;color:#fff}
.fgb{flex:1;min-height:0;display:grid;grid-template-columns:26% 1fr 31%;gap:1em;padding:1em 1.2em;position:relative;z-index:2}
.fgl{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;border:.1em solid #3d2f14;border-radius:.6em;background:radial-gradient(ellipse at 50% 55%,#1c2030,#0a0b10);overflow:hidden}
.fgaura{position:absolute;left:50%;top:44%;width:92%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--rc) 55%,transparent),transparent 65%);animation:fgPulse 3s ease-in-out infinite}
@keyframes fgPulse{50%{opacity:.55;transform:translate(-50%,-50%) scale(1.12)}}
.fgring{position:absolute;left:50%;top:44%;width:86%;aspect-ratio:1;transform:translate(-50%,-50%);animation:fgSpin 24s linear infinite;opacity:.85;color:var(--c)}
.fgring.r2{width:66%;animation-duration:15s;animation-direction:reverse;opacity:.6}
@keyframes fgSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
.fg.busy .fgring{animation-duration:2.2s}.fg.busy .fgring.r2{animation-duration:1.4s}.fg.busy .fgaura{animation-duration:.5s}
.fgit{position:relative;width:52%;aspect-ratio:1;margin-top:-6%;animation:fgFloat 3.4s ease-in-out infinite;filter:drop-shadow(0 .4em .4em #0009)}
@keyframes fgFloat{50%{transform:translateY(-6%)}}
.fgi{position:absolute;inset:0;background:url(assets/ui/equip.png) no-repeat;background-size:700% 1700%}
.fgit.pop{animation:fgPop .7s cubic-bezier(.2,1.4,.4,1)}@keyframes fgPop{0%{transform:scale(.7)}45%{transform:scale(1.28)}100%{transform:scale(1)}}
.fgit.shake{animation:fgShake .55s}@keyframes fgShake{10%,50%,90%{transform:translateX(-4%)}30%,70%{transform:translateX(4%)}}
.fgit .crack{position:absolute;inset:0;opacity:0;pointer-events:none}.fgit.fail .crack{animation:fgCrack 1.6s forwards}@keyframes fgCrack{10%{opacity:1}100%{opacity:.8}}
.fgit .crack path{stroke-dasharray:140;stroke-dashoffset:140}.fgit.fail .crack path{animation:fgDraw .5s forwards}@keyframes fgDraw{to{stroke-dashoffset:0}}
.fgfloor{position:absolute;left:50%;top:63%;width:62%;height:10%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse,#000d,transparent 70%)}
.fgname{position:absolute;left:0;right:0;bottom:6%;text-align:center;padding:0 .6em}
.fgname b{display:block;font-size:1.1em;text-shadow:0 0 .6em currentColor}.fgname span{font-size:.8em;color:#a99c80}
.fglv{position:absolute;right:.8em;top:.7em;padding:.15em .6em;border-radius:2em;border:.1em solid var(--c);background:#0008;font-weight:800;font-size:1.05em;color:#ffe7b0;box-shadow:0 0 .8em var(--c)}
.fgm{position:relative;display:flex;flex-direction:column;gap:.8em;min-width:0;min-height:0;overflow:auto;padding-right:.2em}
.fgm.swap>*{animation:fgSwap .38s cubic-bezier(.2,.9,.3,1) both}.fgm.swap>*:nth-child(2){animation-delay:.05s}.fgm.swap>*:nth-child(3){animation-delay:.1s}.fgm.swap>*:nth-child(4){animation-delay:.15s}
@keyframes fgSwap{from{opacity:0;transform:translateX(1.6em)}to{opacity:1;transform:none}}
.fgsub{color:#bfae85;font-size:.92em;line-height:1.4}
.fgcard{border:.1em solid #3d2f14;border-radius:.6em;background:linear-gradient(160deg,#171922,#0d0e13);padding:.7em .9em}
.fgcard h4{margin:0 0 .4em;font-size:.95em;letter-spacing:.06em;color:var(--c);display:flex;align-items:center;gap:.4em}
.fglvbig{display:flex;align-items:center;justify-content:center;gap:.7em;font-weight:800;font-size:2.4em;text-shadow:0 0 .6em var(--c)}
.fglvbig i{font-style:normal;color:var(--c)}.fglvbig b{color:#fff}.fglvbig span{color:#8d8470}
.fggauge{display:flex;align-items:center;gap:1em}
.fggauge svg{width:5.6em;height:5.6em;flex:none;transform:rotate(-90deg)}
.fggauge .t{stroke:#2a2418}.fggauge .p{stroke:var(--c);stroke-linecap:round;transition:stroke-dasharray .6s;filter:drop-shadow(0 0 .3em var(--c))}
.fggauge .n{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.3em;color:#fff}
.fgtrack{display:flex;align-items:center;gap:0;margin:.4em .2em}
.fgnode{flex:1;display:flex;flex-direction:column;align-items:center;gap:.25em;position:relative;font-size:.8em;color:#7d7461;font-weight:700}
.fgnode::before{content:"";position:absolute;left:-50%;right:50%;top:.9em;height:.25em;background:#2a2418}.fgnode:first-child::before{display:none}
.fgnode.done::before{background:var(--c)}
.fgnode b{position:relative;width:1.9em;height:1.9em;border-radius:50%;border:.15em solid #4a3f28;background:#14110a;display:flex;align-items:center;justify-content:center;color:#8d8470}
.fgnode.done b{border-color:var(--c);background:color-mix(in srgb,var(--c) 55%,#14110a);color:#fff;box-shadow:0 0 .7em var(--c)}
.fgnode.next b{border-color:#fff;animation:fgPulse2 1.2s infinite}@keyframes fgPulse2{50%{box-shadow:0 0 1em var(--c)}}
.fgnode.lock b{opacity:.45}
.fgnode small{color:#a99c80;font-weight:600;font-size:.85em}
.fgrows{display:flex;flex-direction:column;gap:.35em}
.fgline{display:flex;align-items:center;gap:.7em;padding:.5em .8em;border:.12em solid #3a2f18;border-radius:.5em;background:#101117;cursor:pointer;transition:all .2s}
.fgline:hover{border-color:#8a6a2c;background:#171821}.fgline.sel{border-color:var(--c);background:color-mix(in srgb,var(--c) 14%,#101117);box-shadow:0 0 .9em color-mix(in srgb,var(--c) 40%,transparent)}
.fgline .tg{margin-left:auto;font-size:.8em;color:#9a8e72}.fgline b{color:#ffe7b0}
.fgopts{display:grid;grid-template-columns:repeat(3,1fr);gap:.7em;perspective:60em}
.fgopt{position:relative;border:.14em solid #3d2f14;border-radius:.7em;padding:.8em .5em;text-align:center;background:linear-gradient(170deg,#1a1d29,#0d0e14);cursor:pointer;animation:fgFlip .7s cubic-bezier(.2,.8,.3,1) both;transition:transform .2s,border-color .2s,box-shadow .2s}
.fgopt:nth-child(2){animation-delay:.14s}.fgopt:nth-child(3){animation-delay:.28s}
@keyframes fgFlip{from{opacity:0;transform:rotateY(100deg) scale(.7)}to{opacity:1;transform:none}}
.fgopt:hover{transform:translateY(-.25em)}.fgopt.sel{border-color:var(--c);box-shadow:0 0 1.2em var(--c),inset 0 0 1em color-mix(in srgb,var(--c) 30%,transparent);transform:translateY(-.35em) scale(1.04)}
.fgopt .ic{font-size:2em;display:flex;justify-content:center}.fgopt b{display:block;margin:.2em 0;font-size:1.25em;color:#fff}.fgopt span{font-size:.82em;color:#a99c80}
.fgopt .bd2{position:absolute;right:-.4em;top:-.6em;padding:.1em .6em;border-radius:2em;background:linear-gradient(180deg,#ffd34d,#c07a10);color:#2a1a04;font-weight:800;font-size:.75em;box-shadow:0 0 .8em #ffd34d}
.fgopt .bd3{position:absolute;left:.4em;top:.4em;font-size:.7em;color:#7fe3f0;font-weight:700}
.fgsock{display:flex;justify-content:center;gap:1.4em;padding:.4em 0}
.fgrune{width:4.4em;height:4.4em;border-radius:50%;border:.16em solid #3d3350;background:radial-gradient(circle,#1a1426,#0c0a12);display:flex;align-items:center;justify-content:center;position:relative;color:#5c5070;font-weight:800;font-size:1.3em;transition:all .5s}
.fgrune.on{border-color:var(--c);color:#fff;background:radial-gradient(circle,color-mix(in srgb,var(--c) 60%,#1a1426),#0c0a12);box-shadow:0 0 1.4em var(--c),inset 0 0 1em color-mix(in srgb,var(--c) 50%,transparent);animation:fgPulse2 2s infinite}
.fgrune.nx{border-style:dashed;border-color:#8a76b8}
.fgtier{display:flex;gap:.8em;align-items:flex-start;padding:.6em .8em;border:.12em solid #3a2f18;border-radius:.6em;background:#101117;position:relative;transition:all .4s}
.fgtier .num{flex:none;width:2.6em;height:2.6em;border-radius:50%;border:.15em solid #4a3f28;display:flex;align-items:center;justify-content:center;font-weight:800;color:#8d8470;background:#14110a}
.fgtier.done{border-color:#8a6a2c;background:linear-gradient(90deg,#241b0a,#101117)}.fgtier.done .num{border-color:var(--c);background:var(--c);color:#2a1a04;box-shadow:0 0 1em var(--c)}
.fgtier.nx{border-color:var(--c);box-shadow:0 0 1em color-mix(in srgb,var(--c) 35%,transparent)}.fgtier.nx .num{border-color:var(--c);color:#fff}
.fgtier ul{margin:.2em 0 0;padding-left:1.1em;color:#b9ad92;font-size:.88em;line-height:1.5}.fgtier b.t{color:#ffe7b0}
.fgr{display:flex;flex-direction:column;min-height:0;border:.1em solid #3d2f14;border-radius:.6em;background:linear-gradient(170deg,#14161d,#0a0b0f);overflow:hidden}
.fgr h4{margin:0;padding:.6em .9em;font-size:.95em;letter-spacing:.1em;color:#e6bf6a;border-bottom:.08em solid #3d2f14;display:flex;justify-content:space-between;align-items:center;gap:.5em}
.fgr h4 small{color:#8d8470;font-weight:600;letter-spacing:0}
.fgst{flex:1;min-height:0;overflow:auto;padding:.4em .6em}
.fgsr{display:grid;grid-template-columns:1.6em 1fr auto auto 4.2em;gap:.5em;align-items:center;padding:.38em .3em;border-bottom:.06em solid #23201a;font-size:.92em;position:relative}
.fgsr .l{display:flex;align-items:center;gap:.3em;color:#cfc3a8}
.fgsr .v0{color:#8d8470;text-align:right}.fgsr .v1{color:#fff;font-weight:700;text-align:right;min-width:4.2em}
.fgsr .dl{font-size:.82em;font-weight:800;color:#6bff8a;min-width:4em;text-align:right}.fgsr.dn .dl{color:#ff7b7b}.fgsr.zero .dl{color:#4f4a3d}
.fgsr.up{background:linear-gradient(90deg,transparent,color-mix(in srgb,#6bff8a 10%,transparent))}
.fgsr.new::after{content:"MỚI";position:absolute;right:-.2em;top:.1em;font-size:.6em;font-weight:800;padding:.05em .4em;border-radius:.3em;background:#ffd34d;color:#2a1a04}
.fgsr.flash{animation:fgRow 1.1s}@keyframes fgRow{0%{background:#ffe7b055}100%{background:transparent}}
.fgf{display:flex;align-items:center;gap:1.1em;padding:.8em 1.2em;border-top:.1em solid #3d2f14;background:linear-gradient(0deg,#2a2112,#16120b);border-radius:0 0 .5em .5em;position:relative;z-index:2}
.fgres,.fgcost{display:flex;gap:.5em;align-items:center}
.fgchip{display:flex;align-items:center;gap:.35em;padding:.3em .75em;border-radius:2em;background:#0d0c09;border:.1em solid #4a3a1c;font-weight:700;color:#ffe7b0}
.fgchip.bad{border-color:#c0392b;color:#ff8a7a;animation:fgDeny .4s}.fgchip.ok{color:#bfeccb}
.fglab{font-size:.78em;color:#8d8470;letter-spacing:.08em;margin-right:.2em}
.fgmsg{flex:1;text-align:center;color:#ff9a8a;font-weight:600;font-size:.9em;min-height:1.2em}.fgmsg.good{color:#9be8a8}
.fgbtn{display:flex;align-items:center;gap:.55em;padding:.6em 1.8em;border-radius:.7em;border:.14em solid #fff3;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 90%,#fff),var(--c) 45%,color-mix(in srgb,var(--c) 55%,#000));color:#1a0f02;font:800 1.15em Montserrat,sans-serif;letter-spacing:.1em;cursor:pointer;box-shadow:0 0 1.4em color-mix(in srgb,var(--c) 70%,transparent),inset 0 .12em .2em #fff9;text-shadow:0 .06em 0 #fff6;position:relative;overflow:hidden;transition:transform .15s,filter .2s}
.fgbtn::after{content:"";position:absolute;top:0;bottom:0;width:30%;left:-40%;background:linear-gradient(100deg,transparent,#fff8,transparent);animation:fgShine 2.6s infinite}@keyframes fgShine{60%,100%{left:130%}}
.fgbtn:hover:not(:disabled){transform:translateY(-.1em) scale(1.03);filter:brightness(1.12)}.fgbtn:active:not(:disabled){transform:scale(.97)}
.fgbtn:disabled{filter:grayscale(.85) brightness(.55);cursor:default;box-shadow:none}.fgbtn:disabled::after{display:none}
.fgbtn.sec{background:linear-gradient(180deg,#3a3020,#1c170d);color:#e6bf6a;box-shadow:none;border-color:#6b4a1a;font-size:.95em;padding:.55em 1.1em;text-shadow:none}
.fgbtn.deny,.fgchip.deny{animation:fgDeny .4s}@keyframes fgDeny{25%{transform:translateX(-.35em)}75%{transform:translateX(.35em)}}
.fgfx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6;border-radius:.6em}
.fgwave{position:absolute;left:50%;top:44%;width:30%;aspect-ratio:1;border-radius:50%;border:.3em solid var(--wc);transform:translate(-50%,-50%) scale(.2);opacity:.95;pointer-events:none;animation:fgWave 1.1s ease-out forwards;box-shadow:0 0 1.5em var(--wc),inset 0 0 1.5em var(--wc)}
@keyframes fgWave{to{transform:translate(-50%,-50%) scale(3.6);opacity:0}}
.fgflash{position:absolute;inset:0;z-index:5;pointer-events:none;background:var(--fc);opacity:0;border-radius:.5em}.fgflash.go{animation:fgFlash .7s ease-out}@keyframes fgFlash{0%{opacity:.85}100%{opacity:0}}
.fgbeam{position:absolute;left:50%;bottom:0;width:22%;height:100%;transform:translateX(-50%);background:linear-gradient(0deg,transparent,color-mix(in srgb,var(--bc) 80%,#fff) 55%,transparent);opacity:0;mix-blend-mode:screen;pointer-events:none;z-index:4;animation:fgBeam 1.3s ease-out}
@keyframes fgBeam{0%{opacity:0;transform:translateX(-50%) scaleX(.1)}25%{opacity:1;transform:translateX(-50%) scaleX(1)}100%{opacity:0;transform:translateX(-50%) scaleX(.2)}}
.fgban{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);z-index:9;padding:.5em 1.8em;border-radius:.4em;font-weight:800;font-size:2.2em;letter-spacing:.18em;white-space:nowrap;pointer-events:none;display:flex;align-items:center;gap:.5em;animation:fgBan 2.2s cubic-bezier(.2,1.2,.3,1) forwards;text-shadow:0 .08em .2em #000}
.fgban.ok{color:#fff3c0;background:linear-gradient(90deg,transparent,#3a2a0acc 20%,#3a2a0acc 80%,transparent);box-shadow:0 0 3em var(--c)}
.fgban.bad{color:#ffb0a0;background:linear-gradient(90deg,transparent,#3a0a0acc 20%,#3a0a0acc 80%,transparent);box-shadow:0 0 3em #c0392b}
@keyframes fgBan{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}25%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-62%) scale(1)}}
.fgp.shake{animation:fgPShake .5s}@keyframes fgPShake{10%,50%,90%{transform:translate(-.5%,.4%)}30%,70%{transform:translate(.5%,-.4%)}}
.fgp.red{box-shadow:0 0 0 .15em #231707,0 0 0 .32em #6b1a1a,0 0 3.5em #000,0 0 6em #c0392b88,inset 0 0 4em #5a0f0f88}
.fg.low .fgring,.fg.low .fgaura,.fg.low .fgit,.fg.low .fgbtn::after{animation:none}
@media (prefers-reduced-motion:reduce){.fg *{animation-duration:.01s!important}}
`;

const corner = `<svg viewBox="0 0 40 40"><path d="M2 38 V10 Q2 2 10 2 H38" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 38 V14 Q8 8 14 8 H38" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/><path d="M12 12 l5 -5 5 5 -5 5z" fill="currentColor"/></svg>`;
const runeRing = (n = 16) => `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor"><circle cx="100" cy="100" r="96" stroke-width="2" stroke-dasharray="3 7"/><circle cx="100" cy="100" r="84" stroke-width="1.2" opacity=".7"/>${Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, x = 100 + Math.cos(a) * 90, y = 100 + Math.sin(a) * 90; return `<path d="M${x - 4} ${y} l4 -6 4 6 -4 6z" fill="currentColor" stroke="none" opacity="${i % 2 ? .45 : .95}" transform="rotate(${a * 180 / Math.PI + 90} ${x} ${y})"/>`; }).join('')}</svg>`;
const CRACK = `<svg class="crack" viewBox="0 0 100 100"><path d="M50 8 L44 28 L56 40 L42 58 L54 72 L46 94" fill="none" stroke="#ff4a3a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 28 L26 34 M56 40 L76 36 M42 58 L24 66 M54 72 L74 80" fill="none" stroke="#ff7a5a" stroke-width="2" stroke-linecap="round"/></svg>`;

// ---------------- Hạt năng lượng bằng canvas (tự dừng khi hết hạt) ----------------
class Particles {
  constructor(cv) { this.cv = cv; this.ps = []; this.run = false; this.low = false; }
  add(p) { this.ps.push({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: .98, life: 1, max: 1, size: 3, color: '#fff', shape: 'c', tx: null, ty: null, k: 0, ...p, max: p.life || 1 }); this.start(); }
  burst(x, y, color, n = 40, spd = 260, o = {}) { n = this.low ? Math.ceil(n / 3) : n; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = spd * (.3 + Math.random() * .9); this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: o.g ?? 160, drag: .93, life: .7 + Math.random() * .9, size: 1.5 + Math.random() * 3, color: Array.isArray(color) ? color[i % color.length] : color, shape: Math.random() < .35 ? 's' : 'c' }); } }
  suck(x, y, color, n = 50, dur = 1, R = 160) { n = this.low ? Math.ceil(n / 3) : n; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = R * (.6 + Math.random() * .6); this.add({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, tx: x, ty: y, k: 1 / dur, life: dur * (.6 + Math.random() * .4), size: 1.5 + Math.random() * 3, color, drag: 1 }); } }
  rise(x, y, color, n = 1) { for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - .5) * 90, y, vx: (Math.random() - .5) * 14, vy: -30 - Math.random() * 40, drag: 1, life: 1.6 + Math.random(), size: 1.5 + Math.random() * 2, color }); }
  ash(x, y, n = 30) { for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - .5) * 120, y: y - 20 + Math.random() * 40, vx: (Math.random() - .5) * 40, vy: -20 - Math.random() * 30, g: 140, drag: .97, life: 1 + Math.random() * 1.2, size: 2 + Math.random() * 3, color: Math.random() < .5 ? '#ff6a4a' : '#6a625a' }); }
  start() { if (this.run) return; this.run = true; this.t0 = performance.now(); requestAnimationFrame(t => this.tick(t)); }
  clear() { this.ps = []; const c = this.cv, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); }
  tick(t) {
    const dt = Math.min(.05, (t - this.t0) / 1000); this.t0 = t; const c = this.cv, ctx = c.getContext('2d');
    if (c.width !== c.clientWidth || c.height !== c.clientHeight) { c.width = c.clientWidth; c.height = c.clientHeight; }
    ctx.clearRect(0, 0, c.width, c.height); ctx.globalCompositeOperation = 'lighter';
    this.ps = this.ps.filter(p => {
      p.life -= dt; if (p.life <= 0) return false;
      if (p.tx != null) { p.x += (p.tx - p.x) * Math.min(1, dt * 4.2 * (1 + (1 - p.life / p.max) * 2)); p.y += (p.ty - p.y) * Math.min(1, dt * 4.2 * (1 + (1 - p.life / p.max) * 2)); }
      else { p.vy += p.g * dt; p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60); p.x += p.vx * dt; p.y += p.vy * dt; }
      const a = Math.max(0, Math.min(1, p.life / p.max * 1.6)); ctx.globalAlpha = a; ctx.fillStyle = p.color;
      if (p.shape === 's') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 6); ctx.fillRect(-p.size, -p.size * .4, p.size * 2, p.size * .8); ctx.restore(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a * .8 + .5, 0, 6.283); ctx.fill(); ctx.globalAlpha = a * .25; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a * 2 + 1, 0, 6.283); ctx.fill(); }
      return true;
    });
    if (this.ps.length) requestAnimationFrame(t2 => this.tick(t2)); else { this.run = false; ctx.clearRect(0, 0, c.width, c.height); }
  }
}

export function createForge(root, ctx) {
  const { G } = ctx, st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.className = 'fg';
  el.innerHTML = `<div class="fgp"><i class="fgc a">${corner}</i><i class="fgc b">${corner}</i><i class="fgc c">${corner}</i><i class="fgc d">${corner}</i>
    <div class="fgh"><h2></h2><div class="fgtabs"></div><button class="fgx" data-fg="close" title="Đóng (Esc)">✕</button></div>
    <div class="fgb"><div class="fgl"></div><div class="fgm"></div><div class="fgr"></div></div>
    <div class="fgf"></div><canvas class="fgfx"></canvas><div class="fgflash"></div></div>`;
  root.appendChild(el);
  const $ = s => el.querySelector(s), P = $('.fgp'), HEAD = $('.fgh h2'), TABS = $('.fgtabs'), L = $('.fgl'), M = $('.fgm'), R = $('.fgr'), FOOT = $('.fgf'), FLASH = $('.fgflash');
  const fxp = new Particles($('.fgfx'));
  const S = { id: null, mode: 'enhance', busy: false, line: 0, opts: null, pick: -1, msg: '', good: false, last: null };
  const low = () => !!(G.set && G.set.lowfx);
  const wait = ms => new Promise(r => setTimeout(r, low() ? ms * .35 : ms));
  const cur = () => { const f = ctx.find(S.id); return f && f.it; };
  const cls = () => ctx.classId();
  const color = () => MODES[S.mode].color;

  // ----- Trạng thái xem trước ("sau khi nâng cấp") theo từng tính năng -----
  function preview(it) {
    switch (S.mode) {
      case 'enhance': return enhanceInfo(it) ? withChange(it, { enh: (it.enh || 0) + 1 }) : it;
      case 'reroll': { if (S.opts && S.pick >= 0) { const a = it.affixes.slice(); const o = S.opts[S.pick]; a[S.line] = { type: o.type, v: o.v }; return withChange(it, { affixes: a }); } return it; }
      case 'awaken': { const s = awakenState(it); return s.max ? it : withChange(it, { awk: s.next }); }
      case 'transcend': { const s = transState(it); return s.max ? it : withChange(it, { trans: s.next }); }
    }
    return it;
  }
  const costOf = it => {
    switch (S.mode) {
      case 'enhance': { const i = enhanceInfo(it); return i ? { gold: i.cost, stone: 0 } : null; }
      case 'reroll': return it.affixes.length ? { gold: rerollCost(it), stone: 0 } : null;
      case 'awaken': { const s = awakenState(it); return s.max ? null : s.cost; }
      case 'transcend': { const s = transState(it); return s.max ? null : { gold: s.req.gold, stone: s.req.stone }; }
    }
  };
  const num = n => fmt2(n);

  // ----- Dựng giao diện -----
  function renderStage(it) {
    const rc = glowColor(it), cx = CLASS_FX[it.cls || cls()] || CLASS_FX.knight;
    L.style.setProperty('--rc', rc);
    L.innerHTML = `<div class="fgaura"></div><div class="fgring">${runeRing(16)}</div><div class="fgring r2">${runeRing(10)}</div><div class="fgfloor"></div>
      <div class="fgit" data-it><div class="fgi" style="${iconStyle(it, cls())}"></div>${CRACK}</div>
      <div class="fglv">+${it.enh || 0}${trTier(it) ? ' · ' + 'I'.repeat(trTier(it)) : ''}</div>
      <div class="fgname"><b style="color:${rc}">${esc(itemName(it, cls()))}</b><span>Lv.${it.lv} · ${RARITY[Math.min(it.ri, 6)].name} · ${esc(cx.passive[0])}</span></div>`;
  }
  function renderHead() {
    const m = MODES[S.mode]; P.style.setProperty('--c', m.color); el.style.setProperty('--c', m.color);
    HEAD.innerHTML = `${icon(m.icon, '1.4em')}<span>${m.name.toUpperCase()}</span>`;
    TABS.innerHTML = ORDER.map(k => `<button class="fgtab${k === S.mode ? ' on' : ''}" data-fg="mode" data-m="${k}" style="--tc:${MODES[k].color}">${icon(MODES[k].icon, '1.3em')}${MODES[k].name}</button>`).join('');
  }
  function renderMid(it) {
    const m = MODES[S.mode]; let h = `<div class="fgsub">${m.sub}</div>`;
    if (S.mode === 'enhance') {
      const inf = enhanceInfo(it), n = it.enh || 0, cap = enhCap(it), r = inf ? inf.rate : 0, C = 2 * Math.PI * 21;
      const ms = []; for (let v = 5; v <= cap; v += 5) ms.push(v); const nextMs = ms.find(v => v > n);
      const cfx = CLASS_FX[it.cls || cls()] || CLASS_FX.knight, bonus = Object.entries(cfx.ms).map(([k, v]) => `+${val(k, v)} ${lab(k)}`).join(', ');
      h += `<div class="fgcard"><div class="fglvbig"><span>+${n}</span><i>➜</i><b>${inf ? '+' + inf.to : 'MAX'}</b></div></div>
        <div class="fgcard"><h4>${icon('crit', '1.2em')} TỶ LỆ THÀNH CÔNG</h4><div class="fggauge"><div style="position:relative;flex:none"><svg viewBox="0 0 50 50"><circle class="t" cx="25" cy="25" r="21" fill="none" stroke-width="5"/><circle class="p" cx="25" cy="25" r="21" fill="none" stroke-width="5" stroke-dasharray="${C * r / 100} ${C}"/></svg><div class="n">${r}%</div></div>
        <div class="fgsub">${inf ? `Thất bại <b style="color:#ffe7b0">không phá hủy</b> trang bị, cộng bảo hiểm <b style="color:#6bff8a">+5%</b> cho lần sau.<br>Bảo hiểm hiện tại: <b style="color:#6bff8a">+${5 * (it.fail || 0)}%</b>` : 'Đã đạt cấp tối đa. Hãy Đột phá để nâng trần.'}</div></div></div>
        <div class="fgcard"><h4>${icon('trophy', '1.2em')} MỐC THƯỞNG (${esc(cfx.passive[0])})</h4><div class="fgtrack">${ms.map(v => `<div class="fgnode${n >= v ? ' done' : v === nextMs ? ' next' : ''}"><b>${n >= v ? '✓' : v}</b><small>+${v}</small></div>`).join('')}</div>
        <div class="fgsub">${nextMs ? `Đạt <b style="color:#fff">+${nextMs}</b>: ${bonus}` : 'Đã nhận mọi mốc ở bậc hiện tại.'} · Đã mở ${msCount(it)} mốc.</div></div>`;
    } else if (S.mode === 'reroll') {
      if (!it.affixes.length) h += `<div class="fgcard fgsub">Trang bị này không có dòng phụ để đổi.</div>`;
      else {
        const lines = itemLines(it).filter(l => l.id[0] === 'a');
        h += `<div class="fgcard"><h4>${icon('stats', '1.2em')} CHỌN DÒNG CẦN ĐỔI</h4><div class="fgrows">${lines.map((l, i) => `<div class="fgline${i === S.line ? ' sel' : ''}" data-fg="line" data-i="${i}">${statIcon(l.type, '1.5em')}<span>${esc(lab(l.type))}</span><b>${val(l.type, l.v)}</b><span class="tg">${l.tag}</span></div>`).join('')}</div></div>`;
        if (S.opts) h += `<div class="fgcard"><h4>${icon('reroll', '1.2em')} CHỌN MỘT PHƯƠNG ÁN</h4><div class="fgopts">${S.opts.map((o, i) => `<div class="fgopt${i === S.pick ? ' sel' : ''}" data-fg="pick" data-i="${i}">${o.perfect ? '<span class="bd2">CỰC PHẨM</span>' : ''}${o.same ? '<span class="bd3">Giữ loại</span>' : ''}<div class="ic">${statIcon(o.type, '1.6em')}</div><b>${val(o.type, o.v)}</b><span>${esc(lab(o.type))}</span></div>`).join('')}</div>
          <div class="fgsub" style="margin-top:.5em">Chọn phương án rồi nhấn <b style="color:#fff">XÁC NHẬN</b>, hoặc quay lại (mất thêm vàng).</div></div>`;
        else h += `<div class="fgcard fgsub">Nhấn <b style="color:#fff">QUAY DÒNG</b> để nhận 3 phương án. Các dòng khác được giữ nguyên.<br>Phương án đầu luôn giữ nguyên loại thuộc tính và chỉ đổi giá trị.</div>`;
      }
    } else if (S.mode === 'awaken') {
      const s = awakenState(it), lv = awkLv(it), cfx = CLASS_FX[it.cls || cls()] || CLASS_FX.knight;
      h += `<div class="fgcard"><h4>${icon('awaken', '1.2em')} CẤP THỨC TỈNH</h4><div class="fgsock">${[1, 2, 3].map(i => `<div class="fgrune${lv >= i ? ' on' : i === lv + 1 ? ' nx' : ''}">${'I'.repeat(i)}</div>`).join('')}</div>
        <div class="fgsub" style="text-align:center">${s.max ? 'Đã thức tỉnh tối đa.' : s.why ? `<span style="color:#ff9a8a">${s.why}</span>` : `Tỷ lệ thành công <b style="color:#fff">${s.rate}%</b>${s.next > 1 ? ' · thất bại cộng bảo hiểm +10%' : ''}`}</div></div>
        <div class="fgcard"><h4>${icon('boss', '1.2em')} NỘI TẠI LỚP · ${esc(cfx.passive[0].toUpperCase())}</h4><div class="fgsub">${esc(cfx.passive[2])}.<br>Sức mạnh nội tại: <b style="color:#fff">×${AWK_MULT[Math.max(1, lv)]}</b> (cấp ${lv || 1})${lv ? '' : ' — chưa kích hoạt'}.</div></div>
        <div class="fgcard"><h4>${icon('skill', '1.2em')} DÒNG ĐẶC BIỆT</h4><div class="fgsub">${it.awaken ? `<b style="color:#ffd34d;font-size:1.1em">✦ +${fmt2(it.awaken.v)}% ${AW[it.awaken.type][0]}</b><br>Có thể đổi sang dòng đặc biệt khác (chi phí thấp hơn).` : `Ngẫu nhiên một trong: ${Object.values(AW).map(a => a[0]).join(', ')}.`}</div></div>`;
    } else {
      const t = trTier(it), s = transState(it), cfx = CLASS_FX[it.cls || cls()] || CLASS_FX.knight;
      h += TRANS_TIERS.map((rq, k) => { const done = t > k, nx = t === k; const lines = Object.entries(cfx.brk[k]).map(([ty, v]) => `+${val(ty, v)} ${lab(ty)}`).join(', ');
        return `<div class="fgtier${done ? ' done' : nx ? ' nx' : ''}"><div class="num">${done ? '✓' : 'I'.repeat(k + 1)}</div><div><b class="t">Đột phá ${'I'.repeat(k + 1)}</b> <span style="color:#8d8470;font-size:.85em">· cần ${RARITY[rq.ri].name}+, +${rq.enh} · ${num(rq.gold)}g + ${num(rq.stone)} đá</span>
          <ul><li>Chỉ số chính ×${TRANS_MAIN[k + 1]} · dòng phụ +8%</li><li>${lines}</li><li>Trần cường hóa +${20 + 5 * (k + 1)} · dư chấn +4% (${esc(cfx.proc)})</li></ul></div></div>`; }).join('');
      h += `<div class="fgsub">${s.max ? 'Đã đột phá tối đa.' : s.why ? `<span style="color:#ff9a8a">${s.why}</span>` : `Tỷ lệ thành công bậc ${s.next}: <b style="color:#fff">${s.rate}%</b>${s.tier ? ' · thất bại cộng bảo hiểm +10%' : ''}`}</div>`;
    }
    M.innerHTML = h;
  }
  function renderRight(it, flashKeys) {
    const af = preview(it), rows = diffTotals(it, af), ch = rows.some(r => Math.abs(r.delta) > 1e-6);
    R.innerHTML = `<h4><span>${icon('stats', '1.3em')} THUỘC TÍNH</span><small>${ch ? 'sau khi nâng' : 'hiện tại'}</small></h4><div class="fgst">${rows.map(r => {
      const d = r.delta, z = Math.abs(d) < 1e-6; return `<div class="fgsr${z ? ' zero' : d > 0 ? ' up' : ' dn'}${r.isNew && !z ? ' new' : ''}${flashKeys && flashKeys.has(r.type) ? ' flash' : ''}"><span>${statIcon(r.type, '1.3em')}</span><span class="l">${esc(lab(r.type))}</span><span class="v0">${z ? '' : val(r.type, r.before)}</span><span class="v1" data-to="${r.after}" data-ty="${r.type}">${val(r.type, z ? r.before : r.after)}</span><span class="dl">${z ? '' : sgn(r.type, d)}</span></div>`; }).join('') || '<div class="fgsub" style="padding:1em">Chưa có thuộc tính.</div>'}</div>`;
  }
  function renderFoot(it) {
    const c = costOf(it), m = MODES[S.mode]; let ok = !!c, why = '';
    if (!c) why = S.mode === 'reroll' ? 'Không có dòng để đổi' : 'Đã đạt tối đa';
    if (c && S.mode === 'awaken') { const s = awakenState(it); if (s.why) { ok = false; why = s.why; } }
    if (c && S.mode === 'transcend') { const s = transState(it); if (s.why) { ok = false; why = s.why; } }
    const gOk = !c || G.gold >= c.gold, sOk = !c || G.mat.stone >= c.stone; if (c && (!gOk || !sOk) && !why) why = 'Không đủ nguyên liệu';
    let label = m.verb, ic = m.icon, sec = '';
    if (S.mode === 'reroll' && S.opts) { label = 'XÁC NHẬN'; ic = 'check'; sec = `<button class="fgbtn sec" data-fg="rereroll" ${gOk ? '' : 'disabled'}>${icon('reroll', '1.2em')} QUAY LẠI</button>`; if (S.pick < 0) { ok = false; why = 'Hãy chọn một phương án'; } else { ok = true; why = ''; } }
    if (S.mode === 'awaken') { const lv = awkLv(it); if (lv && lv < 3) label = 'NÂNG CẤP ' + (lv + 1); if (it.awaken) { const rc = rerollAwakenCost(it); sec = `<button class="fgbtn sec" data-fg="awre" ${G.gold >= rc.gold && G.mat.stone >= rc.stone ? '' : 'disabled'} title="Đổi dòng đặc biệt">${icon('reroll', '1.2em')} ĐỔI DÒNG ĐB · ${num(rc.gold)}g ${rc.stone}</button>`; } }
    const need = (cost, have, key) => `<span class="fgchip ${have >= cost ? 'ok' : 'bad'}" data-k="${key}">${icon(key === 'g' ? 'gold' : 'stone', '1.3em')}${num(cost)}</span>`;
    const confirmPhase = S.mode === 'reroll' && S.opts;
    FOOT.innerHTML = `<div class="fgres"><span class="fglab">SỐ DƯ</span><span class="fgchip">${icon('gold', '1.3em')}${num(G.gold)}</span><span class="fgchip">${icon('stone', '1.3em')}${num(G.mat.stone)}</span></div>
      <div class="fgcost"><span class="fglab">CHI PHÍ</span>${c && !confirmPhase ? need(c.gold, G.gold, 'g') + (c.stone ? need(c.stone, G.mat.stone, 's') : '') : `<span class="fgchip">${confirmPhase ? 'Đã trả' : '—'}</span>`}</div>
      <div class="fgmsg${S.good ? ' good' : ''}">${esc(S.msg || (!ok || !gOk || !sOk ? why : ''))}</div>${sec}
      <button class="fgbtn" data-fg="go" ${(ok && (gOk && sOk || confirmPhase)) ? '' : 'disabled'}>${icon(ic, '1.4em')}${label}</button>`;
  }
  function render(flashKeys) {
    const it = cur(); if (!it) return close();
    renderHead(); renderMid(it); renderRight(it, flashKeys); renderFoot(it);
  }

  // ----- Hiệu ứng -----
  const stageC = () => { const a = $('.fgl').getBoundingClientRect(), b = $('.fgfx').getBoundingClientRect(); return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height * .44 }; };
  const wave = (c, n = 2) => { for (let i = 0; i < n; i++) setTimeout(() => { const w = document.createElement('div'); w.className = 'fgwave'; w.style.setProperty('--wc', c); L.appendChild(w); setTimeout(() => w.remove(), 1200); }, i * 180); };
  const flash = c => { FLASH.style.setProperty('--fc', c); FLASH.classList.remove('go'); void FLASH.offsetWidth; FLASH.classList.add('go'); };
  const banner = (ok, text, ic) => { const b = document.createElement('div'); b.className = 'fgban ' + (ok ? 'ok' : 'bad'); b.innerHTML = `${icon(ic, '1.1em')}<span>${text}</span>`; P.appendChild(b); setTimeout(() => b.remove(), 2300); };
  const itEl = () => L.querySelector('[data-it]');
  const addCls = (e, c, ms) => { if (!e) return; e.classList.remove(c); void e.offsetWidth; e.classList.add(c); setTimeout(() => e.classList.remove(c), ms); };
  const shakePanel = () => { if (!low()) addCls(P, 'shake', 520); };
  async function charge(ms) { // giai đoạn tụ năng lượng: hạt hút vào trang bị, vòng rune quay nhanh
    const c = stageC(); el.classList.add('busy'); ctx.sfx && ctx.sfx('charge');
    const t0 = Date.now(), dur = low() ? ms * .35 : ms; fxp.suck(c.x, c.y, color(), 46, dur / 1000 * .9, 170);
    const iv = setInterval(() => { if (Date.now() - t0 > dur) return clearInterval(iv); fxp.suck(c.x, c.y, color(), 7, .5, 150); }, 160);
    await wait(ms * .5); shakePanel(); await wait(ms * .5);
  }
  async function playOk(kind, text, ic, big) {
    const c = stageC(), col = color(); el.classList.remove('busy');
    flash(kind === 'transcend' ? '#fff6c8' : col + 'cc'); wave(col, big ? 3 : 2); addCls(itEl(), 'pop', 720);
    fxp.burst(c.x, c.y, [col, '#fff', '#ffe7b0'], big ? 90 : 55, big ? 420 : 300);
    if (kind === 'transcend' || kind === 'awaken') { const b = document.createElement('div'); b.className = 'fgbeam'; b.style.setProperty('--bc', col); L.appendChild(b); setTimeout(() => b.remove(), 1400); }
    if (kind === 'enhance') { setTimeout(() => fxp.burst(c.x, c.y + 20, '#ffcf7a', 40, 220), 140); }
    banner(true, text, ic); ctx.sfx && ctx.sfx(big ? 'tier' : 'ok');
  }
  async function playFail(text) {
    const c = stageC(); el.classList.remove('busy'); flash('#ff2a1acc'); addCls(itEl(), 'shake', 560); itEl().classList.add('fail'); setTimeout(() => itEl() && itEl().classList.remove('fail'), 1800);
    P.classList.add('red'); setTimeout(() => P.classList.remove('red'), 1500); shakePanel(); fxp.ash(c.x, c.y, 36); fxp.burst(c.x, c.y, ['#ff4a3a', '#7a2a1a'], 26, 150);
    banner(false, text, 'cross'); ctx.sfx && ctx.sfx('fail');
  }
  function deny(msg) { S.msg = msg; S.good = false; const b = FOOT.querySelector('.fgbtn:not(.sec)'); addCls(b, 'deny', 420); FOOT.querySelectorAll('.fgchip.bad').forEach(x => addCls(x, 'deny', 420)); ctx.sfx && ctx.sfx('fail'); renderFoot(cur()); }
  function countUp(keys) { // số chỉ số chạy từ giá trị cũ lên giá trị mới
    R.querySelectorAll('.fgsr').forEach(r => { const v = r.querySelector('.v1'), ty = v.dataset.ty; if (!keys.has(ty)) return; const to = +v.dataset.to, from = +(r.dataset.from || 0), t0 = performance.now(); const dur = low() ? 200 : 900; const f = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); v.textContent = val(ty, from + (to - from) * e); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  }
  const totals = it => { const o = {}; for (const l of itemLines(it)) o[l.type] = (o[l.type] || 0) + l.v; return o; };

  // ----- Thao tác -----
  async function run() {
    const it = cur(); if (!it || S.busy) return; const c = costOf(it);
    if (!c && !(S.mode === 'reroll' && S.opts)) return;
    S.msg = ''; S.good = false;
    if (S.mode === 'reroll') {
      if (S.opts) { // xác nhận phương án đã chọn
        if (S.pick < 0) return deny('Hãy chọn một phương án');
        S.busy = true; const before = totals(it); applyReroll(it, S.line, S.opts[S.pick]); S.opts = null; const after = totals(it), keys = changed(before, after);
        ctx.commit(); renderStage(it); await playOk('reroll', 'ĐÃ ĐỔI DÒNG', 'reroll'); S.good = true; S.msg = 'Đã cập nhật dòng thuộc tính'; S.busy = false; render(keys); markFrom(before); countUp(keys); return;
      }
      return rollOptions(it);
    }
    if (G.gold < c.gold || G.mat.stone < c.stone) return deny('Không đủ nguyên liệu');
    S.busy = true; el.classList.add('busy'); const before = totals(it);
    let res;
    if (S.mode === 'enhance') { await charge(1000); res = doEnhance(G, it); }
    else if (S.mode === 'awaken') { await charge(1300); res = doAwaken(G, it, awkLv(it) ? 'up' : 'first'); }
    else { await charge(1500); res = doTranscend(G, it); }
    if (res.error) { S.busy = false; el.classList.remove('busy'); return deny(res.error); }
    ctx.commit(); renderStage(it);
    if (res.ok) {
      const after = totals(it), keys = changed(before, after);
      const txt = S.mode === 'enhance' ? `+${it.enh} THÀNH CÔNG` : S.mode === 'awaken' ? `THỨC TỈNH CẤP ${it.awk}` : `ĐỘT PHÁ ${'I'.repeat(trTier(it))}`;
      await playOk(S.mode, txt, MODES[S.mode].icon, S.mode !== 'enhance' || res.milestone);
      S.good = true; S.msg = S.mode === 'enhance' && res.milestone ? 'Mốc thưởng đã mở!' : S.mode === 'awaken' && it.awaken ? `Dòng đặc biệt: +${fmt2(it.awaken.v)}% ${AW[it.awaken.type][0]}` : 'Sức mạnh trang bị đã tăng';
      S.busy = false; render(keys); markFrom(before); countUp(keys);
    } else {
      await playFail(S.mode === 'enhance' ? 'THẤT BẠI' : 'THẤT BẠI'); S.msg = 'Thất bại — trang bị an toàn, tỷ lệ lần sau tăng'; S.good = false; S.busy = false; render();
    }
  }
  const changed = (a, b) => new Set([...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => Math.abs((a[k] || 0) - (b[k] || 0)) > 1e-6));
  const markFrom = before => R.querySelectorAll('.fgsr').forEach(r => { r.dataset.from = before[r.querySelector('.v1').dataset.ty] || 0; });
  async function rollOptions(it) {
    const cost = rerollCost(it); if (G.gold < cost) return deny('Không đủ vàng');
    S.busy = true; G.gold -= cost; S.opts = null; S.pick = -1; renderFoot(it); await charge(650); S.opts = rerollOptions(it, S.line); ctx.commit();
    S.busy = false; el.classList.remove('busy'); const c = stageC(); fxp.burst(c.x, c.y, color(), 34, 240); wave(color(), 1); flash(color() + '77'); ctx.sfx && ctx.sfx('ok'); render();
  }
  async function awakenRe() {
    const it = cur(); if (!it || S.busy || !it.awaken) return; const rc = rerollAwakenCost(it); if (G.gold < rc.gold || G.mat.stone < rc.stone) return deny('Không đủ nguyên liệu');
    S.busy = true; const before = totals(it); await charge(1000); const r = doAwaken(G, it, 're'); ctx.commit(); renderStage(it);
    if (r.ok) { await playOk('awaken', 'ĐỔI DÒNG ĐẶC BIỆT', 'awaken'); S.good = true; S.msg = `Dòng mới: +${fmt2(it.awaken.v)}% ${AW[it.awaken.type][0]}`; const keys = changed(before, totals(it)); S.busy = false; render(keys); markFrom(before); countUp(keys); } else { S.busy = false; deny(r.error); }
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-fg]'); if (!b) return; if (S.busy && b.dataset.fg !== 'close') return;
    switch (b.dataset.fg) {
      case 'close': return close();
      case 'mode': if (b.dataset.m !== S.mode) { S.mode = b.dataset.m; S.opts = null; S.pick = -1; S.msg = ''; ctx.sfx && ctx.sfx('tab'); render(); M.classList.remove('swap'); void M.offsetWidth; M.classList.add('swap'); } return;
      case 'line': S.line = +b.dataset.i; S.opts = null; S.pick = -1; return render();
      case 'pick': S.pick = +b.dataset.i; ctx.sfx && ctx.sfx('tab'); return render();
      case 'rereroll': { const it = cur(); S.opts = null; S.pick = -1; return rollOptions(it); }
      case 'awre': return awakenRe();
      case 'go': return run();
    }
  });
  // Khi Lò Rèn mở: Esc đóng, mọi phím khác bị chặn để không lọt xuống game / bảng phía dưới (vd phím I, Q, Space)
  window.addEventListener('keydown', e => { if (!el.classList.contains('on')) return; e.stopPropagation(); if (e.key === 'Escape') close(); }, true);

  function open(id, mode) {
    S.id = id; S.mode = MODES[mode] ? mode : 'enhance'; S.line = 0; S.opts = null; S.pick = -1; S.msg = ''; S.busy = false; fxp.low = low(); fxp.clear();
    el.classList.toggle('low', low()); el.classList.add('on'); const it = cur(); if (!it) return close();
    renderStage(it); render(); M.classList.remove('swap'); void M.offsetWidth; M.classList.add('swap');
    const amb = setInterval(() => { if (!el.classList.contains('on')) return clearInterval(amb); const c = stageC(); if (!low()) fxp.rise(c.x, c.y + 70, glowColor(cur() || { ri: 0 }), 1); }, 380);
  }
  function close() { el.classList.remove('on', 'busy'); S.id = null; fxp.clear(); ctx.onClose && ctx.onClose(); }
  return { open, close, isOpen: () => el.classList.contains('on'), state: S, el };
}
