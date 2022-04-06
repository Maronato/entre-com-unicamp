import { parseDocument, DomUtils } from "htmlparser2"

import { getRedis } from "../../redis"
import { getLogger } from "../../telemetry/logs"
import { startActiveSpan } from "../../telemetry/trace"

type DomHandlerElement = NonNullable<
  ReturnType<typeof DomUtils["getElementById"]>
>

const sessionKey = "gde-session-key"

const getRedisSession = async () => {
  return startActiveSpan("getRedisSession", async () => {
    const redis = await getRedis()
    return await redis.get(sessionKey)
  })
}
const setRedisSession = async (session: string) => {
  return startActiveSpan(
    "setRedisSession",
    { attributes: { session } },
    async () => {
      const redis = await getRedis()
      return await redis.set(sessionKey, session)
    }
  )
}
const invalidateRedisSession = async () => {
  return startActiveSpan("invalidateRedisSession", async () => {
    const redis = await getRedis()
    return await redis.del(sessionKey)
  })
}

const gdeBaseURL = "https://grade.daconline.unicamp.br"

const gdeCookieRegex = /gde_token=([\w.]+);/

const getSession = async (): Promise<string | null> => {
  const logger = getLogger()
  return startActiveSpan("getSession", async (span, setError) => {
    let session = await getRedisSession()
    span.setAttribute("reuseSession", session ? "true" : "false")

    if (!session) {
      const sessionResponse = await fetch(`${gdeBaseURL}/ajax/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
        body: `login=${process.env.GDE_USER}&senha=${process.env.GDE_PASSWORD}`,
      })

      const cookieMatch = (
        sessionResponse.headers.get("set-cookie") || ""
      ).match(gdeCookieRegex)

      if (
        !sessionResponse.ok ||
        !(await sessionResponse.json().catch(() => ({ ok: true }))).ok ||
        !cookieMatch
      ) {
        span.setAttributes({
          statusCode: sessionResponse.status,
          statusText: sessionResponse.statusText,
          data: await sessionResponse.json().catch(() => null),
        })
        logger.error(
          `GDE login failed: ${sessionResponse.status} ${sessionResponse.statusText}`
        )
        setError("GDE login failed")
        return null
      }
      session = cookieMatch[1]
      await setRedisSession(session)
    }
    return session
  })
}

const gdeGETRequest = async (
  url: string,
  retry = 1
): Promise<string | null> => {
  const logger = getLogger()
  return startActiveSpan(
    "gdeGETRequest",
    { attributes: { url, retry } },
    async (span, setError) => {
      const session = await getSession()
      if (!session) {
        logger.error("GDE session not found")
        setError("GDE session not found")
        return null
      }

      const response = await fetch(`${gdeBaseURL}${url}`, {
        method: "GET",
        headers: {
          Cookie: `gde_token=${session}`,
        },
      })

      if (!response.ok || response.status > 200) {
        if (retry > 0) {
          span.setAttributes({
            statusCode: response.status,
            statusText: response.statusText,
          })
          logger.info(
            `Retrying GDE request: ${response.status} ${response.statusText} ${url} retry=${retry}`
          )
          await invalidateRedisSession()
          return gdeGETRequest(url, retry - 1)
        }
        span.setAttributes({
          statusCode: response.status,
          statusText: response.statusText,
        })
        logger.error(
          `GDE request failed: ${response.status} ${response.statusText}`
        )
        setError("GDE request failed")
        return null
      }
      return response.text()
    }
  )
}

const isNotFound = (
  pageContent: DomHandlerElement | null
): pageContent is null => {
  if (pageContent) {
    const contentText = DomUtils.textContent(pageContent).trim().split("\n")[0]
    return /^[\p{L}\p{N}_]+ não encontrado\.\.\.$/iu.test(contentText)
  }
  return true
}

const extractPageContent = (page: string): DomHandlerElement | null => {
  const doc = parseDocument(page, { decodeEntities: true })
  const pageContent = DomUtils.getElementById("content", doc.childNodes)
  if (isNotFound(pageContent)) {
    return null
  }
  return pageContent
}

const getUserContent = async (
  email: string
): Promise<DomHandlerElement | null> => {
  const logger = getLogger()
  return startActiveSpan(
    "getUserContent",
    { attributes: { email } },
    async (span, setError) => {
      const username = email.split("@")[0]

      const page = await gdeGETRequest(`/perfil/?usuario=${username}`)
      if (!page) {
        logger.error("GDE user not found")
        setError("GDE user not found")
        return null
      }
      return extractPageContent(page)
    }
  )
}

const getStudentContent = async (
  email: string
): Promise<DomHandlerElement | null> => {
  const logger = getLogger()
  return startActiveSpan(
    "getStudentContent",
    { attributes: { email } },
    async (_, setError) => {
      const raMatch = email.match(/^[a-z]([0-9]+)@/)
      if (raMatch) {
        const page = await gdeGETRequest(`/perfil/?aluno=${raMatch[1]}`)
        if (page) {
          return extractPageContent(page)
        }
      }
      logger.error("GDE student not found")
      setError("GDE student not found")
      return null
    }
  )
}

type AcademicTab = {
  nome?: string
  ra?: string
  nível?: string
  curso?: string
  instituto?: string
  modalidade?: string
  "nível (pós)"?: string
  "curso (pós)"?: string
  "modalidade (pós)"?: string
}
const parseAcademicTab = (pageContent: DomHandlerElement): AcademicTab => {
  return startActiveSpan("parseAcademicTab", () => {
    const tab = DomUtils.getElementById("tab_academico", pageContent)
    const defaultData: AcademicTab = {
      nome: undefined,
      ra: undefined,
      nível: undefined,
      curso: undefined,
      instituto: undefined,
      modalidade: undefined,
      "curso (pós)": undefined,
      "nível (pós)": undefined,
      "modalidade (pós)": undefined,
    }
    if (!tab) {
      return defaultData
    }
    const rows: Record<string, string | null> = {}
    DomUtils.getElementsByTagName("tr", tab).forEach((row) => {
      const [keyElement, valueElement] = DomUtils.getElementsByTagName(
        "td",
        row
      )
      const key = DomUtils.textContent(keyElement)
        .trim()
        .toLowerCase()
        .replaceAll(":", "")
      const value = DomUtils.textContent(valueElement).trim()
      if (key in defaultData && value) {
        rows[key] = value
      }
    })
    return {
      ...rows,
    }
  })
}

export type GDEUserData = {
  academic: AcademicTab
}

export const fetchGDEData = (email: string): Promise<GDEUserData> => {
  const logger = getLogger()
  const defaultData: GDEUserData = {
    academic: {},
  }

  return startActiveSpan(
    "fetchUserData",
    { attributes: { email } },
    async (span, setError) => {
      try {
        let pageContent = await getStudentContent(email)
        span.addEvent("getStudentContent finished")

        // If user is a student
        if (pageContent) {
          span.setAttribute("userType", "student")
        }

        // If user is something else
        if (!pageContent) {
          pageContent = await getUserContent(email)
          span.addEvent("getUserContent finished")

          if (pageContent) {
            span.setAttribute("userType", "user")
          }
        }

        // If user is not found
        if (!pageContent) {
          logger.error("GDE user not found")
          setError("GDE user not found")
          return defaultData
        }

        // Parse sections and return
        const academic = parseAcademicTab(pageContent)
        span.addEvent("parseAcademicTab finished")

        return {
          ...defaultData,
          academic,
        }
      } catch (e) {
        logger.error(e)
        if (e instanceof Error) {
          span.recordException(e)
        }
        setError("Failed to fetch GDE data")
        return defaultData
      }
    }
  )
}
