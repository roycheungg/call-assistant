/**
 * Set a user's password by email. Used to bootstrap the super-admin password
 * after migrating away from magic-link auth.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/set-user-password.ts \
 *     --email roy.cheung@doaisystems.co.uk --password "<chosen>"
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function parseArgs(): { email?: string; password?: string } {
  const args: { email?: string; password?: string } = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--email") args.email = argv[++i];
    else if (argv[i] === "--password") args.password = argv[++i];
  }
  return args;
}

async function main() {
  const { email, password } = parseArgs();

  if (!email || !password) {
    console.error("Usage: --email <email> --password <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const normalized = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user) {
      console.error(`No user found with email ${normalized}`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email: normalized },
      data: { passwordHash: hash },
    });

    console.log(`✅ Password set for ${normalized} (role: ${user.role})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
