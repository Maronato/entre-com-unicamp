/**
 * Adapted from https://github.com/stewartlord/identicon.js
 */

export class Color {
  red: number
  green: number
  blue: number
  alpha: number

  constructor(red: number, green: number, blue: number, alpha = 255) {
    const format = (value: number) =>
      Math.max(Math.min(Math.round(value), 255), 0)
    this.red = format(red)
    this.green = format(green)
    this.blue = format(blue)
    this.alpha = format(alpha) / 255 || 0
  }

  toString() {
    return `rgba(${this.red},${this.green},${this.blue},${this.alpha})`
  }
}

/**
 * Derive a color from a hash string
 * @param hash String hash to use
 * @param substringSize Size of the substring. From 7 up
 * @param saturationModifier This value is inversely proportional to the saturation derived from the hash
 * @param brightnessModifier This value is inversely proportional to the brightness derived from the hash
 * @returns A Color derived from the hash
 */
function hashToColor(
  hash: string,
  substringSize = 7,
  saturationModifier = 1,
  brightnessModifier = 1
): Color {
  const hexValue = parseInt(hash.slice(-substringSize), 16)
  let hue = (hexValue ** 3 % 0xfffffff) / 0xfffffff
  let saturation =
    ((hexValue ** 5 % 0xfffffff) / 0xfffffff) ** saturationModifier
  let brightness =
    ((hexValue ** 7 % 0xfffffff) / 0xfffffff) ** brightnessModifier

  // From https://gist.github.com/aemkei/1325937
  hue *= 6
  const map = [
    (brightness += saturation *=
      brightness < 0.5 ? brightness : 1 - brightness),
    brightness - (hue % 1) * saturation * 2,
    (brightness -= saturation *= 2),
    brightness,
    brightness + (hue % 1) * saturation,
    brightness + saturation,
  ]
  const red = map[~~hue % 6] * 255
  const green = map[(hue | 16) % 6] * 255
  const blue = map[(hue | 8) % 6] * 255
  return new Color(red, green, blue)
}

function luma(color: Color): number {
  return 0.2126 * color.red + 0.7152 * color.green + 0.0722 * color.blue // SMPTE C, Rec. 709 weightings
}

function lumaDifference(color1: Color, color2: Color): number {
  return Math.abs(luma(color1) - luma(color2)) / 255
}

/**
 * Find a background color derived from a hash that has a high contrast to a foreground color
 * @param hash Hash string to derive colors form
 * @param foreground Foreground color to use
 * @param contrastThreshold From 0 to 1. Increase to derive higher contrasting backgrounds
 * @returns The derived background color
 */
function findContrastingBackground(
  hash: string,
  foreground: Color,
  contrastThreshold = 0.2
): Color {
  const colors: [number, Color][] = []
  for (let i = 8; i < hash.length; i++) {
    // Derive a background color from the last i+1 hash characters
    // Also use a modifier of 2 to reduce the saturation of the derived background
    const background = hashToColor(hash, i + 1, 2)
    const contrast = lumaDifference(foreground, background)

    // Auto return if above threshold
    if (contrast > contrastThreshold) {
      return background
    }
    colors[i] = [contrast, background]
  }

  // Return color with highest contrast
  return colors.sort((a, b) => b[0] - a[0])[0][1]
}

/**
 * Derives a foreground and background colors from a hash
 * @param hash Hash to derive colors from
 * @param contrastThreshold Minimum contrast between foreground and background
 * @returns Pair of [foreground, background] colors
 */
export function findForegroundBackground(
  hash: string,
  contrastThreshold?: number
): [Color, Color] {
  const foreground = hashToColor(hash, 7, 0.1)
  const background = findContrastingBackground(
    hash,
    foreground,
    contrastThreshold
  )
  return [foreground, background]
}

export interface Rectangle {
  x: number
  y: number
  height: number
  width: number
  color: Color
}
