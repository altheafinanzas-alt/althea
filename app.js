// --- Auth guard ---
// Si no hay sesión activa, no se carga el CRM.
let CURRENT_USER = null;

async function requireSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = 'login.html';
    return null;
  }
  return data.session.user;
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

// --- State (cache en memoria, la fuente de verdad es Supabase) ---
const state = {
  clients: [],
  advisors: {
    'mis-clientes': ['Agos'],
    'equipo-gallo': [],
    'equipo-fernanda': []
  },
  currentTeam: 'mis-clientes',
  currentAdvisorFilter: { 'equipo-gallo': 'todos', 'equipo-fernanda': 'todos' },
  misSub: 'propios',
  nuevasSub: 'todos',
  searchQuery: { 'mis-clientes': '', 'equipo-gallo': '', 'equipo-fernanda': '' },
  editingId: null,
  addAdvisorTeam: null
};

// Convierte una fila de la tabla `clientes` (snake_case) al shape que
// usa la UI (camelCase), igual que el SEED_CLIENTS original.
function rowToClient(row) {
  return {
    id: row.id,
    team: row.team,
    comitente: row.comitente || '',
    nombre: row.nombre || '',
    apellido: row.apellido || '',
    fecha: row.fecha || '',
    asesor: row.asesor || '',
    reasignacion: row.reasignacion || '',
    perfil: row.perfil || '',
    reunion: row.reunion || '',
    obs: row.obs || '',
    sub_panel: row.sub_panel || '',
    asesorOriginal: row.asesor_original || '',
    derivado: !!row.derivado,
    cOrdenes: row.c_ordenes === true || row.c_ordenes === 'true',
    usuarioC: row.usuario_c === true || row.usuario_c === 'true'
  };
}

// Convierte el objeto de la UI al shape de columnas de la tabla `clientes`.
function clientToRow(c) {
  return {
    team: c.team,
    comitente: c.comitente || null,
    nombre: c.nombre || null,
    apellido: c.apellido || null,
    fecha: c.fecha || null,
    asesor: c.asesor || null,
    reasignacion: c.reasignacion || null,
    perfil: c.perfil || null,
    reunion: c.reunion || null,
    obs: c.obs || null,
    sub_panel: c.sub_panel || null,
    asesor_original: c.asesorOriginal || null,
    derivado: !!c.derivado,
    c_ordenes: c.cOrdenes ? 'true' : null,
    usuario_c: c.usuarioC ? 'true' : null
  };
}

async function loadClients() {
  const { data, error } = await supabaseClient.from('clientes').select('*');
  if (error) {
    alert('Error cargando clientes: ' + error.message);
    return;
  }
  state.clients = data.map(rowToClient);
}

async function loadAdvisors() {
  const { data, error } = await supabaseClient.from('advisors').select('*');
  if (error) {
    alert('Error cargando asesores: ' + error.message);
    return;
  }
  state.advisors['equipo-gallo'] = data.filter(a => a.team === 'equipo-gallo').map(a => a.nombre);
  state.advisors['equipo-fernanda'] = data.filter(a => a.team === 'equipo-fernanda').map(a => a.nombre);
}

// --- Header date ---
document.getElementById('fechaHeader').textContent = new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

// --- Tabs ---
function switchTab(team) {
  state.currentTeam = team;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.team-panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('panel-' + team).classList.add('active');
  if (team === 'cuentas-nuevas') renderNuevas(); else renderAll();
}

function switchSubTab(btn, team) {
  const advisor = btn.dataset.advisor;
  state.currentAdvisorFilter[team] = advisor;
  btn.closest('.sub-tabs').querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTeam('equipo-' + team);
}

// --- Search ---
function onSearch(teamKey, val) {
  state.searchQuery[teamKey] = val.toLowerCase().trim();
  const clearBtn = document.getElementById('clear-' + teamKey);
  const icon = document.getElementById('icon-' + teamKey);
  if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
  if (icon) icon.style.display = val ? 'none' : 'block';
  renderTeam(teamKey);
}

