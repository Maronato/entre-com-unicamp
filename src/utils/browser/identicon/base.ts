/**
 * Adapted from https://github.com/stewartlord/identicon.js
 */

import { Color, findForegroundBackground, Rectangle } from "./utils"

export class BaseIdenticon<
  R extends string | Promise<string>,
  H extends (message: string) => R = (message: string) => R
> {
  protected numberOfCells = 5
  protected contrastThreshold = 0.2
  protected margin = 0.2
  protected hashFunction: H

  message: string
  size: number
  foreground?: Color
  background?: Color
  rectangles: Rectangle[] = []

  get height(): number {
    return this.size
  }
  get width(): number {
    return this.size
  }

  constructor(hashFunction: H, message: string, size = 64) {
    this.message = message
    this.size = size
    this.hashFunction = hashFunction
  }

  protected doRender(hash: string, foreground: Color, background: Color) {
    if (this.rectangles.length > 0) {
      return this
    }
    this.foreground = foreground
    this.background = background

    const rectangles: Rectangle[] = []

    const baseMargin = Math.floor(this.size * this.margin)
    const cellWidth = Math.floor(
      (this.width - baseMargin * 2) / this.numberOfCells
    )
    const cellHeight = cellWidth
    const margin = Math.floor(
      (this.height - cellWidth * this.numberOfCells) / 2
    )

    const width = Math.ceil(this.numberOfCells / 2)
    const height = this.numberOfCells
    const iterations = height * width

    const getX = (index: number, inverted: boolean) => {
      const position = index % width
      return (
        (inverted ? this.numberOfCells - position - 1 : position) * cellWidth +
        margin
      )
    }
    const getY = (index: number) => {
      return (index % height) * cellHeight + margin
    }
    const getColor = (index: number) =>
      parseInt(hash.charAt(index), 16) % 2 ? background : foreground

    for (let i = 0; i < iterations; i++) {
      const x = getX(i, false)
      const xi = getX(i, true)
      const y = getY(i)
      const color = getColor(i)

      rectangles.push({ x, y, color, height: cellHeight, width: cellWidth })
      if (x !== xi) {
        rectangles.push({
          x: xi,
          y,
          color,
          height: cellHeight,
          width: cellWidth,
        })
      }
    }

    this.rectangles = rectangles
    return this
  }

  render(): R extends Promise<string> ? Promise<this> : this {
    if (this.rectangles.length > 0) {
      // @ts-ignore
      return this
    }
    const hash = this.hashFunction(this.message)
    if (hash instanceof Promise) {
      //@ts-ignore
      return hash.then((h) => {
        const [foreground, background] = findForegroundBackground(h)
        return this.doRender(h, foreground, background)
      })
    }
    const [foreground, background] = findForegroundBackground(hash)

    //@ts-ignore
    return this.doRender(hash, foreground, background)
  }

  toSVGString() {
    if (this.rectangles.length === 0 || !this.foreground || !this.background) {
      return "<svg />"
    }
    const backgroundColor = this.background.toString()
    const foregroundColor = this.foreground.toString()
    const strokeWidth = this.size * 0.005

    const createRect = (rect: Rectangle) =>
      `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" />`

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${this.width} ${this.height}" style="background-color: ${backgroundColor};">` +
      `<g style="fill: ${foregroundColor}; stroke: ${foregroundColor}; stroke-width: ${strokeWidth};">` +
      this.rectangles
        .filter((r) => r.color !== this.background)
        .map((r) => createRect(r)) +
      `</g>` +
      `</svg>`
    )
  }

  toBase64() {
    let encoded: string
    if (typeof btoa === "function") {
      encoded = btoa(this.toSVGString())
    } else if (Buffer) {
      encoded = new Buffer(this.toSVGString(), "binary").toString("base64")
    } else {
      throw "Cannot generate base64 output"
    }
    return `data:image/svg+xml;base64,${encoded}`
  }
}
