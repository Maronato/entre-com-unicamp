import { getPrisma } from "@/utils/db"

export class ResourceOwner {
  id: string
  email: string

  constructor(id: string, email: string) {
    this.id = id
    this.email = email
  }

  static async get(id: string) {
    const prisma = getPrisma()
    const resourceOwner = await prisma.resource_owners.findUnique({
      where: { id: BigInt(id) },
    })
    if (resourceOwner) {
      return new ResourceOwner(resourceOwner.id.toString(), resourceOwner.email)
    }
  }

  static async create(email: string) {
    const prisma = getPrisma()
    const resourceOwner = await prisma.resource_owners.create({
      data: { email },
    })
    return new ResourceOwner(resourceOwner.id.toString(), resourceOwner.email)
  }

  toJSON(includePrivateInfo = false) {
    const keys: (keyof this)[] = ["email"]

    if (includePrivateInfo) {
      keys.push("id")
    }

    return keys.reduce(
      (agg, key) => ({ ...agg, [key]: this[key] }),
      {} as Record<keyof this, this[keyof this]>
    )
  }
}
