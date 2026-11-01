import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
  Black hole background (fixed, behind all landing content).
  - Lensed starfield bends around the event horizon.
  - Tilted accretion disk with swirling crimson-to-white-hot streaks + Doppler brighter left side.
  - Halo ring (the "Interstellar" arc over/under the hole) + thin photon ring.
  - Cursor drifts the lens slightly; click/tap sends a shockwave and flares the disk.
  - Hole is anchored to the hero's `.landing-art` box, drifts up slowly while scrolling and dims so text stays readable.
  - Pauses on hidden tab, static frame for prefers-reduced-motion, silently skips if WebGL is missing.
*/

const VERT = /* glsl */`
void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */`
precision highp float;
uniform vec2  uRes;
uniform vec2  uCenter;   // px, origin bottom-left
uniform float uRs;       // horizon radius in px
uniform float uTime, uIntro, uPulse, uFade, uLeft;
uniform vec2  uMouse;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }

float stars(vec2 uv, float scale, float thr){
  vec2 g = floor(uv * scale), f = fract(uv * scale);
  float h = hash(g);
  if (h < thr) return 0.;
  vec2 pos = vec2(hash(g + 1.7), hash(g + 9.2));
  float d = length(f - pos);
  float tw = .65 + .35 * sin(uTime * (1. + h * 3.) + h * 40.);
  return smoothstep(.07, .0, d) * (h - thr) / (1. - thr) * tw * 2.2;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 c = uCenter + uMouse * uRes * 0.018;
  float rs = max(uRs * uIntro, 1.0);
  vec2 p = (frag - c) / rs;
  float r = length(p);
  vec2 dir = p / max(r, 1e-3);
  float ang = atan(p.y, p.x);

  // --- gravitational lensing of the starfield
  float k = 1.5;
  vec2 b = p - dir * min(k / max(r, 1e-3), r * .98);
  vec2 sUV = (c + b * rs) / uRes.y;
  float st = stars(sUV, 38., .965) + stars(sUV + 3.1, 85., .985) * .8;
  vec3 col = vec3(.9, .93, 1.) * st * .85;

  // --- soft red glow hugging the hole
  vec3 red = vec3(.66, .70, .80);
  col += red * .035 * exp(-max(r - 1., 0.) * .6) * uIntro;

  // --- accretion disk (tilted ellipse)
  float tilt = .21;
  vec2 dq = vec2(p.x, p.y / tilt);
  float dr = length(dq);
  float da = atan(dq.y, dq.x);
  float band = smoothstep(1.5, 1.95, dr) * smoothstep(4.6, 2.4, dr);
  float spin = uTime * 1.5 / (dr * .85 + .6);
  float n = fbm(vec2(da * 3.0 - spin, dr * 5.0 - uTime * .08));
  float streak = fbm(vec2(da * 9.0 - spin * 1.3, dr * 14.0));
  float dens = band * (.25 + 1.15 * n) * (.55 + .9 * streak);
  float heat = pow(clamp(1. - (dr - 1.55) / 3.1, 0., 1.), 1.7);
  vec3 dcol = mix(vec3(.05, .05, .065), red * .95, heat);
  dcol = mix(dcol, vec3(1., .98, .96), heat * heat * .85);
  float dop = pow(clamp(1. + .55 * (-dq.x / max(dr, .001)), .15, 1.9), 3.) * .55;
  float boost = 1. + uPulse * 2.2;
  vec3 disk = dcol * dens * dop * 1.9 * boost;
  float diskVis = (p.y < 0.) ? 1. : smoothstep(.985, 1., r);   // front half passes over the hole

  // --- lensed halo + photon ring
  float haloN = .55 + .8 * fbm(vec2(ang * 2.0 + uTime * .5, r * 3.));
  float halo = exp(-pow((r - 1.30) / .15, 2.)) * haloN * (.65 + .55 * (-p.x / max(r, .001)));
  vec3 haloCol = mix(red, vec3(1.), .4) * halo * 1.2 * boost;
  float photon = exp(-pow((r - 1.045) / .028, 2.)) * 1.6;
  vec3 ringCol = vec3(.95, .96, 1.) * photon;

  // --- shockwave on click
  float wave = (1. - uPulse) * 16.;
  vec3 shock = red * exp(-pow((r - 1.6 - wave) / .55, 2.)) * uPulse * .6;

  float mask = smoothstep(.985, 1., r);
  vec3 add = col * mask + disk * diskVis + (haloCol + ringCol) * smoothstep(1., 1.04, r) + shock;

  // left side dimmed on wide screens so headline stays readable
  float lx = mix(uLeft, 1., smoothstep(.12, .62, frag.x / uRes.x));
  add *= lx * uFade * uIntro;

  vec3 page = vec3(.035, .039, .051);
  vec3 outc = page * mask + (1. - exp(-add * 1.25));
  outc *= 1. - .35 * smoothstep(.55, 1.15, length((frag / uRes - .5) * vec2(1.2, 1.)));
  outc += (hash(frag + fract(uTime)) - .5) / 255.;
  gl_FragColor = vec4(outc, 1.);
}`;

export default function BlackHole() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' }); }
    catch { return undefined; }

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const U = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uCenter: { value: new THREE.Vector2(0, 0) },
      uRs: { value: 80 }, uTime: { value: 0 }, uIntro: { value: reduced ? 1 : 0 },
      uPulse: { value: 0 }, uFade: { value: 1 }, uLeft: { value: .35 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    mesh.frustumCulled = false;
    scene.add(mesh);

    // anchor = centre of the hero's art box (page coords), measured on resize
    let W = 1, H = 1, anchorX = 0, anchorY = 0, rsPx = 80;
    const measure = () => {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H, false);
      U.uRes.value.set(W * dpr, H * dpr);
      const wide = W > 820;
      U.uLeft.value = wide ? .3 : 1;
      const art = document.querySelector('.landing-art');
      if (art) {
        const r = art.getBoundingClientRect();
        anchorX = r.left + r.width / 2;
        anchorY = r.top + window.scrollY + r.height / 2;
        rsPx = Math.max(46, r.width * .16);
      } else {
        anchorX = W * (wide ? .74 : .5); anchorY = H * .34; rsPx = Math.min(H * .085, W * .12);
      }
    };
    measure();
    const remeasure = setTimeout(measure, 900);          // after fonts/layout settle
    window.addEventListener('resize', measure);

    const mouse = new THREE.Vector2(), sm = new THREE.Vector2();
    let pulse = 0;
    const onMove = (e) => { mouse.set((e.clientX / W - .5) * 2, -(e.clientY / H - .5) * 2); };
    const onDown = () => { pulse = 1; };
    const onImpact = () => { pulse = 1; };
    window.addEventListener('rojgaar:impact', onImpact);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });

    let raf = 0, last = performance.now(), t = 0, intro = 0;
    const frame = (now) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, .05); last = now;
      t += dt;
      if (!reduced) intro = Math.min(intro + dt / 2.4, 1);
      const eased = 1 - Math.pow(1 - intro, 4);
      sm.lerp(mouse, 1 - Math.pow(.002, dt));
      pulse = Math.max(0, pulse - dt * 1.1);

      const sy = window.scrollY;
      const cy = anchorY - sy * .62;                       // drifts up slower than the page = depth
      U.uCenter.value.set(anchorX * dpr, (H - cy) * dpr);
      U.uRs.value = rsPx * dpr;
      U.uFade.value = 1 - .62 * Math.min(Math.max(sy / (H * .9), 0), 1);
      U.uIntro.value = eased;
      U.uTime.value = t;
      U.uPulse.value = pulse * pulse;
      U.uMouse.value.copy(sm);
      renderer.render(scene, camera);
      if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const onVis = () => { if (!document.hidden) kick(); };
    const onScroll = () => { if (reduced) kick(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('scroll', onScroll, { passive: true });
    kick();

    return () => {
      cancelAnimationFrame(raf); clearTimeout(remeasure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('rojgaar:impact', onImpact);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      mesh.geometry.dispose(); mat.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="blackhole-bg" ref={hostRef} aria-hidden="true" />;
}
