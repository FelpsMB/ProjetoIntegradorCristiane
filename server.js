// ============================================================
//  EcoLogix - Servidor (backend)
//  Express + MySQL. Serve as paginas e a API (adicionar,
//  listar, editar e excluir os dados).
// ============================================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Pequeno ajudante: executa uma query e trata o erro de forma simples.
async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Embrulha uma rota async para capturar erros automaticamente.
const rota = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ erro: e.message });
});

// ------------------------------------------------------------
//  AUTENTICACAO  (Login e Cadastro)
// ------------------------------------------------------------
app.post('/api/cadastro', rota(async (req, res) => {
  const { nome, sobrenome, email, senha, cnpj, perfil } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha nome, e-mail e senha.' });
  }
  const existe = await q('SELECT id_usuario FROM usuario WHERE email = ?', [email]);
  if (existe.length) return res.status(400).json({ erro: 'Este e-mail ja esta cadastrado.' });

  await q(
    'INSERT INTO usuario (nome, sobrenome, email, senha, cnpj_cpf, perfil) VALUES (?,?,?,?,?,?)',
    [nome, sobrenome || '', email, senha, cnpj || '', perfil || 'cliente']
  );
  res.json({ ok: true });
}));

app.post('/api/login', rota(async (req, res) => {
  const { email, senha } = req.body;
  const rows = await q('SELECT id_usuario, nome, email, perfil FROM usuario WHERE email = ? AND senha = ?', [email, senha]);
  if (!rows.length) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  res.json({ ok: true, usuario: rows[0] });
}));

// ------------------------------------------------------------
//  DASHBOARD  (numeros e graficos)
// ------------------------------------------------------------
app.get('/api/dashboard', rota(async (req, res) => {
  const [osAbertas] = await q("SELECT COUNT(*) AS n FROM ordemdeservico WHERE status IN ('Pendente','Em rota')");
  const [emRota]    = await q("SELECT COUNT(*) AS n FROM ordemdeservico WHERE status = 'Em rota'");
  const [kg]        = await q('SELECT COALESCE(SUM(peso_real),0) AS n FROM residuo');
  const [mtr]       = await q('SELECT COUNT(*) AS n FROM documentoambiental');
  const [motAtivos] = await q("SELECT COUNT(DISTINCT id_motorista) AS n FROM ordemdeservico WHERE status = 'Em rota' AND id_motorista IS NOT NULL");

  const recentes = await q(`
    SELECT o.id_os, o.status, o.peso_total, c.nome AS cliente
    FROM ordemdeservico o
    LEFT JOIN cliente c ON c.id_cliente = o.id_cliente
    ORDER BY o.id_os DESC LIMIT 6`);

  const categorias = await q(`
    SELECT tipo_material, COALESCE(SUM(peso_real),0) AS total
    FROM residuo GROUP BY tipo_material ORDER BY total DESC`);

  const motoristas = await q(`
    SELECT m.id_motorista, m.nome,
      (SELECT id_os FROM ordemdeservico o WHERE o.id_motorista = m.id_motorista AND o.status = 'Em rota' LIMIT 1) AS os_ativa
    FROM motorista m ORDER BY m.nome`);

  res.json({
    osAbertas: osAbertas.n,
    emRota: emRota.n,
    kgColetados: Number(kg.n),
    mtrEmitidos: mtr.n,
    motoristasAtivos: motAtivos.n,
    ordensRecentes: recentes,
    residuosPorCategoria: categorias,
    motoristas,
  });
}));

