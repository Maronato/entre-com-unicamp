import { ClientRequest, IncomingMessage } from "http"

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl, S3RequestPresigner } from "@aws-sdk/s3-request-presigner"
import { createRequest } from "@aws-sdk/util-create-request"
import { formatUrl } from "@aws-sdk/util-format-url"
import { SpanStatusCode } from "@opentelemetry/api"
import { api } from "@opentelemetry/sdk-node"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"

import { getInstruments, startStatusHistogram } from "../telemetry/metrics"
import { startActiveSpan } from "../telemetry/trace"

import {
  getCurrentAvatarKey,
  getCurrentAvatarURL,
  getTempAvatarKey,
  parseCurrentAvatarURL,
  parseTempAvatarURL,
} from "./picture"

// Use Minio dev configs by default
const bucket = process.env.AWS_S3_BUCKET_NAME || "development"
let endpoint = process.env.AWS_S3_ENDPOINT_URL
if (!endpoint && process.env.NODE_ENV !== "production") {
  endpoint = "http://localhost:9000"
}
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID || "minio_user"
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY || "minio_password"
const region = process.env.AWS_S3_REGION || "us-east-1"

const useAWSEndpoint = typeof endpoint === "undefined"

const s3Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  tls: !endpoint || endpoint.startsWith("https://"),
  forcePathStyle: !useAWSEndpoint,
})

const clientData = {
  bucket,
  region,
  accessKeyId,
}

export const updateS3RequestSpan = (
  span: api.Span,
  request: IncomingMessage | ClientRequest
) => {
  if (request instanceof ClientRequest) {
    const userAgent = request.getHeader("user-agent")
    if (typeof userAgent === "string" && userAgent.startsWith("aws-sdk-js")) {
      span.setAttributes({
        [SemanticAttributes.PEER_SERVICE]: useAWSEndpoint ? "AWS S3" : "minio",
      })
    }
  }
}

const getFixedSignedUrl: typeof getSignedUrl = async (
  client,
  command,
  options
) => {
  const endpointUrl = new URL(endpoint || "")
  if (useAWSEndpoint || endpointUrl.port === "") {
    return getSignedUrl(client, command, options)
  }

  // https://github.com/aws/aws-sdk-js-v3/issues/2121
  const signer = new S3RequestPresigner({ ...s3Client.config })
  const request = await createRequest(client, command)
  request.headers.host = `${request.hostname}:${request.port}`
  const signed = await signer.presign(request)
  return formatUrl(signed)
}

export const getAvatarUploadSignedURL = (resourceID: string, nonce: string) => {
  return startActiveSpan(
    "getAvatarUploadSignedURL",
    {
      attributes: { resourceID, nonce, ...clientData },
    },
    (span) => {
      const key = getTempAvatarKey(resourceID, nonce)
      span.setAttribute("key", key)

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: "image/*",
      })

      return getFixedSignedUrl(s3Client, command, { expiresIn: 60 })
    }
  )
}

export const deleteCurrentAvatar = (pictureURL: string) => {
  return startActiveSpan(
    "deleteCurrentAvatar",
    { attributes: { pictureURL, ...clientData } },
    async (span) => {
      const { s3RequestDuration } = getInstruments()
      const parsed = parseCurrentAvatarURL(pictureURL)
      if (!parsed) {
        return
      }
      const key = getCurrentAvatarKey(parsed.id, parsed.nonce)
      span.setAttribute("key", key)

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
      const record = startStatusHistogram(s3RequestDuration, {
        command: "delete",
      })
      try {
        await s3Client.send(command)
        record(true)
      } catch (e) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: "failed to delete key",
        })

        record(false)
      }
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

      const record = startStatusHistogram(s3RequestDuration, {
        command: "copy",
      })
      try {
        await s3Client.send(copyCommand)
        record(true)
      } catch (e) {
        record(false)

        throw e
      }

      return getCurrentAvatarURL(resourceID, newParsed.nonce)
    }
  )
}

export const listObjects = (maxKeys?: number) => {
  return startActiveSpan(
    "listObjects",
    { attributes: { maxKeys, ...clientData } },
    async (span) => {
      const { s3RequestDuration } = getInstruments()

      const command = new ListObjectsCommand({
        Bucket: bucket,
        MaxKeys: maxKeys,
      })
      const record = startStatusHistogram(s3RequestDuration, {
        command: "list",
      })
      try {
        const res = await s3Client.send(command)
        record(true)
        return res
      } catch (e) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: "failed to list objects",
        })
        record(false)

        throw e
      }
    }
  )
}
