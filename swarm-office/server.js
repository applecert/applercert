#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4321;
const REPO_ROOT = path.resolve(__dirname, '..');
const SWARM_DIR =
  process.env.SWARM_DIR ||
  '/Users/mquitran/.gemini/antigravity/brain/ce29f760-c8df-4763-8d31-2920d6c27660/.system_generated/swarm';

const DEPARTMENT_CATALOG = [
  {
    id: 'executive',
    label: 'Phòng Họp & Điều Hành',
    shortLabel: 'Điều Hành',
    color: '#ff6b00',
    order: 1,
  },
  {
    id: 'analysis',
    label: 'Phòng Phân Tích & Prompt',
    shortLabel: 'Phân Tích',
    color: '#ec4899',
    order: 2,
  },
  {
    id: 'design',
    label: 'Phòng UI/UX & Thiết Kế',
    shortLabel: 'UI/UX',
    color: '#e10e0e',
    order: 3,
  },
  {
    id: 'product',
    label: 'Phòng Phát Triển Sản Phẩm',
    shortLabel: 'Sản Phẩm',
    color: '#0a84ff',
    order: 4,
  },
  {
    id: 'qa',
    label: 'Phòng QA & Kiểm Định',
    shortLabel: 'QA & Lab',
    color: '#af52de',
    order: 5,
  },
  {
    id: 'infra',
    label: 'Phòng Hạ Tầng & Vận Hành',
    shortLabel: 'Hạ Tầng 3D',
    color: '#32ade6',
    order: 6,
  },
];

const DEPARTMENT_BY_ID = new Map(DEPARTMENT_CATALOG.map((d) => [d.id, d]));

const AGENT_DEPARTMENT_MAP = {
  coordinator: 'executive',
  'req-analyst': 'analysis',
  'prompt-architect': 'analysis',
  'design-lead': 'design',
  'shell-unifier': 'design',
  'cert-ui': 'product',
  'apps-ui': 'product',
  'apps-v2': 'product',
  'commerce-ui': 'product',
  'commerce-v2': 'product',
  'support-ui': 'product',
  'support-v2': 'product',
  verifier: 'qa',
  'qa-v2': 'qa',
  'qa-lead': 'qa',
  monitor: 'infra',
  'office-builder': 'infra',
  'office-dev': 'infra',
};

function getDepartmentInfo(agentName) {
  const key = String(agentName || '').trim().toLowerCase();
  let deptId = AGENT_DEPARTMENT_MAP[key];

  if (!deptId) {
    if (key.includes('coordinator')) deptId = 'executive';
    else if (key.includes('analyst') || key.includes('prompt')) deptId = 'analysis';
    else if (key.includes('design') || key.includes('shell')) deptId = 'design';
    else if (key.includes('qa') || key.includes('verif') || key.includes('test')) deptId = 'qa';
    else if (key.includes('office') || key.includes('monitor') || key.includes('infra')) deptId = 'infra';
    else deptId = 'product';
  }

  const dept = DEPARTMENT_BY_ID.get(deptId) || DEPARTMENT_BY_ID.get('product');
  return {
    department: dept.id,
    departmentLabel: dept.label,
    departmentShortLabel: dept.shortLabel,
    departmentColor: dept.color,
    departmentOrder: dept.order,
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'application/x-ndjson; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function safeReadJson(filePath, fallback) {
  const raw = safeReadText(filePath).trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readBoardMessages(filePath, limit = 0) {
  const raw = safeReadText(filePath);
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const startIdx = limit > 0 ? Math.max(0, lines.length - limit * 2) : 0;
  const messages = [];

  for (let i = startIdx; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object') {
        const deptInfo = getDepartmentInfo(parsed.agent || 'coordinator');
        messages.push({
          ...parsed,
          department: deptInfo.department,
          departmentLabel: deptInfo.departmentLabel,
          departmentColor: deptInfo.departmentColor,
        });
      }
    } catch {
      // Ignore partial/in-flight JSONL line
    }
  }

  messages.sort((a, b) => {
    const seqA = typeof a.seq === 'number' ? a.seq : 0;
    const seqB = typeof b.seq === 'number' ? b.seq : 0;
    return seqA - seqB;
  });

  return limit > 0 ? messages.slice(-limit) : messages;
}

