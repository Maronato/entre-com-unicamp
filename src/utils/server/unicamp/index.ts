import { startActiveSpan } from "../telemetry/trace"

import { fetchGDEData } from "./gde"

export type UnicampData = {
  university_id?: string
  intitute?: string
  undergraduate_level?: string
  undergraduate_course?: string
  undergraduate_sub_course?: string
  graduate_level?: string
  graduate_course?: string
  graduate_sub_course?: string
}
export const fetchUnicampData = async (
  email: string,
  name?: string
): Promise<readonly [string | undefined, UnicampData | undefined]> => {
  return startActiveSpan(
    "fetchUnicampData",
    { attributes: { email, name } },
    async () => {
      const gdeData = await fetchGDEData(email)
      const { nome, ...data } = gdeData.academic

      const username = name || nome || undefined

      const unicampData: UnicampData = {}
      if (data.ra) {
        unicampData.university_id = data.ra
      }
      if (data.instituto) {
        unicampData.intitute = data.instituto
      }
      if (data.nível) {
        unicampData.undergraduate_level = data.nível
      }
      if (data.curso) {
        unicampData.undergraduate_course = data.curso
      }
      if (data.modalidade) {
        unicampData.undergraduate_sub_course = data.modalidade
      }
      if (data["nível (pós)"]) {
        unicampData.graduate_level = data["nível (pós)"]
      }
      if (data["curso (pós)"]) {
        unicampData.graduate_course = data["curso (pós)"]
      }
      if (data["modalidade (pós)"]) {
        unicampData.graduate_sub_course = data["modalidade (pós)"]
      }

      if (Object.values(unicampData).every((v) => v === undefined)) {
        return [username, undefined] as const
      }
      return [username, unicampData] as const
    }
  )
}
