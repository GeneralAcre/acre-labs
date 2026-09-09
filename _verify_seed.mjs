import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const action = process.argv[2];

if (action === "create") {
  const id = randomUUID();
  const now = Date.now();
  const event = await prisma.event.create({
    data: {
      id,
      slug: `verification-hackathon-pass-${Math.floor(100000 + Math.random() * 900000)}`,
      product: "content",
      title: "Verification Hackathon Pass",
      description: "A temporary drop created only to verify the Content product's claim gallery/detail rendering.",
      location: "Bangkok, Thailand",
      contractAddress: "0xcc7CC666a462F83049Fa4c7943C90f7D4c86c216",
      secretCode: "VERIFY",
      eventEndTime: new Date(now + 1000 * 60 * 60 * 24 * 14),
      expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 15),
      imageUrl: null,
      maxSupply: 50,
      ownerAddress: "0x0000000000000000000000000000000000dead",
    },
  });
  console.log(JSON.stringify({ id: event.id, slug: event.slug }));
} else if (action === "delete") {
  const id = process.argv[3];
  await prisma.event.delete({ where: { id } });
  console.log("deleted", id);
} else {
  console.error("usage: node seed-content-event.mjs create|delete [id]");
  process.exit(1);
}

await prisma.$disconnect();
