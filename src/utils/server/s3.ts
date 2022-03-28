import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import {
  getCurrentAvatarKey,
  getCurrentAvatarURL,
  getTempAvatarKey,
  parseCurrentAvatarURL,
  parseTempAvatarURL,
} from "../common/avatar"

const s3Client = new S3Client({
  region: "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || "",
  },
})

export const getAvatarUploadSignedURL = (userID: string, nonce: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME || "",
    Key: getTempAvatarKey(userID, nonce),
    ContentType: "image/*",
  })
  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

export const deleteCurrentAvatar = (avatarURL: string) => {
  const parsed = parseCurrentAvatarURL(avatarURL)
  if (!parsed) {
    return
  }
  const bucket = process.env.AWS_S3_BUCKET_NAME || ""
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: getCurrentAvatarKey(parsed.id, parsed.nonce),
  })
  return s3Client.send(command)
}

export const promoteTempAvatarToCurrent = async (
  userID: string,
  newAvatarURL: string,
  oldAvatarURL?: string
): Promise<string | undefined> => {
  const newParsed = parseTempAvatarURL(newAvatarURL)

  if (oldAvatarURL) {
    await deleteCurrentAvatar(oldAvatarURL)
  }

  if (!newParsed) {
    return
  }

  const bucket = process.env.AWS_S3_BUCKET_NAME || ""

  const copyCommand = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${getTempAvatarKey(userID, newParsed.nonce)}`,
    Key: getCurrentAvatarKey(userID, newParsed.nonce),
    ContentType: "image/*",
  })

  await s3Client.send(copyCommand)

  return getCurrentAvatarURL(userID, newParsed.nonce)
}