function deriveMemberStatus(member) {
  if (!member || typeof member !== 'object') return 'waiting';
  if (
    member.killed === true ||
    member.phase === 'KILLED' ||
    member.desired_state === 'KILLED'
  ) {
    return 'killed';
  }
  if (member.phase === 'STOPPED' || member.desired_state === 'STOPPED') {
    return 'stopped';
  }
  if (member.wake_mode === 'working') {
    return 'working';
  }
  return 'waiting';
}

function buildSwarmState() {
  const swarmMeta = safeReadJson(path.join(SWARM_DIR, 'swarm.json'), {});
  const membersDoc = safeReadJson(path.join(SWARM_DIR, 'members.json'), {});
  const messages = readBoardMessages(path.join(SWARM_DIR, 'board.jsonl'), 0);

  const rawMembers =
    membersDoc && typeof membersDoc.members === 'object' && membersDoc.members
      ? { ...membersDoc.members }
      : {};

  if (!rawMembers.coordinator) {
    rawMembers.coordinator = {
      conversation_id: swarmMeta.swarm_id || '',
      role: 'coordinator',
      desired_state: 'RUNNING',
      phase: 'RUNNING',
      wake_mode: 'working',
      killed: false,
      model: '',
    };
  }

  const latestByAgent = new Map();
  let headSeq = 0;
  for (const msg of messages) {
    if (typeof msg.seq === 'number' && msg.seq > headSeq) {
      headSeq = msg.seq;
    }
    if (msg.agent) {
      latestByAgent.set(msg.agent, msg);
    }
  }

  const members = Object.entries(rawMembers)
    .map(([name, info]) => {
      const m = info && typeof info === 'object' ? info : {};
      const status = deriveMemberStatus(m);
      const killed = status === 'killed';
      if (typeof m.last_read_seq === 'number' && m.last_read_seq > headSeq) {
        headSeq = m.last_read_seq;
      }
      const lastMsg = latestByAgent.get(name) || null;
      const deptInfo = getDepartmentInfo(name);
      return {
        name,
        role: m.role || (name === 'coordinator' ? 'coordinator' : 'worker'),
        status,
        phase: m.phase || (killed ? 'KILLED' : 'RUNNING'),
        desiredState: m.desired_state || (killed ? 'KILLED' : 'RUNNING'),
        wakeMode: m.wake_mode || 'working',
        killed,
        model: m.applied_model || m.model || m.desired_model || '',
        workspaceMode: m.workspace_mode || 'inherit',
        department: deptInfo.department,
        departmentLabel: deptInfo.departmentLabel,
        departmentShortLabel: deptInfo.departmentShortLabel,
        departmentColor: deptInfo.departmentColor,
        departmentOrder: deptInfo.departmentOrder,
        lastReadSeq: typeof m.last_read_seq === 'number' ? m.last_read_seq : 0,
        waitSince: typeof m.wait_since === 'number' ? m.wait_since : 0,
        lastPostSeq: lastMsg && typeof lastMsg.seq === 'number' ? lastMsg.seq : 0,
        lastPostTime: lastMsg && lastMsg.time ? lastMsg.time : null,
        lastMessageText: lastMsg && lastMsg.text ? lastMsg.text : '',
      };
    })
    .sort((a, b) => {
      if (a.departmentOrder !== b.departmentOrder) {
        return a.departmentOrder - b.departmentOrder;
      }
      if (a.name === 'coordinator') return -1;
      if (b.name === 'coordinator') return 1;
      if (a.killed !== b.killed) return a.killed ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

  return {
    title: membersDoc.title || 'Công Ty AI IPAVIET — Văn Phòng 3D Đa Phòng Ban',
    swarmId: swarmMeta.swarm_id || '',
    createdAt: swarmMeta.created_at || null,
    headSeq,
    totalMessages: messages.length,
    updatedAt: new Date().toISOString(),
    departments: DEPARTMENT_CATALOG,
    members,
    messages,
  };
}

function getSwarmFingerprint() {
  const targets = ['swarm.json', 'members.json', 'board.jsonl'];
  const parts = [];
  for (const name of targets) {
    try {
      const st = fs.statSync(path.join(SWARM_DIR, name));
      parts.push(`${name}:${st.mtimeMs}:${st.size}`);
    } catch {
      parts.push(`${name}:missing`);
    }
  }
  return parts.join('|');
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { ok: false, error: message });
}

function handleSse(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  let closed = false;
  let lastFingerprint = '';
  let lastPayload = '';

  const pushState = (force = false) => {
    if (closed) return;
    try {
      const fp = getSwarmFingerprint();
      if (!force && fp === lastFingerprint) return;
      const state = buildSwarmState();
      const json = JSON.stringify(state);
      lastFingerprint = fp;
      if (!force && json === lastPayload) return;
      lastPayload = json;
      res.write(`event: state\ndata: ${json}\n\n`);
    } catch {
      // Keep stream resilient against transient file state
    }
  };

  pushState(true);

  const pollTimer = setInterval(() => {
    pushState(false);
  }, 800);

  const heartbeatTimer = setInterval(() => {
    if (closed) return;
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 10000);

  req.on('close', () => {
    closed = true;
    clearInterval(pollTimer);
    clearInterval(heartbeatTimer);
  });
}

function serveStaticFile(req, res, urlObj) {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(urlObj.pathname);
  } catch {
    return sendError(res, 400, 'Malformed URL');
  }

  const relativePath = pathname.replace(/^\/+/, '');
  const candidate = path.resolve(REPO_ROOT, relativePath);

  if (
    candidate !== REPO_ROOT &&
    !candidate.startsWith(REPO_ROOT + path.sep)
  ) {
    return sendError(res, 403, 'Forbidden');
  }

  fs.stat(candidate, (statErr, stat) => {
    if (statErr) {
      const fallback404 = path.join(REPO_ROOT, '404.html');
      if (pathname.endsWith('.html') && fs.existsSync(fallback404)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream(fallback404).pipe(res);
      }
      return sendError(res, 404, 'Not found');
    }

    if (stat.isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(302, {
          Location: `${pathname}/${urlObj.search || ''}`,
        });
        return res.end();
      }
      const indexFile = path.join(candidate, 'index.html');
      return fs.stat(indexFile, (idxErr, idxStat) => {
        if (idxErr || !idxStat.isFile()) {
          return sendError(res, 404, 'Directory index not found');
        }
        streamFile(req, res, indexFile, idxStat);
      });
    }

    if (!stat.isFile()) {
      return sendError(res, 404, 'Not found');
    }

    return streamFile(req, res, candidate, stat);
  });
}

