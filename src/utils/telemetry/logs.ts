import winston, { transports, format, add } from "winston"

let initialized = false

export const getLogger = () => {
  if (!initialized) {
    add(
      new transports.Console({
        format: format.combine(format.colorize(), format.simple()),
      })
    )
    initialized = true
  }
  return winston
}
