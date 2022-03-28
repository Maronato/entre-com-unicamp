export const getTempAvatarKey = (id: string, nonce: string) =>
  `avatars/temp/${id}/${nonce}`
export const getCurrentAvatarKey = (id: string, nonce: string) =>
  `avatars/${id}/${nonce}`

export const getTempAvatarURL = (id: string, nonce: string) =>
  `https://cdn.entre-com-unicamp.com/${getTempAvatarKey(id, nonce)}`
export const getCurrentAvatarURL = (id: string, nonce: string) =>
  `https://cdn.entre-com-unicamp.com/${getCurrentAvatarKey(id, nonce)}`

export const parseTempAvatarURL = (
  url: string
): { id: string; nonce: string } | null => {
  const match = url.match(
    /https:\/\/cdn\.entre-com-unicamp\.com\/avatars\/temp\/(.+)\/(.+)$/
  )
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
  const match = url.match(
    /https:\/\/cdn\.entre-com-unicamp\.com\/avatars\/(.+)\/(.+)$/
  )
  if (!match) {
    return null
  }
  return {
    id: match[1],
    nonce: match[2],
  }
}
