/* eslint-disable @next/next/no-server-import-in-page */
import { NextApiRequest, NextApiResponse } from "next"

export type Handler<R = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<R>

type StatusOk = 200 | 201 | 202 | 203 | 204
type StatusError = 400 | 401 | 403 | 404 | 405 | 500 | 503
const statusIsOk = (
  statusCode: StatusOk | StatusError
): statusCode is StatusOk => statusCode < 400

type StatusCode = StatusOk | StatusError

async function respond(
  res: NextApiResponse,
  statusCode: StatusOk,
  data?: unknown
): Promise<void>
async function respond(
  res: NextApiResponse,
  statusCode: StatusError,
  errorMessage: unknown
): Promise<void>
async function respond(
  res: NextApiResponse,
  statusCode: StatusCode,
  dataOrError?: unknown
): Promise<void> {
  dataOrError = await dataOrError

  if (statusIsOk(statusCode)) {
    dataOrError = dataOrError ?? "success"
    return res
      .status(statusCode)
      .json(
        typeof dataOrError === "string" ? { message: dataOrError } : dataOrError
      )
  } else {
    return res
      .status(statusCode)
      .json(
        typeof dataOrError === "string" ? { error: dataOrError } : dataOrError
      )
  }
}

export const respondMethodNotAllowed = (res: NextApiResponse) =>
  respond(res, 405, "Method not allowed")

export const respondInvalidRequest = (res: NextApiResponse, message: unknown) =>
  respond(res, 400, message)

export const respondUnauthorized = (res: NextApiResponse, message: unknown) =>
  respond(res, 401, message)

export const respondForbidden = (res: NextApiResponse, message: unknown) =>
  respond(res, 403, message)

export const respondNotFound = (res: NextApiResponse, message: unknown) =>
  respond(res, 404, message)

export const respondServiceUnavailable = (
  res: NextApiResponse,
  message: unknown
) => respond(res, 503, message)

export const respondOk = (res: NextApiResponse, data?: unknown) =>
  respond(res, 200, data)

export const respondCreated = (res: NextApiResponse, data?: unknown) =>
  respond(res, 201, data)

export const respondNoContent = (res: NextApiResponse, data?: unknown) =>
  respond(res, 204, data)