function clearSearch(teamKey) {
  state.searchQuery[teamKey] = '';
  const input = document.getElementById('search-' + teamKey);
  const clearBtn = document.getElementById('clear-' + teamKey);
  const icon = document.getElementById('icon-' + teamKey);
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  if (icon) icon.style.display = 'block';
  renderTeam(teamKey);
}

// --- Cuentas nuevas ---
function switchNuevasSub(btn) {
  state.nuevasSub = btn.dataset.eq;
  document.querySelectorAll('#subtabs-nuevas .sub-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNuevas();
}

function renderNuevas() {
  const months = parseInt(document.getElementById('nuevas-period').value);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  let clients = state.clients.filter(c => {
    if (!c.fecha) return false;
    return new Date(c.fecha) >= cutoff;
  });

  if (state.nuevasSub !== 'todos') {
    clients = clients.filter(c => c.team === state.nuevasSub);
  }

  clients = clients.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const listEl = document.getElementById('list-cuentas-nuevas');
  const statsEl = document.getElementById('stats-cuentas-nuevas');
  const countEl = document.getElementById('count-nuevas');

  const byTeam = {
    'mis-clientes': clients.filter(c => c.team === 'mis-clientes').length,
    'equipo-gallo': clients.filter(c => c.team === 'equipo-gallo').length,
    'equipo-fernanda': clients.filter(c => c.team === 'equipo-fernanda').length,
  };

  if (countEl) countEl.textContent = clients.length + (clients.length === 1 ? ' cuenta' : ' cuentas');

  if (statsEl) {
    statsEl.innerHTML = clients.length === 0 ? '' : `
      <div class="stat-chip"><div class="stat-value">${clients.length}</div><div class="stat-label">Total</div></div>
      ${byTeam['mis-clientes'] ? `<div class="stat-chip"><div class="stat-value">${byTeam['mis-clientes']}</div><div class="stat-label">Mis clientes</div></div>` : ''}
      ${byTeam['equipo-gallo'] ? `<div class="stat-chip"><div class="stat-value">${byTeam['equipo-gallo']}</div><div class="stat-label">Equipo Gallo</div></div>` : ''}
      ${byTeam['equipo-fernanda'] ? `<div class="stat-chip"><div class="stat-value">${byTeam['equipo-fernanda']}</div><div class="stat-label">Equipo Fernanda</div></div>` : ''}
    `;
  }

  if (clients.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="icon">📋</div><div>Sin cuentas nuevas en este período.</div></div>`;
    return;
  }

  const teamLabel = { 'mis-clientes': 'Mis clientes', 'equipo-gallo': 'Equipo Gallo', 'equipo-fernanda': 'Equipo Fernanda' };
  const teamColor = { 'mis-clientes': 'background:var(--green-pale);color:var(--green-dark)', 'equipo-gallo': 'background:var(--violet-pale);color:var(--violet)', 'equipo-fernanda': 'background:#fff8e1;color:#b45309' };

  listEl.innerHTML = clients.map(c => {
    const perfilBadge = c.perfil ? `<span class="badge badge-${c.perfil}">${cap(c.perfil)}</span>` : '';
    const teamBadge = `<span class="badge" style="${teamColor[c.team] || ''}">${teamLabel[c.team] || c.team}</span>`;
    const asesorMeta = c.asesor ? `<span class="meta-item"><strong>Asesor:</strong> ${c.asesor}</span>` : '';
    const comitente = c.comitente ? `<span class="meta-item"><strong>Comitente:</strong> ${c.comitente}</span>` : '';
    return `
      <div class="client-card">
        <div style="display:flex;flex-direction:column;gap:2px;min-width:90px;margin-right:16px;">
          <span style="font-family:'DM Mono',monospace;font-size:18px;font-weight:400;color:var(--green-dark);">${formatDate(c.fecha)}</span>
          <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">apertura</span>
        </div>
        <div class="client-info">
          <div class="client-name">${c.apellido}, ${c.nombre}</div>
          <div class="client-meta">${comitente}${asesorMeta}</div>
        </div>
        <div class="client-badges">
          ${teamBadge}${perfilBadge}
          <button class="btn-edit" onclick="editClient('${c.id}')">Editar</button>
        </div>
      </div>`;
  }).join('');
}

// --- Render ---
async function derivarCliente() {
  if (!state.editingId) return;
  const c = state.clients.find(x => x.id === state.editingId);
  if (!c) return;
  const advisors = (state.advisors[c.team] || []).filter(a => a !== c.asesor);
  if (advisors.length === 0) { alert('No hay otros asesores disponibles en este equipo.'); return; }
  const nuevo = advisors.length === 1 ? advisors[0] : prompt('Derivar a:\n' + advisors.map((a,i)=>`${i+1}. ${a}`).join('\n') + '\n\nEscribí el nombre exacto:');
  if (!nuevo || !advisors.includes(nuevo)) { alert('Asesor no válido.'); return; }

  const { error } = await supabaseClient.from('clientes')
    .update({ asesor: nuevo, derivado: true })
    .eq('id', c.id);
  if (error) { alert('Error al derivar: ' + error.message); return; }

  c.asesor = nuevo;
  c.derivado = true;
  document.getElementById('field-asesor').value = nuevo;
  populateAsesorSelect(c.team, nuevo);
  renderAll();
  alert(`Cliente derivado a ${nuevo} correctamente.`);
}

function switchMisSub(btn) {
  state.misSub = btn.dataset.sub;
  document.querySelectorAll('#subtabs-mis .sub-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTeam('mis-clientes');
}

function renderAll() {
  renderTeam('mis-clientes');
  renderTeam('equipo-gallo');
  renderTeam('equipo-fernanda');
  renderNuevas();
  updateSubTabs();
}

function getAdvisorFilter(teamKey) {
  if (teamKey === 'mis-clientes') return null;
  const short = teamKey.replace('equipo-', '');
  return state.currentAdvisorFilter[short] || 'todos';
}

function renderTeam(teamKey) {
  const listEl = document.getElementById('list-' + teamKey);
  const statsEl = document.getElementById('stats-' + teamKey);

  let clients = state.clients.filter(c => c.team === teamKey);
  const filter = getAdvisorFilter(teamKey);
  if (filter && filter !== 'todos') {
    if (filter === 'Tiago-derivados') {
      clients = clients.filter(c => c.asesor === 'Tiago' && c.derivado === true);
    } else {
      clients = clients.filter(c => c.asesor === filter && !( filter === 'Tiago' && c.derivado === true ));
    }
  }
  if (teamKey === 'mis-clientes') {
    if (state.misSub === 'propios') {
      clients = clients.filter(c => c.sub_panel !== 'reasignaciones');
    } else if (state.misSub === 'reasignaciones') {
      clients = clients.filter(c => c.sub_panel === 'reasignaciones');
    }
  }
  clients = clients.slice().sort((a, b) => {
    const ap = (a.apellido + ' ' + a.nombre).toLowerCase();
    const bp = (b.apellido + ' ' + b.nombre).toLowerCase();
    return ap.localeCompare(bp, 'es');
  });

  // Apply search filter
  const q = (state.searchQuery[teamKey] || '').toLowerCase();
  if (q) {
    clients = clients.filter(c => {
      const full = (c.apellido + ' ' + c.nombre + ' ' + c.comitente).toLowerCase();
      return full.includes(q);
    });
  }

  // Stats
  if (statsEl) {
    const total = clients.length;
    const conservadores = clients.filter(c => c.perfil === 'conservador').length;
    const moderados = clients.filter(c => c.perfil === 'moderado').length;
    const riesgosos = clients.filter(c => c.perfil === 'riesgoso').length;
    statsEl.innerHTML = total === 0 ? '' : `
      <div class="stat-chip"><div class="stat-value">${total}</div><div class="stat-label">Clientes</div></div>
      ${conservadores ? `<div class="stat-chip"><div class="stat-value">${conservadores}</div><div class="stat-label">Conservadores</div></div>` : ''}
      ${moderados ? `<div class="stat-chip"><div class="stat-value">${moderados}</div><div class="stat-label">Moderados</div></div>` : ''}
      ${riesgosos ? `<div class="stat-chip"><div class="stat-value">${riesgosos}</div><div class="stat-label">Riesgosos</div></div>` : ''}
    `;
  }

  // Count label for mis clientes
  const countEl = document.getElementById('count-mis');
  if (countEl) {
    const propios = state.clients.filter(c => c.team === 'mis-clientes' && c.sub_panel !== 'reasignaciones').length;
    const reasig = state.clients.filter(c => c.team === 'mis-clientes' && c.sub_panel === 'reasignaciones').length;
    countEl.textContent = propios + ' propios · ' + reasig + ' reasignados';
  }

  if (clients.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="icon">📋</div><div>Sin clientes para esta vista.</div></div>`;
    return;
  }

  listEl.innerHTML = clients.map(c => {
    const perfilBadge = c.perfil ? `<span class="badge badge-${c.perfil}">${cap(c.perfil)}</span>` : '';
    const derivadoBadge = c.derivado ? `<span class="badge" style="background:#fef3c7;color:#92400e;font-size:11px;">Derivado</span>` : '';
    const reasigBadge = c.reasignacion === 'reasignado'
      ? `<span class="badge badge-reasignado">Reasignado</span>`
      : c.reasignacion === 'sin_reasignar'
      ? `<span class="badge badge-sin-reasignar">Sin reasignar</span>`
      : `<span class="badge badge-propio">Propio</span>`;
    const reunionBadge = c.reunion ? `<span class="badge" style="background:#f0ebf8;color:#6b4fa0;">${cap(c.reunion)}</span>` : '';
    const fecha = c.fecha ? `<span class="meta-item"><strong>Apertura:</strong> ${formatDate(c.fecha)}</span>` : '';
    const comitente = c.comitente ? `<span class="meta-item"><strong>Comitente:</strong> ${c.comitente}</span>` : '';
    const asesorMeta = c.asesor && teamKey !== 'mis-clientes' ? `<span class="meta-item"><strong>Asesor:</strong> ${c.asesor}</span>` : '';
    const originalMeta = c.asesorOriginal && c.asesorOriginal !== c.asesor ? `<span class="meta-item" style="color:var(--text-muted)"><strong>Original:</strong> ${c.asesorOriginal}</span>` : '';
    return `
      <div class="client-card">
        <div class="client-info">
          <div class="client-name">${c.apellido}, ${c.nombre}</div>
          <div class="client-meta">${fecha}${comitente}${asesorMeta}${originalMeta}</div>
        </div>
        <div class="client-badges">
          ${derivadoBadge}${perfilBadge}${reasigBadge}${reunionBadge}
          ${c.usuarioC ? '<span class="badge badge-check-si">Usuario/C ✓</span>' : ''}
          ${c.cOrdenes ? '<span class="badge badge-check-si">C Órdenes ✓</span>' : ''}
          <button class="btn-edit" onclick="editClient('${c.id}')">Editar</button>
        </div>
      </div>`;
  }).join('');
}

function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// --- Sub-tabs sync ---
function updateSubTabs() {
  ['gallo', 'fernanda'].forEach(team => {
    const container = document.getElementById('subtabs-' + team);
    if (!container) return;
    const advisors = state.advisors['equipo-' + team] || [];
    const existing = Array.from(container.querySelectorAll('.sub-tab-btn[data-advisor]')).map(b => b.dataset.advisor);
    advisors.forEach(a => {
      if (!existing.includes(a)) {
        const btn = document.createElement('button');
        btn.className = 'sub-tab-btn';
        btn.dataset.team = team;
        btn.dataset.advisor = a;
        btn.textContent = a;
        btn.onclick = function() { switchSubTab(this, team); };
        container.appendChild(btn);
      }
    });
  });
}

// --- Modal ---
function openModal(team) {
  state.currentTeam = team;
  state.editingId = null;
  document.getElementById('modal-title-text').textContent = 'Nuevo cliente';
  clearForm();
  populateAsesorSelect(team);
  document.getElementById('modal-cliente').classList.add('open');
}

function editClient(id) {
  const c = state.clients.find(x => x.id === id);
  if (!c) return;
  state.editingId = id;
  state.currentTeam = c.team;
  document.getElementById('modal-title-text').textContent = 'Editar cliente';
  document.getElementById('field-nombre').value = c.nombre || '';
  document.getElementById('field-apellido').value = c.apellido || '';
  document.getElementById('field-fecha').value = c.fecha || '';
  document.getElementById('field-comitente').value = c.comitente || '';
  document.getElementById('field-obs').value = c.obs || '';
  document.getElementById('field-usuario-c').checked = c.usuarioC || false;
  document.getElementById('field-c-ordenes').checked = c.cOrdenes || false;
  populateAsesorSelect(c.team, c.asesor);
  const origEl = document.getElementById('field-asesor-original');
  const origGroup = document.getElementById('group-asesor-original');
  const derivarGroup = document.getElementById('group-derivar');
  if (c.asesorOriginal) {
    origEl.value = c.asesorOriginal;
    origGroup.style.display = '';
  }
  if (c.team !== 'mis-clientes' && c.team !== 'equipo-fernanda') {
    derivarGroup.style.display = '';
  } else {
    derivarGroup.style.display = 'none';
  }
  if (c.reasignacion) {
    const r = document.querySelector(`input[name="reasignacion"][value="${c.reasignacion}"]`);
    if (r) r.checked = true;
  }
  if (c.perfil) {
    const p = document.querySelector(`input[name="perfil"][value="${c.perfil}"]`);
    if (p) p.checked = true;
  }
  if (c.reunion) {
    const re = document.querySelector(`input[name="reunion"][value="${c.reunion}"]`);
    if (re) re.checked = true;
  }
  document.getElementById('modal-cliente').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-cliente').classList.remove('open');
  state.editingId = null;
}

function clearForm() {
  ['field-nombre','field-apellido','field-fecha','field-comitente','field-obs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('field-usuario-c').checked = false;
  document.getElementById('field-c-ordenes').checked = false;
  document.getElementById('field-asesor-original').value = '';
  document.getElementById('group-asesor-original').style.display = 'none';
  document.getElementById('group-derivar').style.display = 'none';
  document.querySelectorAll('input[name="reasignacion"]').forEach(r => r.checked = r.value === 'propio');
  document.querySelectorAll('input[name="perfil"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="reunion"]').forEach(r => r.checked = false);
}

function populateAsesorSelect(team, selected) {
  const sel = document.getElementById('field-asesor');
  const advisors = state.advisors[team] || [];
  if (team === 'mis-clientes') {
    sel.closest('.form-group').style.display = 'none';
    return;
  }
  sel.closest('.form-group').style.display = '';
  sel.innerHTML = '<option value="">— Seleccionar —</option>' +
    advisors.map(a => `<option value="${a}" ${selected === a ? 'selected' : ''}>${a}</option>`).join('');
}

async function saveClient() {
  const nombre = document.getElementById('field-nombre').value.trim();
  const apellido = document.getElementById('field-apellido').value.trim();
  if (!nombre || !apellido) { alert('Nombre y apellido son obligatorios.'); return; }

  const existing = state.editingId ? state.clients.find(c => c.id === state.editingId) : null;

  const data = {
    id: state.editingId || null,
    team: state.currentTeam,
    nombre,
    apellido,
    fecha: document.getElementById('field-fecha').value,
    comitente: document.getElementById('field-comitente').value.trim(),
    asesor: document.getElementById('field-asesor').value,
    asesorOriginal: existing
      ? (existing.asesorOriginal || document.getElementById('field-asesor').value)
      : document.getElementById('field-asesor').value,
    reasignacion: document.querySelector('input[name="reasignacion"]:checked')?.value || 'no',
    perfil: document.querySelector('input[name="perfil"]:checked')?.value || '',
    reunion: document.querySelector('input[name="reunion"]:checked')?.value || '',
    obs: document.getElementById('field-obs').value.trim(),
    usuarioC: document.getElementById('field-usuario-c').checked,
    cOrdenes: document.getElementById('field-c-ordenes').checked,
    derivado: existing ? (existing.derivado || false) : false
  };

  const row = clientToRow(data);

  if (state.editingId) {
    const { error } = await supabaseClient.from('clientes').update(row).eq('id', state.editingId);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    const idx = state.clients.findIndex(c => c.id === state.editingId);
    if (idx !== -1) state.clients[idx] = { ...data, id: state.editingId };
  } else {
    const { data: inserted, error } = await supabaseClient.from('clientes').insert(row).select().single();
    if (error) { alert('Error al guardar: ' + error.message); return; }
    state.clients.push(rowToClient(inserted));
  }

  closeModal();
  renderAll();
}

// --- Add advisor ---
function openAddAdvisorModal(team) {
  state.addAdvisorTeam = team;
  document.getElementById('advisor-nombre').value = '';
  document.getElementById('advisor-rol').value = '';
  document.getElementById('modal-asesor').classList.add('open');
}

function closeAdvisorModal() {
  document.getElementById('modal-asesor').classList.remove('open');
}

async function saveAdvisor() {
  const nombre = document.getElementById('advisor-nombre').value.trim();
  const rol = document.getElementById('advisor-rol').value.trim();
  if (!nombre) { alert('El nombre es obligatorio.'); return; }
  const teamKey = 'equipo-' + state.addAdvisorTeam;

  if (!state.advisors[teamKey].includes(nombre)) {
    const { error } = await supabaseClient.from('advisors').insert({ team: teamKey, nombre, rol: rol || null });
    if (error) { alert('Error al agregar asesor: ' + error.message); return; }
    state.advisors[teamKey].push(nombre);
    updateSubTabs();
  }
  closeAdvisorModal();
}

// --- Exportar / Importar CSV ---
// Columnas del CSV: encabezado visible -> clave interna del cliente.
const CSV_COLUMNS = [
  { header: 'Comitente', key: 'comitente' },
  { header: 'Nombre', key: 'nombre' },
  { header: 'Apellido', key: 'apellido' },
  { header: 'Fecha apertura (AAAA-MM-DD)', key: 'fecha' },
  { header: 'Asesor', key: 'asesor' },
  { header: 'Reasignacion', key: 'reasignacion' },
  { header: 'Perfil', key: 'perfil' },
  { header: 'Reunion', key: 'reunion' },
  { header: 'Observaciones', key: 'obs' },
  { header: 'Sub panel', key: 'sub_panel' },
  { header: 'Asesor original', key: 'asesorOriginal' },
  { header: 'Derivado (si/no)', key: 'derivado', bool: true },
  { header: 'Usuario C (si/no)', key: 'usuarioC', bool: true },
  { header: 'C Ordenes (si/no)', key: 'cOrdenes', bool: true },
];

function exportTeamCsv(team) {
  const clients = state.clients.filter(c => c.team === team)
    .slice()
    .sort((a, b) => (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre, 'es'));

  const rows = clients.map(c => {
    const row = {};
    CSV_COLUMNS.forEach(col => {
      const val = c[col.key];
      row[col.header] = col.bool ? (val ? 'si' : 'no') : (val || '');
    });
    return row;
  });

  const csv = Papa.unparse({ fields: CSV_COLUMNS.map(c => c.header), data: rows });
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${team}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let importState = { team: null, toInsert: [], toUpdate: [] };

function triggerImport(team) {
  importState.team = team;
  document.getElementById('import-file-input').value = '';
  document.getElementById('import-file-input').click();
}

function csvBoolToJs(v) {
  const s = (v || '').toString().trim().toLowerCase();
  return s === 'si' || s === 'sí' || s === 'true' || s === '1';
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      buildImportPreview(results.data);
    },
    error: (err) => {
      alert('Error al leer el CSV: ' + err.message);
    }
  });
}

