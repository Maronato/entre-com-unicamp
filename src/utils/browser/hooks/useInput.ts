import { ChangeEventHandler, useState } from "react"

export type InputHandler = ChangeEventHandler<HTMLInputElement>

export const useInput = (initial = "") => {
  const [input, setInput] = useState(initial)
  const onChange: InputHandler = (e) => setInput(e.target.value)

  return [input, onChange, setInput] as [
    typeof input,
    typeof onChange,
    typeof setInput
  ]
}
