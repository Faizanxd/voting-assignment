import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'http://localhost:3000';
const POLL_ID = 'cmfkxrc270002v2a40z3x1iwf'; // replace
const USER_ID = 'cmfkxrc230000v2a4vjxuot6v'; // replace
const OPTION_ID = 'cmfkxrc270004v2a43m0zgabt'; // replace

export const options = {
  vus: 16,
  duration: '10s',
};

export default function () {
  const url = `${BASE_URL}/api/polls/${POLL_ID}/votes`;
  const payload = JSON.stringify({
    userId: USER_ID,
    pollOptionId: OPTION_ID,
  });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
  });
}
