/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('▶️ Starting legacy users migration from table "users" to Prisma model "User"');

  // Read legacy users from the old Express schema table `users`
  const legacyUsers = await prisma.$queryRaw`
    SELECT id, phone, email, name, password, role, created_at
    FROM users
    ORDER BY id ASC
  `;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of legacyUsers) {
    try {
      const email = row.email || `${row.phone}@legacy.local`;
      const name = row.name || null;
      const password = row.password || null;
      const role = row.role || 'user';
      const createdAt = row.created_at ? new Date(row.created_at) : undefined;

      if (!email) {
        skipped++;
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      const result = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          role,
          // keep legacy password hash if present (bcrypt expected)
          password,
        },
        create: {
          email,
          name,
          role,
          password,
          totalAuthCredits: 15,
          ...(createdAt ? { createdAt } : {}),
        },
      });

      if (existing) updated++; else inserted++;
    } catch (e) {
      skipped++;
      console.warn(`⚠️ Skipped legacy user id=${row.id} due to error:`, e?.message || e);
    }
  }

  console.log('✅ Migration complete:', { inserted, updated, skipped, totalLegacy: legacyUsers.length });
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
