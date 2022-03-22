/**
 * Adapted from https://github.com/stewartlord/identicon.js
 */

import {
  ClassAttributes,
  createElement,
  FunctionComponent,
  SVGAttributes,
} from "react"

import { BrowserIdenticon } from "./browser"
import { Rectangle } from "./utils"

export class ReactIdenticon extends BrowserIdenticon {
  toSVGComponent() {
    const component: FunctionComponent<
      ClassAttributes<SVGAElement> & SVGAttributes<SVGAElement>
    > = ({ children: _, ...props }) => {
      if (
        this.rectangles.length === 0 ||
        !this.foreground ||
        !this.background
      ) {
        return null
      }
      const backgroundColor = this.background.toString()
      const foregroundColor = this.foreground.toString()
      const strokeWidth = this.size * 0.005

      const createRect = (rect: Rectangle) =>
        createElement("rect", {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          key: `${rect.x}-${rect.y}-${rect.color.toString()}`,
        })

      return createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "100%",
          viewBox: `0 0 ${this.width} ${this.height}`,
          style: { backgroundColor },
          ...props,
        },
        createElement(
          "g",
          {
            style: {
              fill: foregroundColor,
              stroke: foregroundColor,
              strokeWidth,
            },
          },
          this.rectangles
            .filter((r) => r.color !== this.background)
            .map((r) => createRect(r))
        )
      )
    }
    return component
  }
}