function buildImportPreview(rows) {
  const team = importState.team;
  const toInsert = [];
  const toUpdate = []; // { existing, incoming, changes: [{label, before, after}] }

  rows.forEach(row => {
    const incoming = {};
    CSV_COLUMNS.forEach(col => {
      const raw = (row[col.header] !== undefined ? row[col.header] : '').toString().trim();
      incoming[col.key] = col.bool ? csvBoolToJs(raw) : raw;
    });

    if (!incoming.nombre && !incoming.apellido && !incoming.comitente) return; // fila vacía

    const comitente = (incoming.comitente || '').trim();
    const existing = comitente ? state.clients.find(c => (c.comitente || '').trim() === comitente) : null;

    if (!existing) {
      toInsert.push({ team, ...incoming });
      return;
    }

    const changes = [];
    CSV_COLUMNS.forEach(col => {
      const before = existing[col.key];
      const after = incoming[col.key];
      const beforeNorm = col.bool ? !!before : (before || '');
      const afterNorm = col.bool ? !!after : (after || '');
      if (beforeNorm !== afterNorm) {
        changes.push({
          label: col.header,
          before: col.bool ? (beforeNorm ? 'sí' : 'no') : (beforeNorm || '—'),
          after: col.bool ? (afterNorm ? 'sí' : 'no') : (afterNorm || '—')
        });
      }
    });

    if (changes.length > 0) {
      toUpdate.push({ existing, incoming, changes });
    }
  });

  importState.toInsert = toInsert;
  importState.toUpdate = toUpdate;
  renderImportPreview();
  document.getElementById('modal-import').classList.add('open');
}

