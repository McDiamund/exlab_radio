type Rgb = { r: number; g: number; b: number }

function blend(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r * (1 - t) + b.r * t,
    g: a.g * (1 - t) + b.g * t,
    b: a.b * (1 - t) + b.b * t,
  }
}

function regionAverage(data: Uint8ClampedArray, w: number, sx: number, sy: number, ex: number, ey: number): Rgb {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = sy; y < ey; y++) {
    for (let x = sx; x < ex; x++) {
      const i = (y * w + x) * 4
      const a = data[i + 3]
      if (a < 16) continue
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      n++
    }
  }
  if (!n) return { r: 200, g: 198, b: 190 }
  return { r: r / n, g: g / n, b: b / n }
}

function toRgb(c: Rgb): string {
  return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`
}

/** Builds a CSS `background` value (multi-layer) from a data URL image. */
export function buildBackgroundGradientFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = 48
      const h = 48
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      let data: ImageData
      try {
        data = ctx.getImageData(0, 0, w, h)
      } catch {
        reject(new Error('Cannot read image pixels'))
        return
      }
      const hw = Math.floor(w / 2)
      const hh = Math.floor(h / 2)
      const c1 = regionAverage(data.data, w, 0, 0, hw, hh)
      const c2 = regionAverage(data.data, w, hw, hh, w, h)
      const mid = regionAverage(data.data, w, 0, 0, w, h)
      const stop1 = blend(c1, { r: 255, g: 255, b: 255 }, 0.2)
      const stop2 = blend(c2, mid, 0.35)
      const stop3 = blend(mid, { r: 24, g: 24, b: 28 }, 0.55)
      const base = 'oklch(98.7% 0.022 95.277)'
      resolve(
        `linear-gradient(145deg, ${toRgb(stop1)} 0%, ${toRgb(stop2)} 52%, ${toRgb(stop3)} 100%), ${base}`,
      )
    }
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = dataUrl
  })
}
