import { FunctionComponent } from "react"

import useSWR from "swr"

import { getScopeDescription } from "@/oauth2/scope"
import { getFetch } from "@/utils/fetch"

import type { SerializedApp } from "@/oauth2/app"

const ViewApp: FunctionComponent<{ clientID: string }> = ({ clientID }) => {
  const { data, error } = useSWR(`/api/apps/${clientID}`, (url) =>
    getFetch<SerializedApp<true>>(url)
  )

  if (error) {
    return <div className="">Failed to load app</div>
  }
  if (!data) {
    return <div className="">Loading</div>
  }
  return (
    <div>
      <div>{`Name: ${data.name}`}</div>
      <div>{`Client ID: ${data.client_id}`}</div>
      <div>{`Client secret: ${data.client_secret}`}</div>
      <div>
        {`Redirect URI: `}{" "}
        <ul>
          {data.redirect_uris.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <div>
        {`Scope: `}{" "}
        <ul>
          {data.scope.map((s) => (
            <li key={s}>{getScopeDescription(s)}</li>
          ))}
        </ul>
      </div>
      <div>{`Type: ${data.type}`}</div>
    </div>
  )
}

export default ViewApp
