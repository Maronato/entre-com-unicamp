/* eslint-disable @next/next/no-img-element */
import { FunctionComponent, useState, useEffect } from "react"

import classNames from "classnames"

import { ReactIdenticon } from "@/utils/browser/identicon"

const computedAvatars: Record<string, ReactIdenticon> = {}

const getIdenticon = (name: string) =>
  name in computedAvatars
    ? computedAvatars[name]
    : (computedAvatars[name] = new ReactIdenticon(name))

const Avatar: FunctionComponent<{
  name: string
  className?: string
  src?: string
}> = ({ name, className, src }) => {
  const [icon, setIcon] = useState<ReactIdenticon>()

  useEffect(() => {
    const update = async () => {
      const identicon = getIdenticon(name)
      const rendered = await identicon.render()
      setIcon(rendered)
    }
    if (!src) {
      update()
    }
  }, [name, src])

  const Icon = icon?.toSVGComponent()

  return (
    <div
      className={classNames(
        "overflow-hidden rounded-full aspect-square",
        className
      )}>
      {src && <img src={src} />}
      {Icon && <Icon />}
    </div>
  )
}

export default Avatar
