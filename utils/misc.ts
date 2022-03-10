export function delay(duration: number) {
  return new Promise<void>(r => setTimeout(r, duration))
}