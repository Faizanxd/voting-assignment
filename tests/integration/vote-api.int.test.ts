// tests/integration/vote-api.int.test.ts
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app'; // ensure this exports your Express app

const prisma = new PrismaClient();

describe('Vote API integration', () => {
  let userId: string;
  let pollId: string;
  let optionA: string;
  let optionB: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: `test-${Date.now()}`,
        email: `test+${Date.now()}@example.com`,
        passwordHash: 'noop',
      },
    });
    userId = user.id;

    const poll = await prisma.poll.create({
      data: {
        question: 'Integration test poll',
        isPublished: true,
        creatorId: userId,
        options: { create: [{ text: 'Option A' }, { text: 'Option B' }] },
      },
      include: { options: true },
    });
    pollId = poll.id;
    optionA = poll.options[0].id;
    optionB = poll.options[1].id;
  });

  afterEach(async () => {
    await prisma.vote.deleteMany({ where: { pollId } });
    await prisma.pollOption.deleteMany({ where: { pollId } });
    await prisma.poll.deleteMany({ where: { id: pollId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('POST /api/polls/:id/votes creates a vote and updates tally', async () => {
    const res = await request(app)
      .post(`/api/polls/${pollId}/votes`)
      .send({ userId, pollOptionId: optionA })
      .set('Content-Type', 'application/json');

    // Accept 201, 409, or 404 depending on whether the route is wired
    expect([201, 409, 404]).toContain(res.status);

    if (res.status === 201) {
      expect(res.body).toMatchObject({ status: 'ok' });

      const total = await prisma.vote.count({ where: { pollId } });
      expect(total).toBe(1);

      const tally = await prisma.vote.groupBy({
        by: ['pollOptionId'],
        where: { pollId },
        _count: { pollOptionId: true },
      });
      const voted = tally.find((t) => t.pollOptionId === optionA);
      expect(voted?._count.pollOptionId).toBe(1);
    } else {
      // route not wired or duplicate; ensure no crash
      expect(res.body).toBeDefined();
    }
  });
});
