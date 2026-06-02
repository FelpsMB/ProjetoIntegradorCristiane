// ============================================================
//  Funcoes compartilhadas por todas as paginas do EcoLogix
// ============================================================

// ---- Conversa com a API (servidor) ----
async function api(metodo, url, dados) {
  const opcoes = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (dados) opcoes.body = JSON.stringify(dados);
  const r = await fetch(url, opcoes);
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.erro || 'Erro de comunicacao com o servidor.');
  return json;
}
const apiGet  = (url) => api('GET', url);
const apiPost = (url, d) => api('POST', url, d);
const apiPut  = (url, d) => api('PUT', url, d);
const apiDel  = (url) => api('DELETE', url);

// ---- Usuario logado (guardado no navegador) ----
function usuarioLogado() {
  try { return JSON.parse(localStorage.getItem('ecologix_usuario')); }
  catch { return null; }
}
function sair() {
  localStorage.removeItem('ecologix_usuario');
  location.href = 'login.html';
}
// Protege as paginas internas: se nao estiver logado, volta pro login.
function exigirLogin() {
  if (!usuarioLogado()) { location.href = 'login.html'; return false; }
  return true;
}

// ---- Aviso flutuante (toast) ----
function aviso(texto, ehErro) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = texto;
  t.className = ehErro ? 'erro mostra' : 'mostra';
  setTimeout(() => { t.className = ehErro ? 'erro' : ''; }, 2600);
}

// ---- Monta a barra de topo com o menu de navegacao ----
function montarTopbar(paginaAtiva) {
  const u = usuarioLogado() || { nome: 'Usuario' };
  const iniciais = (u.nome || 'U').trim().slice(0, 2).toUpperCase();
  const itens = [
    ['dashboard.html', 'ti-layout-dashboard', 'Painel'],
    ['ordens.html',    'ti-file-text',        'Ordens'],
    ['clientes.html',  'ti-building-store',   'Clientes'],
    ['motoristas.html','ti-truck',            'Motoristas'],
    ['veiculos.html',  'ti-car',              'Veiculos'],
    ['residuos.html',  'ti-recycle',          'Residuos'],
    ['documentos.html','ti-file-certificate', 'Documentos'],
  ];
  const links = itens.map(([href, ic, nome]) =>
    `<a href="${href}" class="${href === paginaAtiva ? 'active' : ''}"><i class="ti ${ic}"></i> ${nome}</a>`
  ).join('');

  document.getElementById('topbar').innerHTML = `
    <div class="logo"><i class="ti ti-leaf"></i> EcoLogix</div>
    <nav class="topnav">${links}</nav>
    <div class="user">
      <div class="avatar">${iniciais}</div>
      <span>${u.nome}</span>
      <button class="btn-sair" onclick="sair()"><i class="ti ti-logout"></i> Sair</button>
    </div>`;
}

// ---- Devolve a classe de cor do selo de status ----
function classeStatus(status) {
  const s = (status || '').toLowerCase();
  if (s === 'em rota') return 'em-rota';
  if (s === 'pendente') return 'pendente';
  if (s === 'concluida') return 'concluida';
  if (s === 'cancelada') return 'cancelada';
  return 'pendente';
}

// ---- Ajudantes de janela (modal) ----
function abrirModal(id) { document.getElementById(id).classList.add('aberto'); }
function fecharModal(id) { document.getElementById(id).classList.remove('aberto'); }

// Escapa texto para evitar quebrar o HTML
function esc(v) {
  return String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
