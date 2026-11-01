import * as THREE from 'three';

const cl = (x, a, b) => Math.min(b, Math.max(a, x));
const _m = new THREE.Matrix4();
const _qp = new THREE.Quaternion();

/*
  Two-bone IK in world space.
  sh = shoulder group (its -Y axis is the upper arm), el = elbow group (hinge on local X).
  len1/len2 are WORLD lengths (already multiplied by rig scale).
  Returns the world position the wrist ends up at.
*/
export function solveArm(sh, el, target, pole, len1, len2, w = 1) {
  const S = sh.getWorldPosition(new THREE.Vector3());
  const d = target.clone().sub(S);
  let dist = d.length();
  const dir = d.divideScalar(dist || 1);
  dist = cl(dist, Math.abs(len1 - len2) + 0.01, len1 + len2 - 0.01);

  const al = Math.acos(cl((len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist), -1, 1));
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (perp.lengthSq() < 1e-6) perp.set(0, 0, 1);
  perp.normalize();

  const E = S.clone().addScaledVector(dir, Math.cos(al) * len1).addScaledVector(perp, Math.sin(al) * len1);
  const Wp = S.clone().addScaledVector(dir, dist);
  const u = E.clone().sub(S).normalize();
  const f = Wp.clone().sub(E).normalize();
  let n = new THREE.Vector3().crossVectors(u, f);
  if (n.lengthSq() < 1e-6) n = new THREE.Vector3().crossVectors(u, perp);
  n.normalize();

  const negU = u.clone().negate();
  const z = new THREE.Vector3().crossVectors(n, negU);
  _m.makeBasis(n, negU, z);
  const qw = new THREE.Quaternion().setFromRotationMatrix(_m);
  sh.parent.getWorldQuaternion(_qp);
  qw.premultiply(_qp.invert());
  const th = Math.atan2(-f.dot(z), u.dot(f));

  sh.quaternion.slerp(qw, w);
  el.rotation.x += (th - el.rotation.x) * w;
  return Wp;
}
