import { NextApiResponse } from "next"

export const allowCORS = (res: NextApiResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
}
