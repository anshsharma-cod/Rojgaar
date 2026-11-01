import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { solveArm } from './ik.js';

/*
  Black 3D stickman. Story (loops from "raise"):
  falls onto the word "ko" -> superhero landing -> stands up -> dusts himself off ->
  summons a bow -> aims at the centre of the R -> draws -> releases -> slow-motion arrow -> hits R.
  World units == CSS pixels on the z=0 plane, so the figure stands exactly on the page text.
*/

const V3 = THREE.Vector3;
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = (t) => 1 - Math.pow(1 - t, 3);
const KEYS = ['ry', 'rx', 'rz', 'sx', 'sy', 'sz', 'hx', 'hy', 'lsx', 'lsz', 'lex', 'rsx', 'rsz', 'rex', 'lhx', 'lhz', 'lkx', 'rhx', 'rhz', 'rkx'];
const mk = (o) => Object.assign(Object.fromEntries(KEYS.map((k) => [k, 0])), o);

// ry = fraction of the "face the target" yaw. x-rotations: arms/legs swing back when +, spine/head lean forward when +.
const P = {
  STAND: mk({ lsz: .1, rsz: -.1, lex: -.1, rex: -.1 }),
  FALL: mk({ sx: -.15, hx: -.3, lsx: -2.7, lsz: .7, lex: -.4, rsx: -2.5, rsz: -.8, rex: -.4, lhx: -.6, lkx: 1, rhx: .3, rkx: .5 }),
  LAND: mk({ ry: .25, sx: .95, hx: -.7, lsx: -.7, lsz: .2, lex: -.2, rsx: .8, rsz: -.5, lhx: -1.45, lkx: 1.7, rhx: .35, rkx: 1.9 }),
  RISE: mk({ sx: .55, hx: -.3, lsx: -.3, lsz: .15, rsx: .3, rsz: -.15, lhx: -.9, lkx: 1.25, rhx: -.1, rkx: .6 }),
  D1: mk({ sx: .2, hx: .35, lsz: .1, lex: -.2, rsx: -.7, rsz: .95, rex: -1.7 }),
  D2: mk({ sx: .3, hx: .45, lsx: -.5, lsz: -.25, lex: -1, rsx: -.5, rsz: .25, rex: -1 }),
  D3: mk({ sx: .95, hx: .2, lsx: -.15, lex: -.5, rsx: -.15, rex: -.5, lhx: -.15, lkx: .3, rhx: -.15, rkx: .3 }),
  D4: mk({ sx: .1, hx: .2, lsx: -1.15, lsz: -.3, lex: -1.35, rsx: -1.15, rsz: .3, rex: -1.35 }),
  SUMMON: mk({ ry: 1, sx: .05, lsx: -1.45, lsz: .15, lex: -.15, rsx: .2, rsz: -.2, lhx: -.3, lkx: .3, rhx: .3, rkx: .3 }),
  STANCE: mk({ ry: 1, hx: -.05, lsx: -.2, lex: -.3, rsx: -.2, rex: -.3, lhx: -.3, lkx: .25, rhx: .3, rkx: .2 }),
  VICT: mk({ ry: .5, sx: -.08, hx: -.25, lsx: -.1, lsz: .2, lex: -.2, rsx: -2.9, rsz: -.25, rex: -.3, lhx: -.15, rhx: .15 }),
};
const SEQ = ['fall', 'land', 'rise1', 'rise2', 'dust1', 'dust2', 'dust3', 'dust4', 'summon', 'raise', 'draw', 'hold', 'flight', 'impact', 'victory', 'reset'];
const DUR = { fall: 1.05, land: .75, rise1: .75, rise2: .6, dust1: 1.1, dust2: 1, dust3: 1.1, dust4: .9, summon: 1, raise: .9, draw: 1.5, hold: .9, flight: 1.9, impact: 1.2, victory: 2.4, reset: .9 };
const TO = { fall: 'FALL', land: 'LAND', rise1: 'RISE', rise2: 'STAND', dust1: 'D1', dust2: 'D2', dust3: 'D3', dust4: 'D4', summon: 'SUMMON', raise: 'STANCE', draw: 'STANCE', hold: 'STANCE', flight: 'STANCE', impact: 'STANCE', victory: 'VICT', reset: 'STANCE' };
const LOOP_FROM = SEQ.indexOf('raise');
const ARROW_L = 66;

