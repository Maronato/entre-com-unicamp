import { NextApiResponse } from "next"

export const respondError = (
  res: NextApiResponse,
  statusCode: number,
  errorMessage: string
) => res.status(statusCode).json({ error: errorMessage })

export const respondMethodNotAllowed = (res: NextApiResponse) =>
  respondError(res, 405, "Method not allowed")

export const respondInvalidRequest = (res: NextApiResponse, message: string) =>
  respondError(res, 400, message)

export const respondUnauthorized = (res: NextApiResponse, message: string) =>
  respondError(res, 401, message)

export const respondForbidden = (res: NextApiResponse, message: string) =>
  respondError(res, 403, message)

export const respondNotFound = (res: NextApiResponse, message: string) =>
  respondError(res, 404, message)
