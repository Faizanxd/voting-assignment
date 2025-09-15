// test-phase6-concurrent.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // adjust if needed
const POLL_ID = 'cmfkxrc270002v2a40z3x1iwf'; // replace
const USER_ID = 'cmfkxrc230000v2a4vjxuot6v'; // replace
const OPTION_ID = 'cmfkxrc270004v2a43m0zgabt';

const CONCURRENCY = 16; // number of concurrent requests to send

async function sendVote(attempt) {
  try {
    const res = await axios.post(
      `${BASE_URL}/api/polls/${POLL_ID}/votes`,
      { userId: USER_ID, pollOptionId: OPTION_ID },
      { validateStatus: () => true }, // accept all statuses
    );
    return { attempt, status: res.status, body: res.data };
  } catch (err) {
    return { attempt, status: 'ERR', body: err.message };
  }
}

(async () => {
  console.log(`Sending ${CONCURRENCY} concurrent vote requests...`);
  const promises = [];
  for (let i = 0; i < CONCURRENCY; i++) promises.push(sendVote(i + 1));
  const results = await Promise.all(promises);
  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  console.log('Results by status:', summary);
  results.forEach((r) => console.log(`#${r.attempt} -> ${r.status}`, r.body));
})();
