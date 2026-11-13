import type { RGB, Theme } from '../content/themes';
import type { Track } from '../track/build';
import type { Screen } from './screen';
import { FRAG, VERT } from './trackShader';

const TAB_W = 1024;

/** The graphics-card track renderer. One instance, drawing on the canvas beneath the game's own. */
export class TrackGL {
  private static inst: TrackGL | null | undefined;

  /** Returns the renderer, or null where the browser cannot provide one (the game then paints tracks itself). */
  static get(): TrackGL | null {
    if (TrackGL.inst !== undefined) return TrackGL.inst;
    try {
      TrackGL.inst = new TrackGL(document.getElementById('gl') as HTMLCanvasElement);
    } catch {
      TrackGL.inst = null;
    }
    return TrackGL.inst;
  }

  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private tex: Record<'uSd' | 'uNear' | 'uTab' | 'uMarks', WebGLTexture>;
  private loc = new Map<string, WebGLUniformLocation | null>();
  private marksAt = 0;
  /** The track currently loaded, so the same one is not uploaded twice. */
  private current: Track | null = null;

  private constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!gl) throw new Error('no webgl2');
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const make = (filter: number) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.tex = { uSd: make(gl.LINEAR), uNear: make(gl.NEAREST), uTab: make(gl.NEAREST), uMarks: make(gl.LINEAR) };
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  }

  private u(name: string): WebGLUniformLocation | null {
    if (!this.loc.has(name)) this.loc.set(name, this.gl.getUniformLocation(this.prog, name));
    return this.loc.get(name)!;
  }

  load(t: Track, th: Theme): void {
    if (this.current === t) return;
    this.current = t;
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.uSd);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, t.w, t.h, 0, gl.RED, gl.FLOAT, t.sd);
    const near = new Uint8Array(t.w * t.h * 2);
    for (let i = 0; i < t.near.length; i++) {
      near[i * 2] = t.near[i] & 255;
      near[i * 2 + 1] = t.near[i] >> 8;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.tex.uNear);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, t.w, t.h, 0, gl.RG, gl.UNSIGNED_BYTE, near);

    // Two rows per block of samples: where the sample is and which way it runs, then what is built on it.
    const rows = Math.ceil(t.n / TAB_W);
    const tab = new Float32Array(TAB_W * rows * 2 * 4);
    for (let i = 0; i < t.n; i++) {
      const a = ((Math.floor(i / TAB_W) * 2) * TAB_W + (i % TAB_W)) * 4;
      const b = a + TAB_W * 4;
      tab[a] = t.sx[i];
      tab[a + 1] = t.sy[i];
      tab[a + 2] = t.tx[i];
      tab[a + 3] = t.ty[i];
      const next = (i + 1) % t.n;
      const prev = (i + t.n - 1) % t.n;
      let surf = t.sampleSurf[i];
      let rel = t.sampleRel[i];
      // How fast the position within the feature changes per pixel, for smooth edges between samples.
      let step = 0;
      if (surf && t.sampleSurf[next] === surf && t.sampleRel[next] > rel) step = (t.sampleRel[next] - rel) / 2;
      else if (surf && t.sampleSurf[prev] === surf) step = (rel - t.sampleRel[prev]) / 2;
      if (!surf && t.sampleShade[i]) {
        // The few samples past a jump lip are drawn as its shadow, fading out.
        let k = 0;
        while (k < 3 && t.sampleShade[(i + t.n - 1 - k) % t.n]) k++;
        surf = 6;
        rel = k / 3;
        step = 1 / 6;
      }
      tab[b] = surf;
      tab[b + 1] = rel;
      tab[b + 2] = step;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.tex.uTab);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TAB_W, rows * 2, 0, gl.RGBA, gl.FLOAT, tab);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.uMarks);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

    const c3 = (name: string, c: RGB) => gl.uniform3f(this.u(name), c[0] / 255, c[1] / 255, c[2] / 255);
    c3('uDirt0', th.dirt[0]);
    c3('uDirt2', th.dirt[2]);
    c3('uGnd0', th.ground[0]);
    c3('uGnd2', th.ground[2]);
    c3('uBarA', th.barrierA);
    c3('uBarB', th.barrierB);
    c3('uMud', th.mud[0]);
    c3('uWat', th.water[1]);
    gl.uniform2f(this.u('uWorld'), t.w, t.h);
    gl.uniform1f(this.u('uN'), t.n);
    gl.uniform1f(this.u('uHalf'), t.half);
    gl.uniform1f(this.u('uNight'), th.night ? 1 : 0);
    (['uSd', 'uNear', 'uTab', 'uMarks'] as const).forEach((n, i) => gl.uniform1i(this.u(n), i));
  }

  /** Sends the tyre-mark layer to the card; at most a few times a second, as it is a large picture. */
  marks(canvas: HTMLCanvasElement, now: number): void {
    if (now - this.marksAt < 0.15) return;
    this.marksAt = now;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex.uMarks);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  draw(s: Screen, cx: number, cy: number, zoom: number, time: number): void {
    const gl = this.gl;
    const w = s.canvas.width;
    const h = s.canvas.height;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);
    (['uSd', 'uNear', 'uTab', 'uMarks'] as const).forEach((n, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.tex[n]);
    });
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform4f(this.u('uView'), s.ox, s.oy, s.scale, h);
    gl.uniform3f(this.u('uCam'), cx, cy, zoom);
    gl.uniform1f(this.u('uTime'), time % 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
