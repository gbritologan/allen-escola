'use client'

import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * ATHENA — a figura do brandbook, no fundo da zona de entrada.
 *
 * Sabedoria, estratégia e guerra: a guerra que é preparação e execução, não
 * força bruta. Coruja (gravada no elmo), lança e a égide no peitoral.
 *
 * Ela é uma textura dentro de um shader, não uma <img>. O motivo é o vento:
 * CSS consegue mover a imagem inteira, mas não consegue mover o cabelo sem
 * mover o rosto junto. Deslocando a coordenada de leitura por região, o
 * penacho e as mechas ondulam enquanto o rosto e o peitoral ficam parados —
 * que é como vento se comporta.
 *
 * Decisões que fazem ela funcionar como fundo, e não como ilustração:
 *
 * 1. O desenho original é traço escuro sobre papel branco; virou traço claro
 *    com transparência real. Em fundo escuro, o papel seria um bloco branco.
 * 2. Sem `mix-blend-mode`. `screen` sobre canvas WebGL tira a composição da
 *    GPU e trava o renderizador — aconteceu aqui. Traço claro sobre fundo
 *    escuro chega ao mesmo resultado com opacidade normal.
 * 3. A máscara radial e a respiração vivem no shader, não em CSS: são uma
 *    multiplicação no alpha que a GPU já ia fazer de qualquer jeito.
 */

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAG = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform vec2  uResolution;
uniform float uTexAspect;
uniform float uTime;
uniform float uOpacity;
uniform float uWind;

out vec4 fragColor;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float canvasAspect = uResolution.x / uResolution.y;

  // "contain": a figura inteira cabe, sem distorcer.
  vec2 st = uv;
  if (canvasAspect > uTexAspect) {
    st.x = (uv.x - 0.5) * canvasAspect / uTexAspect + 0.5;
  } else {
    st.y = (uv.y - 0.5) * uTexAspect / canvasAspect + 0.5;
  }

  // Respiração: 1,2% de escala em ciclo longo. Ela inspira, não pulsa.
  float breathe = 1.0 - 0.012 * sin(uTime * 0.26);
  st = (st - 0.5) * breathe + 0.5;

  float fromTop = 1.0 - st.y;

  // ONDE O VENTO PEGA.
  // Penacho e cabelo (topo) recebem quase tudo; rosto e peitoral, quase nada.
  // Sem essa máscara, a figura inteira ondula e vira gelatina.
  float plume = smoothstep(0.42, 0.02, fromTop);
  // As bordas laterais (mechas soltas, capa) se mexem mais que o eixo do corpo.
  float edge  = smoothstep(0.06, 0.34, abs(st.x - 0.5));
  float mask  = clamp(plume * 0.85 + edge * 0.5, 0.0, 1.0);

  float t = uTime;
  vec2 d;
  d.x = sin(st.y * 11.0 + t * 0.85) * 0.55
      + snoise(vec2(st.x * 3.2, st.y * 3.2 - t * 0.22)) * 0.45;
  d.y = cos(st.x * 8.0 - t * 0.62) * 0.30
      + snoise(vec2(st.x * 2.4 + 11.0, st.y * 2.4 - t * 0.18)) * 0.30;

  st += d * uWind * mask;

  // Fora dos limites da textura não existe figura — evita borrão nas beiradas.
  if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) {
    fragColor = vec4(0.0);
    return;
  }

  vec4 c = texture(uTex, st);

  // Máscara elíptica, normalizada: r = 1 na borda da elipse. A versão
  // anterior usava um círculo de raio 0.30-0.62 em espaço de textura e comia
  // a figura inteira — parecia que o shader não estava desenhando nada.
  float r = length((st - vec2(0.5, 0.45)) / vec2(0.74, 0.64));
  float fade = 1.0 - smoothstep(0.62, 1.12, r);

  // Saída PRÉ-MULTIPLICADA, para casar com o contexto premultipliedAlpha:true
  // e o blendFunc(ONE, ONE_MINUS_SRC_ALPHA). Misturar as duas convenções faz
  // o canvas compor errado e a figura simplesmente não aparece.
  float alpha = c.a * fade * uOpacity;
  fragColor = vec4(c.rgb * alpha, alpha);
}
`

export function Athena({
  /** Opacidade final. Sutil, mas presente — invisível não serve. */
  opacity = 0.2,
  /** Amplitude do deslocamento, em fração da textura. Acima de 0.01 vira água. */
  wind = 0.006,
  className,
}: {
  opacity?: number
  wind?: number
  className?: string
}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = container.current
    if (!node) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio, 2),
    })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    Object.assign(gl.canvas.style, { width: '100%', height: '100%', display: 'block' })

    const texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      flipY: true,
      premultiplyAlpha: false,
    })

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      transparent: true,
      uniforms: {
        uTex: { value: texture },
        // Em pixels do buffer, não em CSS: gl_FragCoord é em pixels do buffer.
        // Com dpr 2 e uResolution em CSS, uv ia de 0 a 2 e a figura era
        // desenhada num quarto do canvas.
        uResolution: { value: [node.offsetWidth, node.offsetHeight] },
        uTexAspect: { value: 1 },
        uTime: { value: 0 },
        uOpacity: { value: opacity },
        uWind: { value: wind },
      },
    })

    const geometry = new Triangle(gl)
    if (geometry.attributes.uv) delete geometry.attributes.uv
    const mesh = new Mesh(gl, { geometry, program })
    node.appendChild(gl.canvas)

    function resize() {
      if (!node) return
      renderer.setSize(node.offsetWidth, node.offsetHeight)
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height]
    }
    resize()
    window.addEventListener('resize', resize)

    let frame = 0
    let pronto = false

    const draw = (ms: number) => {
      frame = requestAnimationFrame(draw)
      if (!pronto) return
      program.uniforms.uTime.value = ms * 0.001
      renderer.render({ scene: mesh })
    }

    const img = new Image()
    img.decoding = 'async'

    const aoCarregar = () => {
      texture.image = img
      program.uniforms.uTexAspect.value = img.naturalWidth / img.naturalHeight
      pronto = true
      if (reduceMotion) {
        // Um quadro, num ponto bonito do ruído. Sem movimento nenhum.
        program.uniforms.uTime.value = 4.1
        program.uniforms.uWind.value = 0
        renderer.render({ scene: mesh })
      }
    }

    // O handler ANTES do src, e `complete` como rede: com a imagem em cache o
    // evento `load` dispara antes de o listener existir, e a textura nunca
    // chega. Foi exatamente o que aconteceu aqui.
    img.onload = aoCarregar
    img.src = '/brand/athena.webp'
    if (img.complete && img.naturalWidth > 0) aoCarregar()

    if (!reduceMotion) frame = requestAnimationFrame(draw)

    const onVisibility = () => {
      if (reduceMotion) return
      cancelAnimationFrame(frame)
      if (!document.hidden) frame = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      if (gl.canvas.parentNode === node) node.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [opacity, wind])

  return <div ref={container} aria-hidden className={cn('pointer-events-none absolute', className)} />
}
