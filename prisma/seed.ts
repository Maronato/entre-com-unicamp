import { PrismaClient, resource_owners } from "@prisma/client"

import { ClientType } from "../src/oauth2/client"
import { createClientID, createClientSecret } from "../src/utils/random"

const createFirstUser = async (prisma: PrismaClient) => {
  let owner = await prisma.resource_owners.findFirst()
  if (!owner) {
    owner = await prisma.resource_owners.create({
      data: {
        email: "admin@entre-com-unicamp.com",
      },
    })
    console.log("Created first user")
  } else {
    console.log("First user already exists - skipping")
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
    console.log("Created first app")
  } else {
    console.log("First app already exists - skipping")
  }
  return app
}

const seedDatabase = async () => {
  const prisma = new PrismaClient()
  console.log("got prisma")
  console.log((await prisma.$executeRaw`SELECT 1;`) === 1)
  try {
    console.log("Seeding initial data...")
    const user = await createFirstUser(prisma)
    await createFirstApp(prisma, user)
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()
