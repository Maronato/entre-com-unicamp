import { createRandomString } from "@/utils/common/random"

import { getRedis } from "../redis"
import { getInstruments, startStatusHistogram } from "../telemetry/metrics"
import { startActiveSpan } from "../telemetry/trace"

import { sendSESEmailCode, testAPICredentials } from "./aws"
import { sendConsoleEmailCode } from "./console"

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
    await redis.set(key, code, codeExpire)
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

export const sendEmailCode = (email: string, code: string) => {
  const { sendEmailDuration } = getInstruments()
  return startActiveSpan(
    "sendEmailCode",
    { attributes: { email, code } },
    async (span, setError) => {
      const apiKey = process.env.AWS_API_KEY
      const url = process.env.AWS_API_ENDPOINT
      const useSES = !!apiKey && !!url
      const transport: "console" | "aws" = useSES ? "aws" : "console"

      span.setAttributes({
        transport,
      })

      let status: boolean
      const record = startStatusHistogram(sendEmailDuration, {
        transport,
      })

      if (useSES) {
        status = await sendSESEmailCode(email, code)
      } else {
        status = await sendConsoleEmailCode(email, code)
      }

      record(status)

      if (!status) {
        setError("Error sending email code")
      }

      return status
    }
  )
}

export const testSendEmailCode = async (email: string, code: string) => {
  return startActiveSpan(
    "testSendEmailCode",
    { attributes: { email, code } },
    async (span, setError) => {
      const apiKey = process.env.AWS_API_KEY
      const url = process.env.AWS_API_ENDPOINT
      const useSES = !!apiKey && !!url
      const transport: "console" | "aws" = useSES ? "aws" : "console"

      span.setAttributes({
        transport,
      })

      let status: boolean

      if (useSES) {
        status = await testAPICredentials(url, apiKey)
      } else {
        status = await sendConsoleEmailCode(email, code)
      }

      if (!status) {
        setError("Error testing send email code")
      }

      return status
    }
  )
}