const BODY_MAT = () => new THREE.ShaderMaterial({
  vertexShader: 'varying vec3 vN,vV;void main(){vec4 m=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-m.xyz);gl_Position=projectionMatrix*m;}',
  fragmentShader: 'varying vec3 vN,vV;void main(){vec3 n=normalize(vN),v=normalize(vV);float rim=pow(1.-clamp(dot(n,v),0.,1.),2.4);vec3 L=normalize(vec3(.4,.8,.6));float d=max(dot(n,L),0.);float s=pow(max(dot(reflect(-L,n),v),0.),36.);gl_FragColor=vec4(vec3(.012)+vec3(.05,.055,.07)*d+rim*vec3(.78,.84,1.)+s*.55,1.);}',
});

class Puffs {
  constructor(n, additive) {
    Object.assign(this, { n, i: 0 });
    ['p', 'v', 'c'].forEach((k) => { this[k] = new Float32Array(n * 3); });
    ['s', 'a', 'life', 'max', 'grow', 'g', 's0', 'a0'].forEach((k) => { this[k] = new Float32Array(n); });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    geo.setAttribute('aS', new THREE.BufferAttribute(this.s, 1));
    geo.setAttribute('aA', new THREE.BufferAttribute(this.a, 1));
    geo.setAttribute('aC', new THREE.BufferAttribute(this.c, 3));
    this.u = { uPx: { value: 1 }, uCam: { value: 1000 } };
    this.mesh = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthTest: false, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float aS;attribute float aA;attribute vec3 aC;uniform float uPx,uCam;varying float vA;varying vec3 vC;void main(){vec4 m=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*m;gl_PointSize=aS*uPx*uCam/-m.z;vA=aA;vC=aC;}',
      fragmentShader: 'varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vC,smoothstep(.5,.1,d)*vA);}',
    }));
    this.mesh.frustumCulled = false;
  }
  emit(x, y, z, vx, vy, vz, life, size, grow, g, col, alpha) {
    const i = (this.i = (this.i + 1) % this.n);
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3); this.c.set(col, i * 3);
    this.life[i] = this.max[i] = life; this.s0[i] = size; this.grow[i] = grow; this.g[i] = g; this.a0[i] = alpha;
  }
  update(dt) {
    const drag = Math.pow(0.12, dt);
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.a[i] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.max(this.life[i], 0) / this.max[i];
      for (let j = 0; j < 3; j++) { this.v[i * 3 + j] *= drag; this.p[i * 3 + j] += this.v[i * 3 + j] * dt; }
      this.v[i * 3 + 1] -= this.g[i] * dt;
      this.s[i] = Math.max(this.s0[i] + this.grow[i] * (1 - k), 0);
      this.a[i] = this.life[i] > 0 ? this.a0[i] * k : 0;
    }
    ['position', 'aS', 'aA', 'aC'].forEach((a) => { this.mesh.geometry.attributes[a].needsUpdate = true; });
  }
}

