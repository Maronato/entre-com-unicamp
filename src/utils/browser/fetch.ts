export const postFetch = async <T>(
  url: string,
  body?: Record<string, unknown>
) => {
  const res: T = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  })
    .then((r) => {
      if (!r.ok) {
        throw r
      }
      return r
    })
    .then((r) => r.json())
  return res
}

export const patchFetch = async <T>(
  url: string,
  body?: Record<string, unknown>
) => {
  const res: T = await fetch(url, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  })
    .then((r) => {
      if (!r.ok) {
        throw r
      }
      return r
    })
    .then((r) => r.json())
  return res
}

export const getFetch = async <T>(url: string) => {
  const res: T = await fetch(url)
    .then((r) => {
      if (!r.ok) {
        throw r
      }
      return r
    })
    .then((r) => r.json())
  return res
}

export const deleteFetch = async (url: string) => {
  await fetch(url, { method: "DELETE" }).then((r) => {
    if (!r.ok) {
      throw r
    }
    return r
  })
}
