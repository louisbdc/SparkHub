#!/usr/bin/env node
/**
 * FlowSync — API Test Suite
 * Simule un client frontend et teste toutes les routes du backend.
 *
 * Usage : node test-api.js [BASE_URL]
 * Défaut : http://localhost:5000
 *
 * Requiert Node.js 18+ (fetch natif)
 */

const BASE_URL = process.argv[2] || 'http://localhost:5000'

// ─── Couleurs ─────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  green: '\x1b[32m',
  red:   '\x1b[31m',
  yellow:'\x1b[33m',
  cyan:  '\x1b[36m',
  gray:  '\x1b[90m',
}

const ok   = (msg) => `${C.green}✔${C.reset}  ${msg}`
const fail = (msg) => `${C.red}✖${C.reset}  ${msg}`
const info = (msg) => `${C.cyan}→${C.reset}  ${msg}`
const dim  = (msg) => `${C.gray}${msg}${C.reset}`

// ─── Compteurs ────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0

// ─── État partagé entre les tests ─────────────────────────────────────────────
const state = {
  devToken:    null,
  clientToken: null,
  devId:       null,
  clientId:    null,
  workspaceId: null,
  ticket1Id:   null,
  ticket2Id:   null,
  commentId:   null,
}

// ─── Helpers HTTP ─────────────────────────────────────────────────────────────
async function request(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))
  return { status: res.status, body: json }
}

const get    = (path, opts)       => request('GET',    path, opts)
const post   = (path, body, opts) => request('POST',   path, { body, ...opts })
const patch  = (path, body, opts) => request('PATCH',  path, { body, ...opts })
const del    = (path, opts)       => request('DELETE', path, opts)

