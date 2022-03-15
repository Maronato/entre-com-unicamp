import { getPrisma } from "@/utils/db"

import { AppType, createApp, getFirstApp } from "../src/oauth2/app"
import { createUser, getFirstUser, User } from "../src/oauth2/user"
import { getLogger } from "../src/utils/telemetry/logs"

const logger = getLogger()

const createFirstUser = async () => {
  let owner = await getFirstUser()
  if (!owner) {
    owner = await createUser("admin@entre-com-unicamp.com")
    logger.info("Created first user")
  } else {
    logger.info("First user already exists - skipping")
  }
  return owner
}

const createFirstApp = async (user: User) => {
  let app = await getFirstApp()
  if (!app) {
    const name = "Entre com Unicamp"
    const type = AppType.PUBLIC
    const owner = user.id
    const redirect_uris = ["https://entre-com-unicamp.com/oauth/callback"]

    app = await createApp(name, owner, type, redirect_uris)
    logger.info("Created first app")
  } else {
    logger.info("First app already exists - skipping")
  }
  return app
}

const seedDatabase = async () => {
  const prisma = getPrisma()
  try {
    logger.info("Seeding initial data...")
    const user = await createFirstUser()
    await createFirstApp(user)
  } catch (e) {
    logger.error(`Failed to seed initial data.`)
    logger.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()
