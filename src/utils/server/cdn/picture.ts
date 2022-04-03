export const getTempAvatarKey = (id: string, nonce: string) =>
  `pictures/temp/${id}/${nonce}`
export const getCurrentAvatarKey = (id: string, nonce: string) =>
  `pictures/${id}/${nonce}`

const getCDNHost = () => {
  return process.env.CDN_URL || "http://localhost:9000/development"
}

export const getTempAvatarURL = (id: string, nonce: string) =>
  `${getCDNHost()}/${getTempAvatarKey(id, nonce)}`
export const getCurrentAvatarURL = (id: string, nonce: string) =>
  `${getCDNHost()}/${getCurrentAvatarKey(id, nonce)}`

export const parseTempAvatarURL = (
  url: string
): { id: string; nonce: string } | null => {
  const pathname = url.split(getCDNHost())[1]
  if (!pathname) {
    return null
  }
  const match = pathname.match(/\/pictures\/temp\/(.+)\/(.+)$/)
  if (!match) {
    return null
  }
  return {
    id: match[1],
    nonce: match[2],
  }
}

export const parseCurrentAvatarURL = (
  url: string
): { id: string; nonce: string } | null => {
  const pathname = url.split(getCDNHost())[1]
  if (!pathname) {
    return null
  }
  const match = pathname.match(/\/pictures\/(.+)\/(.+)$/)
  if (!match) {
    return null
  }
  return {
    id: match[1],
    nonce: match[2],
  }
}
