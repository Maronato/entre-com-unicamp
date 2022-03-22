import { FormEvent, FunctionComponent, useEffect, useState } from "react"

import { Switch } from "@headlessui/react"
import classNames from "classnames"
import useSWR from "swr"

import { AppType, SerializedApp } from "@/oauth/app/types"
import { getScopeDescription } from "@/oauth/scope"
import { getFetch, patchFetch } from "@/utils/browser/fetch"

import Button from "../Button"

import CopyValue from "./CopyValue"

const ViewApp: FunctionComponent<{ clientID: string }> = ({ clientID }) => {
  const { data, error, mutate } = useSWR(`/api/apps/${clientID}`, (url) =>
    getFetch<SerializedApp<true>>(url)
  )
  const [loading, setLoading] = useState(false)
  const [updateData, setUpdateData] = useState<Partial<SerializedApp<true>>>()
  const updatePartialData = (update: Partial<SerializedApp<true>>) =>
    setUpdateData((old) => ({ ...old, ...update }))

  useEffect(() => {
    setUpdateData(data)
  }, [data])

  if (error) {
    return <div className="">Failed to load app</div>
  }
  if (!data) {
    return <div className="">Loading</div>
  }

  const isPublic = updateData?.type === AppType.PUBLIC

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) {
      return
    }
    setLoading(true)

    try {
      const payload: Partial<SerializedApp<true>> = {
        name: updateData?.name,
        redirect_uris: updateData?.redirect_uris,
        type: updateData?.type,
      }
      const response = await patchFetch<typeof payload>(
        `/api/apps/${data.client_id}`,
        payload
      )
      mutate({ ...data, ...response })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={save}>
      <div className="flex flex-col space-y-5">
        <div className="text-4xl font-bold">{data.name}</div>
        <Switch.Group>
          <div className="flex items-center">
            <Switch
              checked={isPublic}
              onChange={(e) =>
                updatePartialData({
                  type: e ? AppType.PUBLIC : AppType.CONFIDENTIAL,
                })
              }
              className={classNames(
                "relative inline-flex flex-shrink-0 h-6 w-10 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75 shadow",
                {
                  "bg-primary dark:bg-primary-500": isPublic,
                  "bg-teal-700": !isPublic,
                }
              )}>
              <span
                aria-hidden="true"
                className={classNames(
                  {
                    "translate-x-4": isPublic,
                    "translate-x-0": !isPublic,
                  },
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200"
                )}
              />
            </Switch>
            <Switch.Label className={classNames("ml-4 relative")}>
              {isPublic ? "Público" : "Confidencial"}
            </Switch.Label>
          </div>
        </Switch.Group>
        <div>
          Client ID: <CopyValue value={data.client_id} />
        </div>
        <div>
          Client secret: <CopyValue value={data.client_secret} secret />
        </div>
        <textarea
          value={updateData?.redirect_uris?.join("\n")}
          onChange={(e) =>
            updatePartialData({ redirect_uris: e.target.value.split("\n") })
          }
          className=""
        />

        <div>
          {`Scope: `}{" "}
          <ul>
            {data.scope.map((s) => (
              <li key={s}>{getScopeDescription(s)}</li>
            ))}
          </ul>
        </div>
        <Button type="submit" color="primary" wide loading={loading}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

export default ViewApp
