import { FunctionComponent } from "react"

import useSWR from "swr"

import { getFetch } from "@/utils/browser/fetch"

import Button from "../Button"

import type { SerializedApp } from "@/oauth/app"

const AppList: FunctionComponent<{ viewApp: (clientID: string) => void }> = ({
  viewApp,
}) => {
  const { data, error } = useSWR(`/api/apps`, (url) =>
    getFetch<SerializedApp<false>[]>(url)
  )

  if (error) {
    return <div className="">Failed to load app</div>
  }
  if (!data) {
    return <div className="">Loading</div>
  }
  return (
    <div>
      {data.map((app) => (
        <div key={app.client_id} className="my-10">
          <div>{`Name: ${app.name}`}</div>
          <div>{`Client ID: ${app.client_id}`}</div>
          <Button color="indigo" onClick={() => viewApp(app.client_id)}>
            Ver detalhes
          </Button>
        </div>
      ))}
    </div>
  )
}

export default AppList
