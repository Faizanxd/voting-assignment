// scripts/reset-and-seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Optional: a deterministic test poll id you can reuse, or set to undefined to always generate a new one
  const TEST_POLL_ID = undefined; // e.g., 'cmfkwp01b0002v2bknryul0s5' or leave undefined
  // Optional: preset option ids (leave undefined to generate)
  const OPT1_ID = undefined;
  const OPT2_ID = undefined;

  await prisma.$transaction(async (tx) => {
    // If a specific test poll id is provided, clear related votes/options/poll
    if (TEST_POLL_ID) {
      await tx.vote.deleteMany({ where: { pollId: TEST_POLL_ID } });
      await tx.pollOption.deleteMany({ where: { pollId: TEST_POLL_ID } });
      await tx.poll.deleteMany({ where: { id: TEST_POLL_ID } });
    }
  });

  // Create a fresh user (Prisma will generate a CUID)
  const user = await prisma.user.create({
    data: {
      name: `Test User ${Date.now()}`,
      email: `test+${Date.now()}@example.com`,
      passwordHash: 'noop',
    },
  });

  // Create a published poll with two options; use provided ids only when defined
  const poll = await prisma.poll.create({
    data: {
      // If TEST_POLL_ID is provided, use it; otherwise let Prisma generate
      ...(TEST_POLL_ID ? { id: TEST_POLL_ID } : {}),
      question: 'Phase6 concurrency test poll (reset-and-seed)',
      isPublished: true,
      creatorId: user.id,
      options: {
        create: [
          OPT1_ID ? { id: OPT1_ID, text: 'Option A' } : { text: 'Option A' },
          OPT2_ID ? { id: OPT2_ID, text: 'Option B' } : { text: 'Option B' },
        ],
      },
    },
    include: { options: true },
  });

  // Ensure votes table is empty for this poll
  await prisma.vote.deleteMany({ where: { pollId: poll.id } });

  console.log('--- Reset and Seed Complete ---');
  console.log('userId:', user.id);
  console.log('pollId:', poll.id);
  poll.options.forEach((o, i) => console.log(`option${i + 1}:`, o.id));
  console.log('You can now run your concurrency test with these IDs.');
}

main()
  .catch((e) => {
    console.error('Error in reset-and-seed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
