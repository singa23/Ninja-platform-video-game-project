export const NOISE = /* glsl */ `
float hash3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x), mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x), mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
`;

export const sunVert = /* glsl */ `
varying vec3 vP; varying vec3 vN; varying vec3 vV;
void main(){
  vP = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const sunFrag = /* glsl */ `
uniform float uTime;
varying vec3 vP; varying vec3 vN; varying vec3 vV;
${NOISE}
void main(){
  vec3 p = normalize(vP);
  float t = uTime;
  float n1 = fbm3(p*2.2 + vec3(0.0, t*0.03, t*0.015));
  float n2 = fbm3(p*5.5 - vec3(t*0.02) + n1);
  float gran = vnoise(p*42.0 + n2*3.0 + vec3(t*0.1));
  float heat = 0.55*n2 + 0.3*n1 + 0.15*gran;
  float spots = smoothstep(0.7, 0.74, fbm3(p*3.3 + 21.0 + t*0.004));
  vec3 c1 = vec3(0.85, 0.28, 0.04);
  vec3 c2 = vec3(1.0, 0.55, 0.14);
  vec3 c3 = vec3(1.0, 0.8, 0.45);
  vec3 col = mix(c1, c2, smoothstep(0.28, 0.5, heat));
  col = mix(col, c3, smoothstep(0.5, 0.68, heat));
  col = mix(col, vec3(0.3, 0.07, 0.0), spots*0.8);
  float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float limb = 0.42 + 0.58*pow(mu, 0.6);
  col *= limb * 1.35;
  col = mix(vec3(0.9, 0.3, 0.05), col, smoothstep(0.0, 0.35, mu));
  gl_FragColor = vec4(col, 1.0);
}`;

export const haloVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export const haloFrag = /* glsl */ `
uniform float uTime; uniform float uCore; uniform float uStrength;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 p = vUv*2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  float a = atan(p.y, p.x);
  float rd = max(d - uCore, 0.0) / (1.0 - uCore);
  float inner = exp(-rd*9.0);
  float wide = exp(-rd*3.2) * 0.35;
  float streams = pow(vnoise(vec3(cos(a)*3.0, sin(a)*3.0, uTime*0.05 + rd*1.5)), 2.5) * exp(-rd*4.0) * 0.9;
  float fade = smoothstep(1.0, 0.55, d);
  vec3 col = vec3(1.0, 0.62, 0.28) * (inner*1.1 + streams) + vec3(1.0, 0.45, 0.2) * wide;
  gl_FragColor = vec4(col * fade * uStrength, 1.0);
}`;

export const atmoVert = /* glsl */ `
varying vec3 vN; varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const atmoFrag = /* glsl */ `
uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(-vW);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uPower);
  float day = smoothstep(-0.35, 0.45, dot(N, L));
  gl_FragColor = vec4(uColor * fres * day * uIntensity, 1.0);
  #include <colorspace_fragment>
}`;

export const ringVert = /* glsl */ `
varying float vR; varying vec3 vW; varying vec3 vN;
void main(){
  vR = length(position.xy);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const ringFrag = /* glsl */ `
uniform sampler2D uMap; uniform float uInner; uniform float uOuter;
uniform vec3 uCenter; uniform float uRadius;
varying float vR; varying vec3 vW; varying vec3 vN;
void main(){
  float t = (vR - uInner) / (uOuter - uInner);
  if (t < 0.0 || t > 1.0) discard;
  vec4 c = texture2D(uMap, vec2(t, 0.5));
  vec3 L = normalize(-vW);
  vec3 V = normalize(cameraPosition - vW);
  float nl = dot(vN, L), nv = dot(vN, V);
  float lit = (nl * nv > 0.0) ? 1.0 : 0.42;
  float bright = lit * (0.55 + 0.45 * abs(nl));
  vec3 oc = uCenter - vW;
  float tt = dot(oc, L);
  float d2 = dot(oc, oc) - tt*tt;
  float sh = tt > 0.0 ? smoothstep(uRadius*uRadius*0.92, uRadius*uRadius*1.02, d2) : 1.0;
  bright *= mix(0.06, 1.0, sh);
  gl_FragColor = vec4(c.rgb * bright, c.a);
  #include <colorspace_fragment>
}`;

export const starVert = /* glsl */ `
attribute float aSize; attribute vec3 aColor;
uniform float uPixelRatio;
varying vec3 vColor;
void main(){
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio;
}`;

export const starFrag = /* glsl */ `
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a, 1.0);
}`;
