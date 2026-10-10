/*
  Servidor CRUD de demonstração - Firebird 5.0 REAL (banco.fdb)
  ------------------------------------------------------------
  - Sem dependências npm: usa o isql.exe do Firebird 5.0 para executar os comandos SQL
    diretamente no arquivo banco.fdb (modo embarcado ou via servidor, conforme FB_DB).
  - Inicie com:  node server.js   e abra  http://localhost:3055

  Variáveis de ambiente opcionais:
    FB_ISQL  -> caminho do isql.exe   (padrão: C:\Program Files\Firebird\Firebird_5_0\isql.exe)
    FB_DB    -> banco de dados        (padrão: ./banco.fdb; pode ser localhost:C:\...\banco.fdb)
    FB_USER / FB_PASS  (padrão: SYSDBA / masterkey)
    PORT     -> porta HTTP (padrão 3055)
*/
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ISQL = process.env.FB_ISQL || 'C:\\Program Files\\Firebird\\Firebird_5_0\\isql.exe';
const DB = process.env.FB_DB || path.join(__dirname, 'banco.fdb');
const USER = process.env.FB_USER || 'SYSDBA';
const PASS = process.env.FB_PASS || 'masterkey';
const PORT = Number(process.env.PORT || 3055);

const COLUMNS = ['ID', 'NOME', 'ENDERECO', 'CNPJ', 'TELEFONE', 'CONTATO', 'EMAIL'];
const MAXLEN = { NOME: 100, ENDERECO: 150, CNPJ: 18, TELEFONE: 20, CONTATO: 80, EMAIL: 100 };

// ---- isql runner (serializado para evitar concorrência no arquivo temporário) ----
let queue = Promise.resolve();
function runSql(sql) {
  const job = () => new Promise((resolve, reject) => {
    const file = path.join(os.tmpdir(), `fb_demo_${process.pid}_${Date.now()}.sql`);
    fs.writeFileSync(file, 'SET NAMES UTF8;\n' + sql, 'utf8');
    const args = ['-q', '-ch', 'UTF8', '-user', USER, '-password', PASS, '-i', file, DB];
    const p = spawn(ISQL, args, { windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', d => (out += d.toString('utf8')));
    p.stderr.on('data', d => (err += d.toString('utf8')));
    p.on('error', reject);
    p.on('close', () => {
      fs.unlink(file, () => {});
      const text = (out + err);
      if (/Statement failed|SQLSTATE|Use CONNECT or CREATE DATABASE/i.test(text)) return reject(new Error(text.trim()));
      resolve(out);
    });
  });
  const next = queue.then(job, job);
  queue = next.catch(() => {});
  return next;
}

// Interpreta a saída do isql em modo LIST (cada registro = vários "CAMPO   valor", separados por linha em branco)
function parseList(out) {
  const rows = [];
  let cur = null;
  for (const raw of out.split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)\s+(.*)$/.exec(raw) || /^([A-Z_][A-Z0-9_]*)\s*$/.exec(raw);
    if (m && COLUMNS.includes(m[1])) {
      if (m[1] === 'ID' && cur && 'ID' in cur) { rows.push(cur); cur = null; }
      if (!cur) cur = {};
      let v = (m[2] === undefined ? '' : m[2]).replace(/\s+$/, '');
      cur[m[1]] = v === '<null>' ? null : v;
    }
  }
  if (cur) rows.push(cur);
  return rows.map(r => ({ ...r, ID: Number(r.ID) }));
}

const q = v => (v == null || v === '' ? 'NULL' : "'" + String(v).replace(/[\u0000-\u001f]/g, ' ').replace(/'/g, "''") + "'");
function clean(body) {
  const o = {};
  for (const c of COLUMNS) {
    if (c === 'ID') continue;
    let v = body[c] == null ? '' : String(body[c]).trim();
    if (MAXLEN[c]) v = v.slice(0, MAXLEN[c]);
    o[c] = v;
  }
  if (!o.NOME) throw Object.assign(new Error('NOME é obrigatório'), { status: 400 });
  return o;
}

const listSql = (where = '') =>
  `SET LIST ON;\nSELECT ID, NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL FROM CLIENTES ${where} ORDER BY ID;\n`;

async function api(req, res, url) {
  const m = /^\/api\/clientes(?:\/(\d+))?$/.exec(url.pathname);
  if (!m) return false;
  const id = m[1] ? Number(m[1]) : null;
  const body = await new Promise(r => {
    let b = ''; req.on('data', d => (b += d)); req.on('end', () => r(b ? JSON.parse(b) : {}));
  });
  let result;
  if (req.method === 'GET' && !id) {
    result = parseList(await runSql(listSql()));
  } else if (req.method === 'GET') {
    result = parseList(await runSql(listSql(`WHERE ID = ${id}`)))[0] || null;
  } else if (req.method === 'POST') {
    const c = clean(body);
    await runSql(
      `INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES (${q(c.NOME)}, ${q(c.ENDERECO)}, ${q(c.CNPJ)}, ${q(c.TELEFONE)}, ${q(c.CONTATO)}, ${q(c.EMAIL)});\nCOMMIT;\n`
    );
    const all = parseList(await runSql(listSql()));
    result = all[all.length - 1];
  } else if (req.method === 'PUT' && id) {
    const c = clean(body);
    await runSql(
      `UPDATE CLIENTES SET NOME=${q(c.NOME)}, ENDERECO=${q(c.ENDERECO)}, CNPJ=${q(c.CNPJ)}, TELEFONE=${q(c.TELEFONE)}, CONTATO=${q(c.CONTATO)}, EMAIL=${q(c.EMAIL)} WHERE ID=${id};\nCOMMIT;\n`
    );
    result = { ok: true };
  } else if (req.method === 'DELETE' && id) {
    await runSql(`DELETE FROM CLIENTES WHERE ID=${id};\nCOMMIT;\n`);
    result = { ok: true };
  } else {
    res.writeHead(405); res.end(); return true;
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(result));
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (await api(req, res, url)) return;
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const full = path.join(__dirname, 'web', path.normalize(file).replace(/^(\.\.[\\/])+/, ''));
    if (!full.startsWith(path.join(__dirname, 'web')) || !fs.existsSync(full)) { res.writeHead(404); return res.end('Not found'); }
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
    res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  } catch (e) {
    res.writeHead(e.status || 500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`CRUD Firebird 5.0 em http://localhost:${PORT}`);
  console.log(`Banco: ${DB}`);
});
