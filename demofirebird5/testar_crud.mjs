// Teste de CRUD de ponta a ponta contra o servidor (Firebird 5.0 real)
const base = 'http://localhost:3055/api/clientes';
const call = async (m, u, b) => {
  const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); return j;
};
const ok = (c, m) => { if (!c) { console.error('FALHOU:', m); process.exit(1); } console.log('OK  ', m); };

const list = await call('GET', base);
ok(list.length >= 10, `GET lista ${list.length} clientes`);
console.log('     amostra:', list[4].NOME, '|', list[4].ENDERECO, '|', list[4].CONTATO);
ok(/Farmácia Saúde/.test(list[4].NOME), 'acentuação UTF-8 preservada');

const novo = await call('POST', base, { NOME: "Teste D'Água Ltda", ENDERECO: 'Rua Teste, 1', CNPJ: '99.999.999/0001-99', TELEFONE: '(11) 0000-0000', CONTATO: 'João', EMAIL: 'x@y.com' });
ok(novo.ID > 10, `INSERT -> ID ${novo.ID} gerado pelo generator`);
ok(novo.NOME === "Teste D'Água Ltda", 'aspas simples e acentos gravados');

await call('PUT', `${base}/${novo.ID}`, { NOME: 'Teste Alterado', ENDERECO: '', CNPJ: '1', TELEFONE: '2', CONTATO: 'Maria', EMAIL: 'z@y.com' });
const lido = await call('GET', `${base}/${novo.ID}`);
ok(lido.NOME === 'Teste Alterado' && lido.CONTATO === 'Maria', 'UPDATE persistido');

await call('DELETE', `${base}/${novo.ID}`);
const apos = await call('GET', base);
ok(!apos.some(r => r.ID === novo.ID) && apos.length === list.length, 'DELETE removeu o registro');
console.log('CRUD completo validado no Firebird 5.0!');