function streamFile(req, res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const headers = {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Cache-Control':
      ext === '.html' || ext === '.json'
        ? 'no-cache'
        : 'public, max-age=300',
  };

  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    return res.end();
  }

  res.writeHead(200, headers);
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      sendError(res, 500, 'Read error');
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

function createServer() {
  return http.createServer((req, res) => {
    if (!req.url) {
      return sendError(res, 400, 'Bad request');
    }

    let urlObj;
    try {
      urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      return sendError(res, 400, 'Invalid URL');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendError(res, 405, 'Method not allowed');
    }

    if (urlObj.pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        service: 'ipaviet-swarm-office',
        port: PORT,
        swarmDir: SWARM_DIR,
        repoRoot: REPO_ROOT,
        time: new Date().toISOString(),
      });
    }

    if (urlObj.pathname === '/api/swarm-state') {
      return sendJson(res, 200, buildSwarmState());
    }

    if (urlObj.pathname === '/api/swarm-stream') {
      return handleSse(req, res);
    }

    return serveStaticFile(req, res, urlObj);
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[IPAVIET Swarm Office] Listening on http://localhost:${PORT}/swarm-office/`
    );
    console.log(`[IPAVIET Swarm Office] Repo root: ${REPO_ROOT}`);
    console.log(`[IPAVIET Swarm Office] Swarm dir: ${SWARM_DIR}`);
  });
}

module.exports = {
  createServer,
  buildSwarmState,
  readBoardMessages,
  getDepartmentInfo,
  DEPARTMENT_CATALOG,
};
