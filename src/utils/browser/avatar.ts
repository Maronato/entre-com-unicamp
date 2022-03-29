import { getTempAvatarURL } from "../common/cdn"

export const uploadFile = async (
  signedURL: string,
  userID: string,
  nonce: string,
  file: File
): Promise<string> => {
  const response = await fetch(signedURL, {
    headers: {
      "Content-Type": "image/*",
    },
    method: "PUT",
    body: file,
  })
  if (!response.ok) {
    throw new Error(`Upload API responded with ${response.status}`)
  }
  return getTempAvatarURL(userID, nonce)
}
