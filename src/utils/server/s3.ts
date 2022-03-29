import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { SpanKind, SpanStatusCode } from "@opentelemetry/api"

import {
  getCurrentAvatarKey,
  getCurrentAvatarURL,
  getTempAvatarKey,
  parseCurrentAvatarURL,
  parseTempAvatarURL,
} from "../common/avatar"

import { getInstruments } from "./telemetry/metrics"
import { startActiveSpan } from "./telemetry/trace"

const bucket = process.env.AWS_S3_BUCKET_NAME || ""
const region = "sa-east-1"
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID || ""

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || "",
  },
})

const clientData = { bucket, region, accessKeyId }

export const getAvatarUploadSignedURL = (resourceID: string, nonce: string) => {
  return startActiveSpan(
    "getAvatarUploadSignedURL",
    {
      attributes: { resourceID, nonce, ...clientData },
      kind: SpanKind.CLIENT,
    },
    (span) => {
      const key = getTempAvatarKey(resourceID, nonce)
      span.setAttribute("key", key)

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: "image/*",
      })
      return getSignedUrl(s3Client, command, { expiresIn: 3600 })
    }
  )
}

export const deleteCurrentAvatar = (avatarURL: string) => {
  return startActiveSpan(
    "deleteCurrentAvatar",
    { kind: SpanKind.CLIENT, attributes: { avatarURL, ...clientData } },
    async (span) => {
      const { s3RequestDuration } = getInstruments()
      const parsed = parseCurrentAvatarURL(avatarURL)
      if (!parsed) {
        return
      }
      const key = getCurrentAvatarKey(parsed.id, parsed.nonce)
      span.setAttribute("key", key)

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
      const start = new Date().getTime()
      let status: "success" | "failure" = "failure"
      try {
        await s3Client.send(command)
        status = "success"
      } catch (e) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: "failed to delete key",
        })
      }
      const responseTime = new Date().getTime() - start
      s3RequestDuration.record(responseTime, {
        ...clientData,
        status,
        command: "delete",
      })
    }
  )
}

export const promoteTempAvatarToCurrent = async (
  resourceID: string,
  newAvatarURL: string,
  oldAvatarURL?: string
): Promise<string | undefined> => {
  return startActiveSpan(
    "promoteTempAvatarToCurrent",
    {
      kind: SpanKind.CLIENT,
      attributes: { resourceID, newAvatarURL, oldAvatarURL, ...clientData },
    },
    async (span) => {
      const { s3RequestDuration } = getInstruments()
      const newParsed = parseTempAvatarURL(newAvatarURL)

      if (oldAvatarURL) {
        await deleteCurrentAvatar(oldAvatarURL)
      }

      if (!newParsed) {
        return
      }

      const copySource = `${bucket}/${getTempAvatarKey(
        newParsed.id,
        newParsed.nonce
      )}`
      const key = getCurrentAvatarKey(resourceID, newParsed.nonce)

      span.setAttributes({
        copySource,
        key,
      })

      const copyCommand = new CopyObjectCommand({
        Bucket: bucket,
        CopySource: copySource,
        Key: key,
        ContentType: "image/*",
      })

      const start = new Date().getTime()
      try {
        await s3Client.send(copyCommand)
        const responseTime = new Date().getTime() - start
        s3RequestDuration.record(responseTime, {
          ...clientData,
          command: "copy",
          status: "success",
        })
      } catch (e) {
        const responseTime = new Date().getTime() - start
        s3RequestDuration.record(responseTime, {
          ...clientData,
          command: "copy",
          status: "failure",
        })
        throw e
      }

      return getCurrentAvatarURL(resourceID, newParsed.nonce)
    }
  )
}
