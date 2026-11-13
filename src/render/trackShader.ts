export const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0., 1.); }`;

/**
 * Draws the track for every pixel of the screen, at any zoom, from three data textures: the distance to the
 * track edge, the nearest centreline sample, and a table of what each sample is. Nothing is pre-painted, so
 * it is as sharp close up as far away.
 */
export const FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uSd, uNear, uTab, uMarks;
uniform vec2 uWorld;
uniform vec4 uView;
uniform vec3 uCam;
uniform float uN, uHalf, uTime, uNight;
uniform vec3 uDirt0, uDirt2, uGnd0, uGnd2, uBarA, uBarB, uMud, uWat;
out vec4 o;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return noise(p) * .55 + noise(p * 2.3 + 17.) * .3 + noise(p * 5.1 + 3.) * .15; }
float sdf(vec2 w) { return texture(uSd, clamp(w, vec2(.5), uWorld - .5) / uWorld).r; }
float band(float d) { return smoothstep(-.6, .4, d) * smoothstep(4.2, 3.2, d); }

// Light comes from the top left; shadows fall along S.
const vec2 S = vec2(.6, .8);

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uView.w - gl_FragCoord.y);
  vec2 l = (frag - uView.xy) / uView.z;
  if (l.x < 0. || l.y < 0. || l.x > 480. || l.y > 270.) { o = vec4(0, 0, 0, 1); return; }
  vec2 w = (l - vec2(240., 135.)) / uCam.z + uCam.xy;
  vec2 wc = clamp(w, vec2(.5), uWorld - .5);
  float d = sdf(wc);
  vec2 g = vec2(sdf(wc + vec2(1, 0)) - sdf(wc - vec2(1, 0)), sdf(wc + vec2(0, 1)) - sdf(wc - vec2(0, 1)));
  g /= max(length(g), 1e-4);
  float n1 = fbm(w * .035), n2 = noise(w * .7), n3 = noise(w * 2.6);
  vec3 col;
  float gloss = 0.;

  if (d < 3.6) {
    vec2 nb = texture(uNear, wc / uWorld).rg * 255.;
    float idx = floor(nb.x + .5) + floor(nb.y + .5) * 256.;
    ivec2 tc = ivec2(int(mod(idx, 1024.)), int(floor(idx / 1024.)) * 2);
    vec4 a = texelFetch(uTab, tc, 0);
    // The nearest-sample map is only as fine as a world pixel. Stepping to the sample this exact point
    // lies beside gives features clean straight edges instead of staircases.
    idx = mod(floor(idx + dot(w - a.xy, a.zw) * .5 + .5) + uN, uN);
    tc = ivec2(int(mod(idx, 1024.)), int(floor(idx / 1024.)) * 2);
    a = texelFetch(uTab, tc, 0);
    vec4 b = texelFetch(uTab, tc + ivec2(0, 1), 0);
    vec2 rel = w - a.xy;
    float along = dot(rel, a.zw);
    float lat = dot(rel, vec2(-a.w, a.z));
    float s = idx * 2. + along;
    if (d < 0.) {
      // Dirt, with ruts that run the way the track runs and a packed line down the middle.
      float rut = noise(vec2(s * .035, lat * .85)) * .6 + noise(vec2(s * .12, lat * 2.4)) * .4;
      vec3 dirt = mix(uDirt2, uDirt0, .2 + .55 * n1) * (.82 + .32 * rut) * (.96 + .08 * n3);
      dirt *= 1. - .12 * smoothstep(uHalf * .8, uHalf * .25, abs(lat)) * (.6 + .4 * rut);
      dirt = mix(dirt, uDirt0 * 1.1, smoothstep(-5., -.8, d) * .4);
      col = dirt;
      int sf = int(b.x + .5);
      float r = clamp(b.y + along * b.z, 0., 1.);
      float fade = smoothstep(0., .12, r) * smoothstep(1., .88, r);
      if (sf == 1) {
        col = mix(col, uMud * (.75 + .5 * n2), fade);
        gloss = .5 * fade;
      } else if (sf == 2) {
        float rip = sin((w.x + w.y * .6) * .9 + uTime * 2.2 + n1 * 9.);
        col = mix(col, mix(uWat * .7, uWat * 1.1, n1) + .22 * smoothstep(.8, 1., rip), fade);
        gloss = .9 * fade;
      } else if (sf == 3) {
        col = dirt * (1. + .32 * r) + .12 * smoothstep(.7, 1., r);
      } else if (sf == 4) {
        float px = (b.y + along * b.z) / max(b.z, 1e-4);
        col = dirt * (1. + .2 * sin(px * .628));
      } else if (sf == 5) {
        vec3 sand = vec3(.93, .86, .66) * (.94 + .07 * sin(lat * 1.5 + n1 * 9.));
        col = mix(col, mix(sand, uDirt0, .25), fade);
      } else if (sf == 6) {
        col *= .55 + .45 * r;
      }
      float sl = (idx < uN * .5 ? idx * 2. : (idx - uN) * 2.) + along;
      if (abs(sl) < 2.5) col = mix(vec3(.1), vec3(.93), mod(floor(lat / 2.5) + floor((sl + 2.5) / 2.5), 2.));
      vec4 m = texture(uMarks, wc / uWorld);
      col = mix(col, col * .5, m.a);
    } else {
      // Tyre wall: rounded, lit on the side facing the light, split into tyres.
      vec3 base = mod(floor(s / 8.), 2.) < 1. ? uBarA : uBarB;
      float round = sin(3.14159 * clamp(d / 3.6, 0., 1.));
      col = base * (.5 + .38 * round - .3 * dot(g, S));
      col *= .72 + .28 * smoothstep(0., .3, abs(fract(s / 4.) - .5) * 2.);
    }
  } else {
    col = mix(uGnd2, uGnd0, n1) * (.9 + .2 * n2) * (.95 + .1 * n3);
    if (d > 7.) {
      // Scrub and rocks scattered off the track, each with a lit top and a shadow.
      vec2 cell = floor(w / 13.);
      float top = 0., hl = 0., sh = 0.;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 c = cell + vec2(float(i), float(j));
        if (hash(c * 1.37 + 2.1) < .7) continue;
        vec2 pt = (c + vec2(hash(c + 3.1), hash(c + 7.7))) * 13.;
        if (sdf(pt) < 9.) continue;
        float rad = 2.2 + 3.8 * hash(c + 1.3);
        float m = smoothstep(rad, rad - 1.2, length(w - pt));
        if (m > top) { top = m; hl = smoothstep(rad, 0., length(w - pt + S * rad * .45)); }
        sh = max(sh, smoothstep(rad + .6, rad - 1., length(w - pt - S * rad * .7)));
      }
      col *= 1. - .4 * sh * (1. - top);
      col = mix(col, uGnd2 * (.5 + .6 * hl), top);
    }
  }

  if (d < 0. || d > 3.6) {
    float shd = max(band(sdf(wc - S * 2.2)), .6 * band(sdf(wc - S * 4.6)));
    col *= 1. - .42 * shd;
  }
  col += .25 * gloss * pow(max(0., noise(w * 3. + uTime * .3)), 6.);

  float e = min(min(w.x, w.y), min(uWorld.x - w.x, uWorld.y - w.y));
  col *= .45 + .55 * smoothstep(0., 36., e);
  col *= mix(vec3(1.), vec3(.62, .66, .88), uNight);
  col *= 1. + uNight * .4 * smoothstep(30., -uHalf, d);
  vec2 q = l / vec2(480., 270.) - .5;
  col *= 1. - .5 * dot(q, q);
  o = vec4(col, 1.);
}`;
