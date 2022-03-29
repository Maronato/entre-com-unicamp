import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { SpanKind } from "@opentelemetry/api"

import {
  getCurrentAvatarKey,
  getCurrentAvatarURL,
  getTempAvatarKey,
  parseCurrentAvatarURL,
  parseTempAvatarURL,
} from "../common/avatar"

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
    (span) => {
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
      return s3Client.send(command)
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

      await s3Client.send(copyCommand)

      return getCurrentAvatarURL(resourceID, newParsed.nonce)
    }
  )
}
