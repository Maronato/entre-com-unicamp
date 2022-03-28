export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append("image", file)
  const response = await fetch(`https://api.imgur.com/3/image`, {
    method: "POST",
    headers: {
      Authorization: `Client-ID ${process.env.NEXT_PUBLIC_IMGUR_CLIENT_ID}`,
      Origin: "https://entre-com-unicamp.com",
    },
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Imgur API responded with ${response.status}`)
  }
  const json = await response.json()
  return json.data.link
}