function renderImportPreview() {
  const { toInsert, toUpdate } = importState;
  const summaryEl = document.getElementById('import-summary');
  const previewEl = document.getElementById('import-preview');
  const confirmBtn = document.getElementById('btn-confirm-import');

  summaryEl.textContent = `${toInsert.length} clientes nuevos · ${toUpdate.length} clientes con cambios para actualizar.`;
  confirmBtn.disabled = (toInsert.length === 0 && toUpdate.length === 0);

  if (toInsert.length === 0 && toUpdate.length === 0) {
    previewEl.innerHTML = `<div class="empty-state"><div class="icon">📋</div><div>No hay clientes nuevos ni cambios para importar.</div></div>`;
    return;
  }

  let html = '';

  toInsert.forEach(c => {
    html += `
      <div class="client-card" style="cursor:default;">
        <div class="client-info">
          <div class="client-name">${c.apellido || ''}, ${c.nombre || ''} <span class="badge badge-propio" style="margin-left:6px;">Nuevo</span></div>
          <div class="client-meta"><span class="meta-item"><strong>Comitente:</strong> ${c.comitente || '—'}</span></div>
        </div>
      </div>`;
  });

  toUpdate.forEach(({ existing, changes }) => {
    const changesHtml = changes.map(ch =>
      `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;"><strong>${ch.label}:</strong> ${ch.before} → ${ch.after}</div>`
    ).join('');
    html += `
      <div class="client-card" style="cursor:default;flex-direction:column;align-items:flex-start;">
        <div class="client-name">${existing.apellido}, ${existing.nombre} <span class="badge badge-reasignado" style="margin-left:6px;">Actualizar</span></div>
        <div class="client-meta" style="margin-bottom:2px;"><span class="meta-item"><strong>Comitente:</strong> ${existing.comitente || '—'}</span></div>
        ${changesHtml}
      </div>`;
  });

  previewEl.innerHTML = html;
}

