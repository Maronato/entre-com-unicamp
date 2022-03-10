export const postFetch = async <T>(url: string, body?: Record<string, unknown>) => {
  const res: T = await fetch(url, { method: "POST", body: JSON.stringify(body), headers: {
    "Content-type": "application/json; charset=UTF-8"
  } }).then(r => r.json())
  return res
}

export const getFetch = async <T>(url: string) => {
  const res: T = await fetch(url).then(r => r.json())
  return res
}
