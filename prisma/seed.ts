import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Upsert a user so we don't violate the unique email constraint
  const user = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {}, // no changes if already exists
    create: {
      name: 'Alice',
      email: 'alice@example.com',
      passwordHash: 'hashed_pw_here',
    },
  });

  // Upsert a poll for that user
  const poll = await prisma.poll.upsert({
    where: { id: 'seed-poll-1' }, // fixed ID for idempotency
    update: {},
    create: {
      id: 'seed-poll-1',
      question: 'What is your favorite color?',
      isPublished: true,
      creatorId: user.id,
    },
  });

  // Ensure poll options exist
  const options = ['Red', 'Blue', 'Green'];
  for (const text of options) {
    await prisma.pollOption.upsert({
      where: {
        pollId_text: { pollId: poll.id, text }, // composite unique
      },
      update: {},
      create: {
        text,
        pollId: poll.id,
      },
    });
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
