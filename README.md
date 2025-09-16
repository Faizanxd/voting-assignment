# 🗳️ Real‑Time Voting App

A Node.js + TypeScript + Express + Prisma + PostgreSQL application for creating polls, voting in real time, and viewing live tallies via WebSockets.  
Includes a minimal browser UI at **http://localhost:3000/index.html**.

## 🚀 Quickstart

### 1. Clone & install

```bash
 git clone https://github.com/Faizanxd/voting-assignment
 cd voting-assignment
 npm install
'

### 2. env '
 PORT=3000
 # Replace with your own Postgres connection string
 DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>?schema=public"
'

### 3. Database setup '
Run Prisma migrations to create the schema in your database:
- npx prisma migrate dev
'

### 4. 🖥️ Running the app '
-npm run dev
-Server starts on http://localhost:3000
-UI available at http://localhost:3000/index.html

-📡 API Examples

Create a poll
curl -X POST http://localhost:3000/api/polls \
  -H "Content-Type: application/json" \
  -d '{"question":"what am i","options":["am","i","human"]}'

Vote
curl -X POST http://localhost:3000/api/polls/<pollId>/votes \
  -H "Content-Type: application/json" \
  -d '{"pollOptionId":"<optionId>"}'

Get tallies
curl http://localhost:3000/api/polls/<pollId>/tallies


-🔌 WebSocket Events

Connect to ws://localhost:3000 with Socket.IO client.

-Join Poll:
socket.emit('joinPoll', pollId);

-voteCast
Server emits { pollId, tallies } when a vote is cast.


'

### 📂 Project structure

.
├── prisma/               # Prisma schema & migrations
│   ├── schema.prisma
├── public/               # Static UI (index.html, app.js, styles)
├── src/
│   ├── app.ts            # Express app & routes
│   ├── server.ts         # HTTP + WebSocket bootstrap
│   └── ...
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .env.example
└── README.md

### 🛠️ Tech Stack

-Backend: Node.js, Express, TypeScript

-Database: PostgreSQL + Prisma ORM

-Real‑time: Socket.IO

-Validation: Zod

-Security: Helmet, CORS, Rate limiting

-UI: Vanilla JS + HTML (served from /public)


### 🧪 Testing

Run any test suite:
-npm test
```
