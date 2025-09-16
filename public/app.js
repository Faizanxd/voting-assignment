// app.js (ES module)
// Adjust API_BASE if your server is on a different host/port.
const API_BASE = window.API_BASE || location.origin;

let socket = null;
let currentPollId = null;

function $(sel) {
  return document.querySelector(sel);
}
function $all(sel) {
  return Array.from(document.querySelectorAll(sel));
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function setStatus(txt) {
  $('#status').textContent = txt;
}

async function loadPolls() {
  // Request all polls (server supports ?all=true)
  const { status, body } = await fetchJson(`${API_BASE}/api/polls?all=true`);
  if (status === 200 && Array.isArray(body)) {
    renderPollList(body);
  } else {
    $('#pollList').innerHTML =
      `<li>No polls (GET /api/polls returned ${status})</li>`;
  }
}

function renderPollList(polls) {
  const ul = $('#pollList');
  ul.innerHTML = '';
  polls.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'poll-list-item';

    const left = document.createElement('div');
    left.className = 'poll-list-left';
    left.innerHTML = `
      <strong>${escapeHtml(p.question)}</strong>
      <div style="font-size:12px;color:#666">${p.isPublished ? 'Published' : 'Draft'}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'poll-list-actions';

    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open';
    openBtn.onclick = () => openPoll(p.id);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'danger';
    delBtn.style.marginLeft = '8px';
    delBtn.onclick = () => deletePoll(p.id);

    actions.appendChild(openBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);
    ul.appendChild(li);
  });
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
}

async function openPoll(id) {
  const { status, body } = await fetchJson(`${API_BASE}/api/polls/${id}`);
  if (status !== 200) {
    alert(`Failed to load poll ${status}`);
    return;
  }
  currentPollId = id;
  $('#pollQuestion').textContent = body.question;

  const optsUl = $('#pollOptions');
  optsUl.innerHTML = '';
  body.options.forEach((o) => {
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="radio" name="option" value="${o.id}"> ${escapeHtml(o.text)}</label>`;
    optsUl.appendChild(li);
  });

  $('#tallies').innerHTML = '';
  $('#list').classList.add('hidden');
  $('#view').classList.remove('hidden');

  if (!socket) {
    connectSocket();
  } else {
    socket.emit('joinPoll', id);
  }

  await refreshTallies();
}

async function refreshTallies() {
  if (!currentPollId) return;
  // Backend now has /:id/tallies route; if not, swap to GET /api/polls/:id and use body.tallies
  const { status, body } = await fetchJson(
    `${API_BASE}/api/polls/${currentPollId}/tallies`,
  );
  if (status === 200 && Array.isArray(body)) {
    renderTallies(body);
  } else {
    $('#tallies').textContent = `No tallies (status ${status})`;
  }
}

function renderTallies(tallies) {
  const container = $('#tallies');
  container.innerHTML = '';
  tallies.forEach((t) => {
    const d = document.createElement('div');
    d.className = 'tally';
    d.innerHTML = `<div>${escapeHtml(t.optionText || t.optionId)}</div><div>${t.count}</div>`;
    container.appendChild(d);
  });
}

function connectSocket() {
  setStatus('Connecting...');
  socket = window.io ? io(location.origin) : null;
  if (!socket) {
    setStatus('Socket.IO not loaded');
    return;
  }
  socket.on('connect', () => setStatus('Connected'));
  socket.on('disconnect', () => setStatus('Disconnected'));
  socket.on('voteCast', (payload) => {
    if (payload && payload.pollId === currentPollId) {
      renderTallies(payload.tallies);
    }
  });
}

async function voteSubmit() {
  const sel = document.querySelector('input[name="option"]:checked');
  if (!sel) {
    alert('Pick an option');
    return;
  }
  const optionId = sel.value;

  // Read stored userId from localStorage if available
  const storedUserId = localStorage.getItem('userId');

  const res = await fetchJson(`${API_BASE}/api/polls/${currentPollId}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send cookies
    body: JSON.stringify({
      pollOptionId: optionId,
      userId: storedUserId || undefined,
    }),
  });

  // Store userId from server if provided
  if (res.body && res.body.userId) {
    localStorage.setItem('userId', res.body.userId);
  }

  if (res.status === 201) {
    await refreshTallies();
  } else if (res.status === 409) {
    if (res.body && Array.isArray(res.body.tallies)) {
      renderTallies(res.body.tallies);
    } else {
      await refreshTallies();
    }
    alert('You have already voted');
  } else {
    alert(`Vote failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
}

async function createPoll() {
  const q = $('#q').value.trim();
  const opts = $all('.opt')
    .map((i) => i.value.trim())
    .filter(Boolean);
  if (!q || opts.length < 2) {
    alert('Question and at least 2 options');
    return;
  }

  // Create poll (server returns created poll with id)
  const { status, body } = await fetchJson(`${API_BASE}/api/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: q, options: opts }),
  });

  if (status === 201 || status === 200) {
    const newPollId = body && body.id;
    if (newPollId) {
      // Publish it immediately so tallies and voting are allowed (harmless if already published)
      await fetchJson(`${API_BASE}/api/polls/${newPollId}/publish`, {
        method: 'PATCH',
      });
    }
    await loadPolls();
    // Reset form
    $('#q').value = '';
    $('#options').innerHTML = '';
    addOptionInput();
    addOptionInput();
  } else {
    alert('Create failed: ' + status);
  }
}

async function deletePoll(id) {
  if (!confirm('Are you sure you want to delete this poll?')) return;
  const { status } = await fetchJson(`${API_BASE}/api/polls/${id}`, {
    method: 'DELETE',
  });
  if (status === 204) {
    if (currentPollId === id) {
      currentPollId = null;
      $('#view').classList.add('hidden');
      $('#list').classList.remove('hidden');
    }
    await loadPolls();
  } else if (status === 404) {
    alert('Poll not found (already deleted?)');
    await loadPolls();
  } else {
    alert(`Delete failed (status ${status})`);
  }
}

function addOptionInput() {
  const inp = document.createElement('input');
  inp.className = 'opt';
  const count = document.querySelectorAll('.opt').length + 1;
  inp.placeholder = `Option ${count}`;
  $('#options').appendChild(inp);
}

// UI wiring
document.addEventListener('click', (e) => {
  if (!e.target) return;
  if (e.target.id === 'refresh') loadPolls();
  if (e.target.id === 'addOpt') addOptionInput();
  if (e.target.id === 'createPoll') createPoll();
  if (e.target.id === 'back') {
    currentPollId = null;
    $('#view').classList.add('hidden');
    $('#list').classList.remove('hidden');
  }
  if (e.target.id === 'deleteCurrent' && currentPollId) {
    deletePoll(currentPollId);
  }
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.matches('input[name="option"]')) {
    let btn = document.getElementById('voteBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'voteBtn';
      btn.textContent = 'Vote';
      btn.onclick = voteSubmit;
      document.getElementById('view').appendChild(btn);
    }
  }
});

// initial load
loadPolls();
setStatus('Ready');
