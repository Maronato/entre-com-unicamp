import { PrismaClient } from "@prisma/client"

import { Scope } from "../oauth/scope"
import { generateIdenticon } from "../src//utils/server/identicon"
import { createClientID, createClientSecret } from "../src/utils/common/random"
import { getLogger } from "../src/utils/server/telemetry/logs"

import type { User } from "../oauth/user"

const logger = getLogger()

const createFirstUser = async (prisma: PrismaClient) => {
  let user = await prisma.user.findFirst()
  if (!user) {
    const email = "admin@entre-com-unicamp.com"
    const avatar = generateIdenticon(email)
    user = await prisma.user.create({
      data: { email, avatar },
    })
    logger.info("Created first user")
  } else {
    logger.info("First user already exists - skipping")
  }
  return user
}

const createFirstApp = async (prisma: PrismaClient, user: User) => {
  let app = await prisma.app.findFirst()
  if (!app) {
    const name = "Entre com Unicamp"
    const type = "public"
    const owner = user.id
    const redirect_uris = ["https://entre-com-unicamp.com/oauth/callback"]
    const client_id = createClientID()
    const client_secret = createClientSecret()

    app = await prisma.app.create({
      data: {
        name,
        logo: generateIdenticon(name),
        owner,
        type,
        redirect_uris,
        client_id,
        client_secret,
        scope: Object.values(Scope),
      },
    })
    logger.info("Created first app")
  } else {
    logger.info("First app already exists - skipping")
  }
  return app
}

const seedDatabase = async () => {
  const prisma = new PrismaClient()
  if (["1"].includes("1")) {
    logger.info("Skipping initial db seed...")
    return
  }
  try {
    logger.info("Seeding initial data...")
    const user = await createFirstUser(prisma)
    await createFirstApp(prisma, user)
  } catch (e) {
    logger.error(`Failed to seed initial data.`)
    logger.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()