function closeImportModal() {
  document.getElementById('modal-import').classList.remove('open');
  importState = { team: null, toInsert: [], toUpdate: [] };
}

async function confirmImport() {
  const { toInsert, toUpdate } = importState;
  const confirmBtn = document.getElementById('btn-confirm-import');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Importando...';

  try {
    if (toInsert.length > 0) {
      const rows = toInsert.map(clientToRow);
      const { data: inserted, error } = await supabaseClient.from('clientes').insert(rows).select();
      if (error) { alert('Error al crear clientes: ' + error.message); return; }
      inserted.forEach(row => state.clients.push(rowToClient(row)));
    }

    for (const { existing, incoming } of toUpdate) {
      const merged = { ...existing, ...incoming };
      const row = clientToRow(merged);
      const { error } = await supabaseClient.from('clientes').update(row).eq('id', existing.id);
      if (error) { alert(`Error al actualizar a ${existing.apellido}, ${existing.nombre}: ` + error.message); return; }
      Object.assign(existing, incoming);
    }

    closeImportModal();
    renderAll();
    alert('Importación completada.');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmar importación';
  }
}

// --- Init ---
(async function init() {
  const user = await requireSession();
  if (!user) return;
  document.getElementById('userEmail').textContent = user.email;

  await Promise.all([loadClients(), loadAdvisors()]);
  renderAll();
})();
