export interface CuerpoSticker {
  x: number
  y: number
  vx: number
  vy: number
  giro: number
  velocidadGiro: number
  ultimoImpacto: string | null
  esperaImpacto: number
}

export interface ObstaculoSticker {
  id: string
  left: number
  right: number
  top: number
  bottom: number
}

export interface EntornoSticker {
  ancho: number
  alto: number
  obstaculos: readonly ObstaculoSticker[]
}

const gravedad = 280
const esperaRebote = 0.85

export function avanzarSticker(
  cuerpo: CuerpoSticker,
  delta: number,
  radio: number,
  entorno: EntornoSticker,
): boolean {
  if (delta <= 0) return false

  const { ancho, alto, obstaculos } = entorno
  const limiteIzquierdo = Math.min(radio, ancho / 2)
  const limiteDerecho = ancho - limiteIzquierdo
  const velocidadTerminal = Math.max(150, Math.min(225, alto * 0.23))
  const xAnterior = cuerpo.x
  const yAnterior = cuerpo.y

  cuerpo.vx *= Math.exp(-0.7 * delta)
  cuerpo.vy = Math.min(velocidadTerminal, cuerpo.vy + gravedad * delta)
  cuerpo.giro += cuerpo.velocidadGiro * delta
  cuerpo.esperaImpacto = Math.max(0, cuerpo.esperaImpacto - delta)
  if (cuerpo.esperaImpacto === 0) cuerpo.ultimoImpacto = null

  const xSiguiente = xAnterior + cuerpo.vx * delta
  const xLimitado = Math.min(
    limiteDerecho,
    Math.max(limiteIzquierdo, xSiguiente),
  )
  const dx = xLimitado - xAnterior
  const dy = cuerpo.vy * delta
  let impacto: ObstaculoSticker | undefined
  let instanteImpacto = Infinity
  let impactoLateral = false

  for (const obstaculo of obstaculos) {
    if (cuerpo.ultimoImpacto === obstaculo.id) continue

    const izquierda = obstaculo.left - radio
    const derecha = obstaculo.right + radio
    const arriba = obstaculo.top - radio
    const abajo = obstaculo.bottom + radio

    // Un sticker colocado dentro del panel puede seguir su trayectoria y salir.
    if (
      xAnterior > izquierda &&
      xAnterior < derecha &&
      yAnterior > arriba &&
      yAnterior < abajo
    ) {
      continue
    }

    if (dx === 0 && (xAnterior <= izquierda || xAnterior >= derecha)) continue
    if (dy === 0 && (yAnterior <= arriba || yAnterior >= abajo)) continue

    // El centro cruza el rectángulo expandido en el primer instante común a ambos ejes.
    const entradaX =
      dx === 0 ? -Infinity : ((dx > 0 ? izquierda : derecha) - xAnterior) / dx
    const salidaX =
      dx === 0 ? Infinity : ((dx > 0 ? derecha : izquierda) - xAnterior) / dx
    const entradaY =
      dy === 0 ? -Infinity : ((dy > 0 ? arriba : abajo) - yAnterior) / dy
    const salidaY =
      dy === 0 ? Infinity : ((dy > 0 ? abajo : arriba) - yAnterior) / dy
    const entrada = Math.max(entradaX, entradaY)

    if (entrada < 0 || entrada > 1 || entrada >= instanteImpacto) continue
    if (entrada >= Math.min(salidaX, salidaY)) continue

    impacto = obstaculo
    instanteImpacto = entrada
    impactoLateral = entradaX > entradaY
  }

  if (!impacto) {
    cuerpo.x = xLimitado
    cuerpo.y += dy
    if (xLimitado !== xSiguiente && cuerpo.vx * (xSiguiente - xLimitado) > 0) {
      cuerpo.vx *= -0.38
    }
    return false
  }

  cuerpo.x += dx * instanteImpacto
  cuerpo.y += dy * instanteImpacto
  const haciaIzquierda = cuerpo.x < (impacto.left + impacto.right) / 2
  const direccion = haciaIzquierda ? -1 : 1

  if (impactoLateral) {
    cuerpo.vx = -Math.sign(dx) * (Math.abs(cuerpo.vx) * 0.43 + 27)
    cuerpo.vy *= 0.8
  } else {
    cuerpo.vx = cuerpo.vx * 0.4 + direccion * 49
    cuerpo.vy *= -0.37
  }

  cuerpo.velocidadGiro =
    cuerpo.velocidadGiro * 0.35 + (cuerpo.vx < 0 ? -1 : 1) * 86
  cuerpo.ultimoImpacto = impacto.id
  cuerpo.esperaImpacto = esperaRebote
  return true
}