// ------------------------------------------------------------
//  CRUD GENERICO
//  Cria automaticamente as rotas listar/criar/editar/excluir
//  para uma tabela. Evita repetir codigo.
// ------------------------------------------------------------
function crud(rotaUrl, tabela, idCampo, campos, listarSql) {
  // LISTAR
  app.get(`/api/${rotaUrl}`, rota(async (req, res) => {
    const rows = await q(listarSql || `SELECT * FROM ${tabela} ORDER BY ${idCampo} DESC`);
    res.json(rows);
  }));

  // CRIAR
  app.post(`/api/${rotaUrl}`, rota(async (req, res) => {
    const valores = campos.map((c) => (req.body[c] === '' ? null : req.body[c] ?? null));
    const marcas = campos.map(() => '?').join(',');
    const r = await q(`INSERT INTO ${tabela} (${campos.join(',')}) VALUES (${marcas})`, valores);
    res.json({ ok: true, id: r.insertId });
  }));

  // EDITAR
  app.put(`/api/${rotaUrl}/:id`, rota(async (req, res) => {
    const valores = campos.map((c) => (req.body[c] === '' ? null : req.body[c] ?? null));
    const sets = campos.map((c) => `${c} = ?`).join(',');
    await q(`UPDATE ${tabela} SET ${sets} WHERE ${idCampo} = ?`, [...valores, req.params.id]);
    res.json({ ok: true });
  }));

  // EXCLUIR
  app.delete(`/api/${rotaUrl}/:id`, rota(async (req, res) => {
    await q(`DELETE FROM ${tabela} WHERE ${idCampo} = ?`, [req.params.id]);
    res.json({ ok: true });
  }));
}

// Clientes
crud('clientes', 'cliente', 'id_cliente', ['nome', 'cnpj', 'email', 'endereco']);

// Veiculos (a "placa" e a propria chave; usamos rotas proprias por isso)
app.get('/api/veiculos', rota(async (req, res) => {
  res.json(await q('SELECT * FROM veiculo ORDER BY placa'));
}));
app.post('/api/veiculos', rota(async (req, res) => {
  const { placa, modelo, capacidade_carga } = req.body;
  await q('INSERT INTO veiculo (placa, modelo, capacidade_carga) VALUES (?,?,?)',
    [placa, modelo || null, capacidade_carga || null]);
  res.json({ ok: true });
}));
app.put('/api/veiculos/:placa', rota(async (req, res) => {
  const { modelo, capacidade_carga } = req.body;
  await q('UPDATE veiculo SET modelo = ?, capacidade_carga = ? WHERE placa = ?',
    [modelo || null, capacidade_carga || null, req.params.placa]);
  res.json({ ok: true });
}));
app.delete('/api/veiculos/:placa', rota(async (req, res) => {
  await q('DELETE FROM veiculo WHERE placa = ?', [req.params.placa]);
  res.json({ ok: true });
}));

// Motoristas (lista junto o modelo do veiculo)
crud('motoristas', 'motorista', 'id_motorista', ['nome', 'licenca', 'placa_veiculo'], `
  SELECT m.*, v.modelo AS veiculo_modelo
  FROM motorista m LEFT JOIN veiculo v ON v.placa = m.placa_veiculo
  ORDER BY m.id_motorista DESC`);

// Ordens de Servico (lista junto o nome do cliente e do motorista)
crud('ordens', 'ordemdeservico', 'id_os',
  ['id_cliente', 'id_motorista', 'data_solicitacao', 'status', 'peso_total'], `
  SELECT o.*, c.nome AS cliente_nome, m.nome AS motorista_nome
  FROM ordemdeservico o
  LEFT JOIN cliente c ON c.id_cliente = o.id_cliente
  LEFT JOIN motorista m ON m.id_motorista = o.id_motorista
  ORDER BY o.id_os DESC`);

// Residuos (lista junto a qual OS pertence)
crud('residuos', 'residuo', 'id_residuo',
  ['id_os', 'tipo_material', 'peso_estimado', 'peso_real'], `
  SELECT r.* FROM residuo r ORDER BY r.id_residuo DESC`);

// Documentos ambientais (MTR / CDF)
crud('documentos', 'documentoambiental', 'id_documento',
  ['id_os', 'numero_mtr', 'data_emissao', 'tipo'], `
  SELECT d.* FROM documentoambiental d ORDER BY d.id_documento DESC`);

// ------------------------------------------------------------
//  Pagina inicial -> tela de login
// ------------------------------------------------------------
app.get('/', (req, res) => res.redirect('/login.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  EcoLogix rodando!');
  console.log('  Abra no navegador:  http://localhost:' + PORT);
  console.log('========================================\n');
});
