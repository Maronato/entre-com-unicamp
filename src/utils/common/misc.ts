export const isURL = (url: string) => {
  // https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
  const expr = /^https?:\/\/\w+(\.\w+)*(:[0-9]+)?(\/.*)?$/
  return !!url.match(expr)
}