// ─── Runner de tests ──────────────────────────────────────────────────────────
async function test(name, fn) {
  try {
    await fn()
    process.stdout.write(`  ${ok(name)}\n`)
    passed++
  } catch (e) {
    process.stdout.write(`  ${fail(name)}\n`)
    process.stdout.write(`     ${C.red}${e.message}${C.reset}\n`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertStatus(res, expected, context = '') {
  assert(
    res.status === expected,
    `${context} — Status attendu ${expected}, reçu ${res.status}. Body: ${JSON.stringify(res.body)}`
  )
}

function assertSuccess(res, context = '') {
  assert(
    res.body.success === true,
    `${context} — success:false. Body: ${JSON.stringify(res.body)}`
  )
}

function assertField(obj, path, context = '') {
  const value = path.split('.').reduce((o, k) => o?.[k], obj)
  assert(value !== undefined && value !== null, `${context} — champ manquant: "${path}"`)
}

function section(title) {
  process.stdout.write(`\n${C.bold}${C.cyan}── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}${C.reset}\n`)
}

// ─── SECTION 1 : Health ───────────────────────────────────────────────────────
async function testHealth() {
  section('Health')

  await test('GET /health → 200', async () => {
    const res = await get('/health')
    assertStatus(res, 200, 'Health check')
    assertSuccess(res)
    assertField(res.body.data, 'status')
    assert(res.body.data.status === 'ok', 'status doit être "ok"')
  })

  await test('GET /api/route-inconnue → 404', async () => {
    const res = await get('/api/route-qui-nexiste-pas')
    assertStatus(res, 404)
    assert(res.body.success === false)
  })
}

// ─── SECTION 2 : Auth ─────────────────────────────────────────────────────────
async function testAuth() {
  section('Auth — register / login')

  await test('POST /api/auth/register — dev user', async () => {
    const res = await post('/api/auth/register', {
      name:  'Alice Dev',
      email: `dev_${Date.now()}@flowsync.test`,
      password: 'DevPass123!',
      role: 'dev',
    })
    assertStatus(res, 201, 'register dev')
    assertField(res.body.data, 'token')
    assertField(res.body.data, 'user._id')
    assert(res.body.data.user.role === 'dev', 'role doit être dev')
    assert(!res.body.data.user.password, 'password ne doit pas être retourné')
    state.devToken = res.body.data.token
    state.devId    = res.body.data.user._id
  })

  await test('POST /api/auth/register — client user', async () => {
    const res = await post('/api/auth/register', {
      name:  'Bob Client',
      email: `client_${Date.now()}@flowsync.test`,
      password: 'ClientPass123!',
      role: 'client',
    })
    assertStatus(res, 201, 'register client')
    state.clientToken = res.body.data.token
    state.clientId    = res.body.data.user._id
  })

  await test('POST /api/auth/register — email dupliqué → 409', async () => {
    const email = `dup_${Date.now()}@flowsync.test`
    await post('/api/auth/register', { name: 'X', email, password: 'Pass1234!', role: 'client' })
    const res = await post('/api/auth/register', { name: 'X', email, password: 'Pass1234!', role: 'client' })
    assertStatus(res, 409)
    assert(res.body.success === false)
  })

  await test('POST /api/auth/register — body invalide → 400', async () => {
    const res = await post('/api/auth/register', { name: 'X', email: 'pas-un-email', password: '123' })
    assertStatus(res, 400)
  })

  await test('POST /api/auth/login — mauvais mot de passe → 401', async () => {
    const res = await post('/api/auth/login', {
      email: 'dev_0@flowsync.test',
      password: 'mauvais',
    })
    assertStatus(res, 401)
  })

  await test('GET /api/auth/me — authentifié', async () => {
    const res = await get('/api/auth/me', { token: state.devToken })
    assertStatus(res, 200)
    assertField(res.body.data, 'user._id')
    assert(res.body.data.user._id === state.devId)
  })

  await test('GET /api/auth/me — sans token → 401', async () => {
    const res = await get('/api/auth/me')
    assertStatus(res, 401)
  })

  await test('GET /api/auth/me — token invalide → 401', async () => {
    const res = await get('/api/auth/me', { token: 'eyJhbGciOiJIUzI1NiJ9.invalide.invalide' })
    assertStatus(res, 401)
  })

  await test('PATCH /api/auth/me — mise à jour du nom', async () => {
    const res = await patch('/api/auth/me', { name: 'Alice Dev Updated' }, { token: state.devToken })
    assertStatus(res, 200)
    assert(res.body.data.user.name === 'Alice Dev Updated')
  })
}

// ─── SECTION 3 : Workspaces ───────────────────────────────────────────────────
async function testWorkspaces() {
  section('Workspaces')

  await test('POST /api/workspaces — créer un workspace', async () => {
    const res = await post(
      '/api/workspaces',
      { name: `Projet Test ${Date.now()}`, description: 'Workspace de test', color: '#6366f1' },
      { token: state.devToken }
    )
    assertStatus(res, 201)
    assertField(res.body.data, 'workspace._id')
    assertField(res.body.data, 'workspace.slug')
    assertField(res.body.data, 'workspace.owner')
    state.workspaceId = res.body.data.workspace._id
  })

  await test('POST /api/workspaces — nom trop court → 400', async () => {
    const res = await post('/api/workspaces', { name: 'X' }, { token: state.devToken })
    assertStatus(res, 400)
  })

  await test('POST /api/workspaces — sans token → 401', async () => {
    const res = await post('/api/workspaces', { name: 'No Auth Workspace' })
    assertStatus(res, 401)
  })

  await test('GET /api/workspaces — liste des workspaces', async () => {
    const res = await get('/api/workspaces', { token: state.devToken })
    assertStatus(res, 200)
    assert(Array.isArray(res.body.data.workspaces), 'workspaces doit être un tableau')
    assert(res.body.meta.total >= 1, 'au moins 1 workspace')
  })

  await test('GET /api/workspaces/:id — détail', async () => {
    const res = await get(`/api/workspaces/${state.workspaceId}`, { token: state.devToken })
    assertStatus(res, 200)
    assertField(res.body.data, 'workspace.members')
    assertField(res.body.data, 'workspace.owner.name')
  })

  await test('GET /api/workspaces/:id — client sans accès → 403', async () => {
    const res = await get(`/api/workspaces/${state.workspaceId}`, { token: state.clientToken })
    assertStatus(res, 403)
  })

  await test('GET /api/workspaces/id-inexistant → 404', async () => {
    const res = await get('/api/workspaces/000000000000000000000000', { token: state.devToken })
    assertStatus(res, 404)
  })

  await test('PATCH /api/workspaces/:id — mise à jour', async () => {
    const res = await patch(
      `/api/workspaces/${state.workspaceId}`,
      { name: 'Projet Test Renommé', color: '#10b981' },
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.workspace.color === '#10b981')
  })

  await test('POST /api/workspaces/:id/members — ajouter le client', async () => {
    const res = await post(
      `/api/workspaces/${state.workspaceId}/members`,
      { userId: state.clientId, role: 'client' },
      { token: state.devToken }
    )
    assertStatus(res, 200)
    const members = res.body.data.workspace.members
    assert(members.some((m) => m.user._id === state.clientId), 'clientId doit être dans members')
  })

  await test('GET /api/workspaces/:id — client maintenant membre → 200', async () => {
    const res = await get(`/api/workspaces/${state.workspaceId}`, { token: state.clientToken })
    assertStatus(res, 200)
  })

  await test('POST /api/workspaces/:id/members — membre déjà présent → 409', async () => {
    const res = await post(
      `/api/workspaces/${state.workspaceId}/members`,
      { userId: state.clientId, role: 'client' },
      { token: state.devToken }
    )
    assertStatus(res, 409)
  })
}

// ─── SECTION 4 : Tickets ──────────────────────────────────────────────────────
async function testTickets() {
  section('Tickets')

  await test('POST /tickets — créer ticket bug (priorité high)', async () => {
    const res = await post(
      `/api/workspaces/${state.workspaceId}/tickets`,
      {
        title:       'Crash sur la page panier mobile',
        description: 'Reproduit sur Safari iOS 17. JS error: undefined is not a function.',
        status:      'todo',
        priority:    'high',
        type:        'bug',
        assignee:    state.devId,
      },
      { token: state.devToken }
    )
    assertStatus(res, 201)
    assertField(res.body.data, 'ticket._id')
    assertField(res.body.data, 'ticket.reporter.name')
    assertField(res.body.data, 'ticket.assignee.name')
    assert(res.body.data.ticket.status === 'todo')
    assert(res.body.data.ticket.type === 'bug')
    state.ticket1Id = res.body.data.ticket._id
  })

  await test('POST /tickets — créer ticket feature (backlog)', async () => {
    const res = await post(
      `/api/workspaces/${state.workspaceId}/tickets`,
      {
        title:    'Ajouter export PDF des factures',
        priority: 'medium',
        type:     'feature',
      },
      { token: state.clientToken }
    )
    assertStatus(res, 201)
    assert(res.body.data.ticket.status === 'backlog', 'status par défaut = backlog')
    state.ticket2Id = res.body.data.ticket._id
  })

  await test('POST /tickets — titre trop court → 400', async () => {
    const res = await post(
      `/api/workspaces/${state.workspaceId}/tickets`,
      { title: 'Ab', type: 'task' },
      { token: state.devToken }
    )
    assertStatus(res, 400)
  })

  await test('POST /tickets — status invalide → 400', async () => {
    const res = await post(
      `/api/workspaces/${state.workspaceId}/tickets`,
      { title: 'Ticket valide', status: 'invalid_status' },
      { token: state.devToken }
    )
    assertStatus(res, 400)
  })

  await test('GET /tickets — liste avec pagination', async () => {
    const res = await get(
      `/api/workspaces/${state.workspaceId}/tickets?page=1&limit=10`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(Array.isArray(res.body.data.tickets))
    assert(res.body.data.tickets.length >= 2)
    assert(res.body.meta.total >= 2)
  })

  await test('GET /tickets — filtre par status', async () => {
    const res = await get(
      `/api/workspaces/${state.workspaceId}/tickets?status=todo`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.tickets.every((t) => t.status === 'todo'), 'tous les tickets doivent être "todo"')
  })

  await test('GET /tickets — filtre par priority', async () => {
    const res = await get(
      `/api/workspaces/${state.workspaceId}/tickets?priority=high`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.tickets.every((t) => t.priority === 'high'))
  })

  await test('GET /tickets — filtre assignee=me', async () => {
    const res = await get(
      `/api/workspaces/${state.workspaceId}/tickets?assignee=me`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.tickets.every((t) => t.assignee?._id === state.devId))
  })

  await test('GET /tickets/:id — détail complet', async () => {
    const res = await get(
      `/api/workspaces/${state.workspaceId}/tickets/${state.ticket1Id}`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assertField(res.body.data, 'ticket.reporter')
    assertField(res.body.data, 'ticket.attachments')
  })

  await test('GET /tickets/id-inexistant → 404', async () => {
    const res = await get(
      `/api/workspaces/${state.workspaceId}/tickets/000000000000000000000000`,
      { token: state.devToken }
    )
    assertStatus(res, 404)
  })

  await test('PATCH /tickets/:id — mise à jour description + priorité', async () => {
    const res = await patch(
      `/api/workspaces/${state.workspaceId}/tickets/${state.ticket1Id}`,
      { description: 'Description mise à jour', priority: 'urgent' },
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.ticket.priority === 'urgent')
    assert(res.body.data.ticket.description === 'Description mise à jour')
  })

  await test('PATCH /tickets/:id/status — simuler drag-and-drop → in_progress', async () => {
    const res = await patch(
      `/api/workspaces/${state.workspaceId}/tickets/${state.ticket1Id}/status`,
      { status: 'in_progress', order: 0 },
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.ticket.status === 'in_progress')
    assert(res.body.data.ticket.order === 0)
  })

  await test('PATCH /tickets/:id/status — status invalide → 400', async () => {
    const res = await patch(
      `/api/workspaces/${state.workspaceId}/tickets/${state.ticket1Id}/status`,
      { status: 'non_existant' },
      { token: state.devToken }
    )
    assertStatus(res, 400)
  })

  await test('PATCH /tickets/:id/status — simuler DnD complet backlog→todo→review→done', async () => {
    const steps = ['todo', 'review', 'done']
    for (const status of steps) {
      const res = await patch(
        `/api/workspaces/${state.workspaceId}/tickets/${state.ticket2Id}/status`,
        { status },
        { token: state.clientToken }
      )
      assertStatus(res, 200, `DnD → ${status}`)
      assert(res.body.data.ticket.status === status, `status doit être ${status}`)
    }
  })
}

// ─── SECTION 5 : Files (GridFS) ───────────────────────────────────────────────
async function testFiles() {
  section('Files (GridFS)')

  await test('GET /api/files/id-invalide → 400', async () => {
    const res = await get('/api/files/pas-un-objectid', { token: state.devToken })
    assertStatus(res, 400)
  })

  await test('GET /api/files/objectid-inexistant → 404', async () => {
    const res = await get('/api/files/000000000000000000000000', { token: state.devToken })
    assertStatus(res, 404)
  })

  await test('GET /api/files/:id — sans token → 401', async () => {
    const res = await get('/api/files/000000000000000000000000')
    assertStatus(res, 401)
  })

  await test('DELETE /api/files/id-invalide → 400', async () => {
    const res = await del('/api/files/not-an-id', { token: state.devToken })
    assertStatus(res, 400)
  })

  await test('DELETE /api/files/objectid-inexistant → 404', async () => {
    const res = await del('/api/files/000000000000000000000000', { token: state.devToken })
    assertStatus(res, 404)
  })
}

// ─── SECTION 6 : Comments ─────────────────────────────────────────────────────
async function testComments() {
  section('Comments')

  await test('POST /comments — créer un commentaire (dev)', async () => {
    const res = await post(
      `/api/tickets/${state.workspaceId}/${state.ticket1Id}/comments`,
      { content: 'Reproduit le bug. Commit de fix en cours sur la branche fix/cart-mobile.' },
      { token: state.devToken }
    )
    assertStatus(res, 201)
    assertField(res.body.data, 'comment._id')
    assertField(res.body.data, 'comment.author.name')
    assert(res.body.data.comment.isEdited === false)
    state.commentId = res.body.data.comment._id
  })

  await test('POST /comments — créer un commentaire (client)', async () => {
    const res = await post(
      `/api/tickets/${state.workspaceId}/${state.ticket1Id}/comments`,
      { content: 'Merci pour le suivi ! Confirme le bug de mon côté aussi sur Android.' },
      { token: state.clientToken }
    )
    assertStatus(res, 201)
  })

  await test('POST /comments — contenu vide → 400', async () => {
    const res = await post(
      `/api/tickets/${state.workspaceId}/${state.ticket1Id}/comments`,
      { content: '' },
      { token: state.devToken }
    )
    assertStatus(res, 400)
  })

  await test('POST /comments — ticket inexistant → 404', async () => {
    const res = await post(
      `/api/tickets/${state.workspaceId}/000000000000000000000000/comments`,
      { content: 'Commentaire orphelin' },
      { token: state.devToken }
    )
    assertStatus(res, 404)
  })

  await test('GET /comments — liste chronologique', async () => {
    const res = await get(
      `/api/tickets/${state.workspaceId}/${state.ticket1Id}/comments`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    const comments = res.body.data.comments
    assert(Array.isArray(comments))
    assert(comments.length >= 2)
    // Vérifie l'ordre chronologique
    if (comments.length >= 2) {
      const t1 = new Date(comments[0].createdAt)
      const t2 = new Date(comments[1].createdAt)
      assert(t1 <= t2, 'commentaires doivent être triés par date croissante')
    }
    assertField(comments[0], 'author.name')
  })

  await test('PATCH /comments/:id — modifier son commentaire', async () => {
    const res = await patch(
      `/api/tickets/${state.workspaceId}/${state.ticket1Id}/comments/${state.commentId}`,
      { content: 'Fix déployé sur la branche fix/cart-mobile — PR #42 ouverte.' },
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.comment.isEdited === true, 'isEdited doit être true')
    assert(res.body.data.comment.editedAt !== null, 'editedAt doit être renseigné')
    assert(res.body.data.comment.content.includes('PR #42'))
  })

  await test('PATCH /comments/:id — modifier le commentaire d\'un autre → 403', async () => {
    const res = await patch(
      `/api/tickets/${state.workspaceId}/${state.ticket1Id}/comments/${state.commentId}`,
      { content: 'Tentative de hijack' },
      { token: state.clientToken }
    )
    assertStatus(res, 403)
  })
}

// ─── SECTION 6 : Suppression & archivage ──────────────────────────────────────
async function testDeletion() {
  section('Suppression & Archivage')

  await test('DELETE /comments/:id — supprimer son commentaire', async () => {
    const res = await del(
      `/api/tickets/${state.workspaceId}/${state.ticket1Id}/comments/${state.commentId}`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.message.includes('deleted'))
  })

  await test('DELETE /tickets/:id — non-reporter → 403', async () => {
    // clientToken ne peut pas supprimer le ticket créé par devToken
    const res = await del(
      `/api/workspaces/${state.workspaceId}/tickets/${state.ticket1Id}`,
      { token: state.clientToken }
    )
    assertStatus(res, 403)
  })

  await test('DELETE /tickets/:id — reporter peut supprimer', async () => {
    const res = await del(
      `/api/workspaces/${state.workspaceId}/tickets/${state.ticket1Id}`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.message.includes('deleted'))
  })

  await test('GET /tickets/:id — ticket supprimé → 404', async () => {
    const res = await get(
      `/api/workspaces/${state.workspaceId}/tickets/${state.ticket1Id}`,
      { token: state.devToken }
    )
    assertStatus(res, 404)
  })

  await test('DELETE /workspaces/:id/members/:uid — retirer le client', async () => {
    const res = await del(
      `/api/workspaces/${state.workspaceId}/members/${state.clientId}`,
      { token: state.devToken }
    )
    assertStatus(res, 200)
    const members = res.body.data.workspace.members
    assert(!members.some((m) => m.user._id === state.clientId), 'client doit être retiré')
  })

  await test('PATCH /workspaces/:id/archive — archiver le workspace', async () => {
    const res = await patch(
      `/api/workspaces/${state.workspaceId}/archive`,
      {},
      { token: state.devToken }
    )
    assertStatus(res, 200)
    assert(res.body.data.workspace.isArchived === true)
  })

  await test('GET /workspaces/:id — workspace archivé → 403', async () => {
    const res = await get(`/api/workspaces/${state.workspaceId}`, { token: state.clientToken })
    // Le client n'est plus membre, et le workspace est archivé
    assertStatus(res, 403)
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  process.stdout.write(`\n${C.bold}FlowSync — API Test Suite${C.reset}\n`)
  process.stdout.write(`${dim(`Base URL : ${BASE_URL}`)}\n`)
  process.stdout.write(`${dim(`Date     : ${new Date().toISOString()}`)}\n`)

  // Vérifie que le serveur répond
  try {
    await fetch(`${BASE_URL}/health`)
  } catch {
    process.stdout.write(`\n${C.red}${C.bold}✖ Serveur injoignable sur ${BASE_URL}${C.reset}\n`)
    process.stdout.write(`${C.yellow}  Lance d'abord : ./start.sh${C.reset}\n\n`)
    process.exit(1)
  }

  await testHealth()
  await testAuth()
  await testWorkspaces()
  await testTickets()
  await testFiles()
  await testComments()
  await testDeletion()

  // ─── Résumé ────────────────────────────────────────────────────────────────
  const total = passed + failed
  const allPassed = failed === 0

  process.stdout.write(`\n${'─'.repeat(55)}\n`)
  process.stdout.write(`${C.bold}Résultats : ${total} tests${C.reset}\n`)
  process.stdout.write(`  ${C.green}${C.bold}${passed} passés${C.reset}\n`)

  if (failed > 0) {
    process.stdout.write(`  ${C.red}${C.bold}${failed} échoués${C.reset}\n`)
  }

  process.stdout.write(`\n`)

  if (allPassed) {
    process.stdout.write(`${C.green}${C.bold}✔ Tous les tests sont passés.${C.reset}\n\n`)
  } else {
    process.stdout.write(`${C.red}${C.bold}✖ Des tests ont échoué.${C.reset}\n\n`)
    process.exit(1)
  }
}

main().catch((err) => {
  process.stderr.write(`${C.red}Erreur inattendue : ${err.message}${C.reset}\n`)
  process.exit(1)
})
