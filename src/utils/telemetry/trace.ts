import { api } from "@opentelemetry/sdk-node"

import { APP_NAME } from "./consts"

export const getTracer = () => {
  return api.trace.getTracer(APP_NAME)
}
