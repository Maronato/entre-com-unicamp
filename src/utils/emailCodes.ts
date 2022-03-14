import { createRandomString } from "./random"
import { getRedis } from "./redis"
import { startActiveSpan } from "./telemetry/trace"

const getEmailKey = (email: string) => `email-code-${email}`
const codeExpire = 60 * 60

export const generateEmailCode = (email: string) => {
  return startActiveSpan("generateEmailCode", async (span) => {
    const key = getEmailKey(email)
    const code = createRandomString(2).toUpperCase()
    span.setAttributes({
      email,
      key,
      code,
    })

    const redis = await getRedis()
    await redis.set(key, code, { EX: codeExpire })
    return code
  })
}

export const emailCodeIsValid = (email: string, code: string) => {
  return startActiveSpan("emailCodeIsValid", async (span) => {
    const key = getEmailKey(email)
    span.setAttributes({
      email,
      key,
      code,
    })

    const redis = await getRedis()
    const value = await redis.getdel(key)

    const isValid = value === code
    span.setAttribute("is_valid", isValid)

    return isValid
  })
}