export default function StickmanArcher() {
  const layerRef = useRef(null), barT = useRef(null), barB = useRef(null), flashRef = useRef(null), vigRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    const koEl = document.querySelector('.ko-word');
    const baseEl = koEl?.querySelector('.ko-base');
    const rEl = document.querySelector('.landing-art-core span');
    const heroEl = document.querySelector('.landing-hero');
    if (!layer || !koEl || !baseEl || !rEl) return undefined;

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return undefined; }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    layer.insertBefore(renderer.domElement, layer.firstChild);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 1, 10, 6000);

    // ---------- rig ----------
    const mat = BODY_MAT();
    const G = () => new THREE.Group();
    const seg = (par, r, len) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, .1), 4, 14), mat);
      m.position.y = -len / 2; par.add(m); return m;
    };
    const ball = (par, r) => par.add(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat));
    const rig = G(), root = G(), spine = G(), neck = G(), head = G();
    scene.add(rig); rig.add(root); root.add(spine);
    const TL = 26;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(4.6, TL - 9, 4, 14), mat); torso.position.y = TL / 2; spine.add(torso);
    neck.position.y = TL; spine.add(neck); head.position.y = 1; neck.add(head);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(8.4, 24, 18), mat); hm.position.y = 9; head.add(hm);
    const arm = (sx) => {
      const sh = G(); sh.position.set(sx * 6.4, TL - 3.5, 0); spine.add(sh); ball(sh, 3.3); seg(sh, 2.7, 16);
      const el = G(); el.position.y = -16; sh.add(el); ball(el, 2.9); seg(el, 2.5, 15);
      const hd = G(); hd.position.y = -15; el.add(hd); ball(hd, 3.2);
      return { sh, el, hd };
    };
    const leg = (sx) => {
      const hp = G(); hp.position.set(sx * 3.8, 0, 0); root.add(hp); ball(hp, 3.8); seg(hp, 3.4, 21);
      const kn = G(); kn.position.y = -21; hp.add(kn); ball(kn, 3.3); seg(kn, 3.1, 21);
      const an = G(); an.position.y = -21; kn.add(an);
      const ft = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 10.5), mat); ft.position.set(0, -1.6, 2.8); an.add(ft);
      return { hp, kn, an };
    };
    const aL = arm(1), aR = arm(-1), lL = leg(1), lR = leg(-1);

    // bow + string + arrow
    const bowG = G(); scene.add(bowG);
    const pts = []; for (let t = -1; t <= 1.001; t += .1) pts.push(new V3((1 - t * t) * 10, t * 30, 0));
    bowG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 1.4, 6), mat));
    const strGeo = new THREE.BufferGeometry().setFromPoints([new V3(0, 30, 0), new V3(0, 0, 0), new V3(0, -30, 0)]);
    bowG.add(new THREE.Line(strGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9 })));
    const arr = G(); scene.add(arr);
    const shaft = new THREE.CylinderGeometry(.9, .9, ARROW_L - 8, 8).rotateZ(-Math.PI / 2).translate((ARROW_L - 8) / 2, 0, 0);
    const tipG = new THREE.ConeGeometry(2.5, 10, 10).rotateZ(-Math.PI / 2).translate(ARROW_L - 5, 0, 0);
    arr.add(new THREE.Mesh(shaft, new THREE.MeshBasicMaterial({ color: 0xeceff7 })), new THREE.Mesh(tipG, new THREE.MeshBasicMaterial({ color: 0xffffff })));
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(10, 5, .4).translate(6, 2.6, 0), new THREE.MeshBasicMaterial({ color: 0xff4a5a }));
      f.rotation.x = (i * Math.PI * 2) / 3; arr.add(f);
    }
    bowG.visible = arr.visible = false;

    // fx
    const puffs = new Puffs(260, false), sparks = new Puffs(260, true), trail = new Puffs(200, true);
    [puffs, sparks, trail].forEach((p) => scene.add(p.mesh));
    const ringMats = [], rings = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(.95, 1, 72), m); mesh.visible = false; scene.add(mesh);
      rings.push({ mesh, t: 9, life: 1, maxR: 1, flat: 1 }); ringMats.push(m);
    }
    let ringI = 0;
    const addRing = (x, y, flat, color, maxR, life) => {
      const r = rings[ringI++ % rings.length]; r.t = 0; r.life = life; r.maxR = maxR; r.flat = flat;
      r.mesh.position.set(x, y, 2); r.mesh.material.color.setHex(color); r.mesh.visible = true;
    };
    const ret = G(); scene.add(ret);
    const retMat = new THREE.MeshBasicMaterial({ color: 0xff4a5a, transparent: true, opacity: 0, depthTest: false });
    ret.add(new THREE.Mesh(new THREE.RingGeometry(.9, 1, 56), retMat), new THREE.Mesh(new THREE.RingGeometry(.12, .2, 24), retMat));
    [[.78, 0, 0], [-.78, 0, 0], [0, .78, Math.PI / 2], [0, -.78, Math.PI / 2]].forEach(([x, y, r]) => {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(.5, .07), retMat); t.position.set(x, y, 0); t.rotation.z = r; ret.add(t);
    });
    ret.visible = false;

    // ---------- measuring the page ----------
    let W = 1, H = 1, camZ = 1000;
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H, false);
      cam.aspect = W / H; camZ = H / 2 / Math.tan(THREE.MathUtils.degToRad(15));
      cam.position.set(0, 0, camZ); cam.far = camZ + 3000; cam.updateProjectionMatrix();
      [puffs, sparks, trail].forEach((p) => { p.u.uCam.value = camZ; p.u.uPx.value = dpr; });
    };
    resize(); window.addEventListener('resize', resize);
    const cvs = document.createElement('canvas').getContext('2d');
    let fontKey = '', fm = { k: 0, o: 0, asc: 0 };
    const measure = () => {
      const cs = getComputedStyle(koEl);
      const key = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if (key !== fontKey) {
        fontKey = key; cvs.font = key;
        fm = { k: cvs.measureText('k').width, o: cvs.measureText('o').width, asc: cvs.measureText('o').actualBoundingBoxAscent };
      }
      const br = koEl.getBoundingClientRect(), bs = baseEl.getBoundingClientRect(), rr = rEl.getBoundingClientRect();
      const ls = parseFloat(cs.letterSpacing) || 0, fs = parseFloat(cs.fontSize) || 80;
      return {
        footX: br.left + fm.k + ls + fm.o / 2 - W / 2, footY: H / 2 - (bs.bottom - fm.asc),
        R: new V3(rr.left + rr.width / 2 - W / 2, H / 2 - (rr.top + rr.height / 2), 0),
        sc: cl(fs / 82 * .95, .55, 1.1), onScreen: br.bottom > -200 && br.top < H + 200,
      };
    };

    // ---------- state ----------
    const st = {
      ph: 0, pt: 0, t: 0, ready: false, from: { ...P.FALL }, cur: { ...P.FALL }, face: 1, once: {},
      draw: 0, ikw: 0, bow: 0, arrow: 'none', arrowK: 1, shake: 0, dip: 0, jolt: 0, flash: 0, squash: 0, lb: 0, retA: 0, lock: 0,
      tip0: new V3(), dirEnd: new V3(1, 0, 0), dirNow: new V3(1, 0, 0), nockPrev: new V3(), dustT: 0, rel: 9, lastAng: -1.3, impactT: 0,
    };
    let fontsOK = false; document.fonts?.ready.then(() => { fontsOK = true; });
    const enter = (i) => { st.ph = i; st.pt = 0; st.from = { ...st.cur }; st.once = {}; st.dustT = 0; };
    const tmp = new V3(), v1 = new V3(), v2 = new V3();
    const emitPuff = (p, n, spread, up, size = 22, alpha = .5) => {
      for (let i = 0; i < n; i++) puffs.emit(p.x + (Math.random() - .5) * spread, p.y, p.z + 3, (Math.random() - .5) * 90, Math.random() * up, (Math.random() - .5) * 40, .9 + Math.random() * .6, size * (.6 + Math.random() * .7), 26, -10, [.62, .64, .7], alpha);
    };
    const burst = (p, n, speed) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (.25 + Math.random());
        const hot = Math.random() < .45;
        sparks.emit(p.x, p.y, 4, Math.cos(a) * s, Math.sin(a) * s, (Math.random() - .5) * s * .3, .5 + Math.random() * .7, 3 + Math.random() * 4, -2, 260, hot ? [1, .3, .38] : [1, .95, .9], 1);
      }
    };

    const step = (dt) => {
      st.t += dt;
      const m = measure();
      const Sc = m.sc;
      if (!st.ready) {
        if (reduced) {
          st.ready = true; st.ph = SEQ.indexOf('victory'); st.pt = 9; st.cur = { ...P.VICT }; st.from = { ...P.VICT };
          st.bow = 1; st.arrow = 'stuck'; st.face = m.R.x >= m.footX ? 1 : -1; st.dirEnd.set(st.face, -.05, 0).normalize();
        } else if (st.t > 1.7 && fontsOK) { st.ready = true; st.face = m.R.x >= m.footX ? 1 : -1; enter(0); }
      }
      rig.visible = st.ready;
      if (!st.ready) return m;

      const name = SEQ[st.ph], D = DUR[name];
      st.pt += dt;
      const pdt = name === 'impact' && st.pt < .3 ? dt * .2 : dt;       // freeze-frame feel for the burst
      st.face = m.R.x >= m.footX ? 1 : -1;

      // --- enter-time events
      if (!st.once.e) {
        st.once.e = 1;
        if (name === 'land') { st.shake = 1; st.dip = 1; st.squash = 1; emitPuff(new V3(m.footX, m.footY, 0), 14, 50, 70, 26, .55); addRing(m.footX, m.footY, .22, 0xffffff, 90 * Sc, .55); }
        if (name === 'draw') { st.arrow = 'nocked'; st.arrowK = 0; }
        if (name === 'flight') { st.rel = 0; st.lock = 0; }
      }
      const u = cl(st.pt / D);

      // --- base pose blend + overlay
      const to = P[TO[name]], k = name === 'land' ? eo(cl(st.pt / .16)) : ease(u);
      KEYS.forEach((key) => { st.cur[key] = st.from[key] + (to[key] - st.from[key]) * k; });
      const pose = { ...st.cur };
      const w = st.pt;
      if (name === 'fall') { const f = Math.sin(st.t * 22) * .45; pose.lsx += f; pose.rsx -= f; pose.lkx += Math.sin(st.t * 17) * .4; pose.rkx += Math.cos(st.t * 15) * .4; }
      if (name === 'rise1' || name === 'rise2') pose.sx += Math.sin(w * 9) * .04;
      if (name === 'dust1') { pose.rex += Math.sin(w * 16) * .45; pose.rsz += Math.sin(w * 16) * .1; }
      if (name === 'dust2') { pose.lex += Math.sin(w * 15) * .5; pose.rex += Math.sin(w * 15) * .5; }
      if (name === 'dust3') { pose.lsx += Math.sin(w * 14) * .35; pose.rsx += Math.sin(w * 14) * .35; }
      if (name === 'dust4') { pose.lex += Math.sin(w * 20) * .3; pose.rex += Math.sin(w * 20) * .3; }
      if (name === 'victory') pose.hx += Math.sin(w * 4) * .1;
      if (name.startsWith('dust')) {
        st.dustT -= dt;
        if (st.dustT <= 0) { st.dustT = .13; [aL.hd, aR.hd].forEach((h) => { emitPuff(h.getWorldPosition(tmp), 2, 8, 40, 11, .4); }); }
      }

      // --- draw / ik weights / bow
      st.ikw = name === 'raise' ? ease(u) : ['draw', 'hold', 'flight', 'impact'].includes(name) ? 1 : name === 'victory' ? 1 - ease(cl(st.pt / .5)) : 0;
      st.draw = name === 'draw' ? ease(u) : name === 'hold' ? 1 + Math.sin(w * 38) * .012 * (1 + w) : 0;
      if (name === 'summon') {
        if (u > .45 && !st.once.b) { st.once.b = 1; st.bow = .001; const hp = aL.hd.getWorldPosition(tmp); burst(hp, 26, 150); emitPuff(hp, 8, 14, 60, 18, .5); }
        if (st.once.b) st.bow = 1 - Math.exp(-(st.pt - .45) * 9) * Math.cos((st.pt - .45) * 16);
      }
      if (name === 'flight') { st.rel += dt; st.lb = Math.min(1, st.lb + dt * 3); }
      else if (name === 'impact') st.lb = Math.max(0, st.lb - dt * (st.pt > .5 ? 2.2 : 0));
      else st.lb = Math.max(0, st.lb - dt * 3);

      // --- apply pose + grounding
      const yaw = st.face * 1.25 * pose.ry;
      const fallRot = name === 'fall' ? -4 * Math.PI * eo(u) : 0;
      root.rotation.set(pose.rx + fallRot, yaw, pose.rz);
      spine.rotation.set(pose.sx, pose.sy, pose.sz); head.rotation.set(pose.hx, pose.hy, 0);
      aL.sh.rotation.set(pose.lsx, 0, pose.lsz); aL.el.rotation.set(pose.lex, 0, 0);
      aR.sh.rotation.set(pose.rsx, 0, pose.rsz); aR.el.rotation.set(pose.rex, 0, 0);
      lL.hp.rotation.set(pose.lhx, 0, pose.lhz); lL.kn.rotation.set(pose.lkx, 0, 0);
      lR.hp.rotation.set(pose.rhx, 0, pose.rhz); lR.kn.rotation.set(pose.rkx, 0, 0);
      st.squash = Math.max(0, st.squash - dt * 3.2);
      root.scale.set(1 + .12 * st.squash, 1 - .16 * st.squash, 1 + .12 * st.squash);
      rig.scale.setScalar(Sc);
      const recoil = name === 'flight' ? Math.exp(-st.rel * 14) * -3 * st.face : 0;
      rig.position.set(m.footX + recoil + (name === 'fall' ? 70 * (1 - u) * st.face : 0), 0, 0);
      rig.updateMatrixWorld(true);
      let minY = 1e9;
      [[lL.an, 3], [lR.an, 3], [lL.kn, 3.6], [lR.kn, 3.6], [aL.hd, 3.2], [aR.hd, 3.2]].forEach(([o, r]) => { minY = Math.min(minY, o.getWorldPosition(tmp).y - r * Sc); });
      const drop = name === 'fall' ? (H * .7 + 240) * (1 - u * u) : 0;
      rig.position.y = m.footY - minY + drop;
      rig.position.z = name === 'fall' ? 260 * (1 - u) : 0;
      rig.updateMatrixWorld(true);

      // --- aiming (IK) + bow + arrow
      const armLen = (16 + 15) * Sc;
      const R = m.R;
      const dir = new V3(1, 0, 0);
      if (st.ikw > 0) {
        const Sl = aL.sh.getWorldPosition(new V3());
        const dx = R.x - Sl.x, dy = R.y - Sl.y, dist = Math.hypot(dx, dy);
        dir.set(dx, dy + dist * .045, 0).normalize();
      } else dir.set(Math.cos(st.lastAng), Math.sin(st.lastAng), 0);
      const aim = Math.atan2(dir.y, dir.x);
      if (st.ikw > 0) {
        solveArm(aL.sh, aL.el, aL.sh.getWorldPosition(v1).addScaledVector(dir, armLen * .96), new V3(0, .25, -1), 16 * Sc, 15 * Sc, st.ikw);
        aL.sh.updateMatrixWorld(true);
      }
      const bowPos = aL.hd.getWorldPosition(new V3());
      const drawPx = (st.draw * 21 + 2) * Sc;
      let nock = bowPos.clone().addScaledVector(dir, -drawPx);
      if (name === 'flight') nock = st.nockPrev.clone().addScaledVector(dir, -14 * Sc * (1 - Math.exp(-st.rel * 18)) * (st.rel < .5 ? 1 : 0));
      else st.nockPrev.copy(nock);
      if (st.ikw > 0) {
        solveArm(aR.sh, aR.el, nock, new V3(-dir.x * .3, .1, 1), 16 * Sc, 15 * Sc, st.ikw);
        aR.sh.updateMatrixWorld(true);
      }
      if (st.ikw > .01 || name === 'victory') st.lastAng = aim;

      bowG.visible = st.bow > .002;
      if (bowG.visible) {
        const ang = st.lastAng * st.ikw + (name === 'victory' ? st.lastAng : -1.1) * (1 - st.ikw);
        bowG.position.copy(bowPos); bowG.rotation.set(0, 0, st.ikw > 0 ? aim : ang);
        bowG.scale.setScalar(Sc * Math.max(st.bow, .001));
        const vib = name === 'flight' ? Math.cos(st.rel * 70) * Math.exp(-st.rel * 8) * 5 : 0;
        const pa = strGeo.attributes.position;
        pa.setXYZ(1, -(st.draw * 21) * (name === 'flight' ? 0 : 1) + vib, 0, 0); pa.needsUpdate = true;
      }

      // arrow
      arr.visible = st.arrow !== 'none';
      if (st.arrow === 'nocked') {
        st.arrowK = Math.min(1, st.arrowK + dt * 5);
        arr.position.copy(nock); arr.rotation.set(0, 0, aim, 'ZXY'); arr.scale.setScalar(Sc * st.arrowK);
        if (name === 'flight') {
          st.arrow = 'fly'; st.tip0.copy(nockForRelease(st, bowPos, dir, Sc)); st.once.fly = 1; st.dist = st.tip0.distanceTo(R);
        }
      }
      if (st.arrow === 'fly') {
        const fu = cl(st.pt / D), p = cl(fu + .14 * Math.sin(2 * Math.PI * fu));
        const arc = st.dist * .05;
        const tipAt = (q, out) => out.lerpVectors(st.tip0, R, q).add(tmp.set(0, arc * 4 * q * (1 - q), 0));
        tipAt(p, v1);
        const dnow = tipAt(cl(p + .01), v2.clone()).sub(tipAt(cl(p - .01), new V3())).normalize();
        st.dirNow.copy(dnow);
        const tail = v1.clone().addScaledVector(dnow, -ARROW_L * Sc);
        arr.position.copy(tail); arr.rotation.set(p * 20, 0, Math.atan2(dnow.y, dnow.x), 'ZXY'); arr.scale.setScalar(Sc);
        for (let i = 0; i < 2; i++) {
          trail.emit(tail.x + (Math.random() - .5) * 3, tail.y + (Math.random() - .5) * 3, 1, 0, 0, 0, .55, 5 * Sc + Math.random() * 3, -3, 0, Math.random() < .3 ? [1, .35, .4] : [.9, .93, 1], .85);
        }
        if (fu >= 1) {
          st.arrow = 'stuck'; st.dirEnd.copy(dnow); st.impactT = 0;
          st.flash = 1; st.shake = 1; st.jolt = 1; st.lock = 0;
          burst(R, 80, 520); emitPuff(R, 6, 20, 60, 20, .35);
          addRing(R.x, R.y, 1, 0xffffff, 190 * Sc, .7); addRing(R.x, R.y, 1, 0xff4a5a, 120 * Sc, .5);
          window.dispatchEvent(new CustomEvent('rojgaar:impact'));
          enter(SEQ.indexOf('impact'));
        }
      }
      if (st.arrow === 'stuck') {
        st.impactT += dt;
        const q = .07 * Math.exp(-st.impactT * 4) * Math.sin(st.impactT * 55);
        const tail = R.clone().addScaledVector(st.dirEnd, -ARROW_L * Sc * .93);
        arr.position.copy(tail); arr.rotation.set(0, 0, Math.atan2(st.dirEnd.y, st.dirEnd.x) + q, 'ZXY');
        const fade = name === 'reset' ? 1 - ease(u) : 1; arr.scale.setScalar(Sc * fade);
        if (name === 'reset' && !st.once.d) { st.once.d = 1; burst(R, 24, 200); }
        if (name === 'reset' && u >= 1) st.arrow = 'none';
      }

      // reticle
      const lockOn = ['draw', 'hold'].includes(name);
      st.retA += ((lockOn ? 1 : 0) - st.retA) * Math.min(1, dt * (lockOn ? 6 : 12));
      ret.visible = st.retA > .01;
      if (ret.visible) {
        const e = name === 'draw' ? ease(u) : 1;
        const pulse = name === 'hold' ? 1 + Math.sin(w * 22) * .05 : 1;
        ret.position.set(R.x, R.y, 3); ret.scale.setScalar((38 + (1 - e) * 70) * pulse); ret.rotation.z = (1 - e) * 2.4;
        retMat.opacity = st.retA * (.35 + .65 * e); retMat.color.setHex(name === 'hold' ? 0xffffff : 0xff4a5a);
      }

      // fx update
      puffs.update(pdt); sparks.update(pdt); trail.update(dt);
      rings.forEach((r) => {
        if (r.t >= r.life) { r.mesh.visible = false; return; }
        r.t += dt; const q = cl(r.t / r.life);
        r.mesh.scale.set(r.maxR * eo(q) + 1, (r.maxR * eo(q) + 1) * r.flat, 1); r.mesh.material.opacity = (1 - q) * .9;
      });

      // DOM reactions
      st.shake = Math.max(0, st.shake - dt * 3.5); st.dip = Math.max(0, st.dip - dt * 2.4); st.jolt = Math.max(0, st.jolt - dt * 2.6); st.flash = Math.max(0, st.flash - dt * 3);
      koEl.style.transform = st.dip > .01 ? `translateY(${(Math.sin(st.dip * 3) * 7 * st.dip).toFixed(2)}px)` : '';
      const sk = st.shake * st.shake;
      if (heroEl) heroEl.style.translate = sk > .002 ? `${(Math.sin(st.t * 90) * 7 * sk).toFixed(1)}px ${(Math.cos(st.t * 77) * 6 * sk).toFixed(1)}px` : '';
      const core = rEl.parentElement;
      core.style.translate = st.jolt > .01 ? `${(Math.sin(st.t * 70) * 6 * st.jolt).toFixed(1)}px ${(Math.cos(st.t * 55) * 5 * st.jolt).toFixed(1)}px` : '';
      core.style.rotate = st.jolt > .01 ? `${(Math.sin(st.t * 40) * 7 * st.jolt).toFixed(1)}deg` : '';
      if (barT.current) { const y = `translateY(${-(1 - st.lb) * 100}%)`; barT.current.style.transform = y; barB.current.style.transform = `translateY(${(1 - st.lb) * 100}%)`; }
      if (flashRef.current) flashRef.current.style.opacity = (st.flash * .5).toFixed(3);
      if (vigRef.current) vigRef.current.style.opacity = (st.lb * .9).toFixed(3);

      // phase advance
      if (!reduced && st.pt >= D && name !== 'flight') {
        const nx = st.ph + 1;
        enter(nx >= SEQ.length ? LOOP_FROM : nx);
      }
      return m;
    };

    // tip position at release = nock + arrow length ahead
    function nockForRelease(s, bowPos, dir, Sc) {
      return s.nockPrev.clone().addScaledVector(dir, ARROW_L * Sc);
    }

    let raf = 0, last = performance.now();
    const frame = (now) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, .05); last = now;
      const m = step(reduced ? 0 : dt);
      if (m.onScreen) renderer.render(scene, cam);
      if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', onVis);
    if (reduced) { window.addEventListener('scroll', kick, { passive: true }); window.addEventListener('resize', kick); setTimeout(kick, 900); }
    kick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize); window.removeEventListener('scroll', kick); window.removeEventListener('resize', kick);
      document.removeEventListener('visibilitychange', onVis);
      koEl.style.transform = ''; if (heroEl) heroEl.style.translate = '';
      rEl.parentElement.style.translate = ''; rEl.parentElement.style.rotate = '';
      scene.traverse((o) => { o.geometry?.dispose?.(); });
      mat.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="archer-layer" ref={layerRef} aria-hidden="true">
      <div className="archer-vig" ref={vigRef} />
      <div className="archer-bar top" ref={barT} />
      <div className="archer-bar bottom" ref={barB} />
      <div className="archer-flash" ref={flashRef} />
    </div>
  );
}
