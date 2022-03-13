import { PrismaClient, resource_owners } from "@prisma/client"

import { ClientType } from "../src/oauth2/client"
import { createClientID, createClientSecret } from "../src/utils/random"
import { getLogger } from "../src/utils/telemetry/logs"

const logger = getLogger()

const createFirstUser = async (prisma: PrismaClient) => {
  let owner = await prisma.resource_owners.findFirst()
  if (!owner) {
    owner = await prisma.resource_owners.create({
      data: {
        email: "admin@entre-com-unicamp.com",
      },
    })
    logger.info("Created first user")
  } else {
    logger.info("First user already exists - skipping")
  }
  return owner
}

const createFirstApp = async (prisma: PrismaClient, user: resource_owners) => {
  let app = await prisma.clients.findFirst()
  if (!app) {
    const client_id = createClientID()
    const client_secret = createClientSecret()
    const name = "Entre com Unicamp"
    const type: ClientType = "public"
    const owner = user.id
    const redirect_uris = ["https://entre-com-unicamp.com/oauth/callback"]

    app = await prisma.clients.create({
      data: {
        client_id,
        client_secret,
        name,
        type,
        owner,
        redirect_uris,
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
