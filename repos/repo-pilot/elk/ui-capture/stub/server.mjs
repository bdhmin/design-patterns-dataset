// Minimal local Mastodon API stub for Elk ("Harbor Social"). Serves REST JSON in Mastodon's
// snake_case format with Link-header pagination, plus avatars/photos from ./media.
// Usage: node server.mjs [port]   (default 4410)
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { instanceV2, ORIGIN, TOKEN } from './core.mjs'
import { buildDb, cmp, render, snowflake } from './seed.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.argv[2] || process.env.STUB_PORT || 4410)
const db = buildDb()
const { me } = db
const DAY = 86400e3

// ---------- helpers ----------
const snake = k => k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
function toSnake(v) {
  if (Array.isArray(v))
    return v.map(toSnake)
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, val] of Object.entries(v)) o[snake(k)] = toSnake(val)
    return o
  }
  return v
}
const all = () => [...db.statuses.values()]
const desc = arr => arr.slice().sort((a, b) => cmp(b.id, a.id))
const relOf = id => db.rel.get(id) || { id, following: false, showingReblogs: false, notifying: false, followedBy: false, blocking: false, blockedBy: false, muting: false, mutingNotifications: false, requested: false, requestedBy: false, domainBlocking: false, endorsed: false, note: '', languages: null }
const isFollowing = id => id === me.id || relOf(id).following
const visibleInHome = s => isFollowing(s.account.id) && s.visibility !== 'direct' && (!s.inReplyToAccountId || isFollowing(s.inReplyToAccountId))
const statusOf = id => db.statuses.get(id)

function paginate(items, q, pathname, res) {
  // items sorted newest first, each having .id (snowflake-ish)
  const limit = Math.min(Number(q.get('limit') || 20), 80)
  let list = items
  const maxId = q.get('max_id')
  const sinceId = q.get('since_id')
  const minId = q.get('min_id')
  if (maxId)
    list = list.filter(x => cmp(x.id, maxId) < 0)
  if (sinceId)
    list = list.filter(x => cmp(x.id, sinceId) > 0)
  if (minId) {
    list = list.filter(x => cmp(x.id, minId) > 0)
    list = list.slice(-limit)
  }
  else {
    list = list.slice(0, limit)
  }
  if (list.length) {
    const base = new URL(pathname, ORIGIN)
    for (const [k, v] of q) {
      if (!['max_id', 'since_id', 'min_id'].includes(k))
        base.searchParams.append(k, v)
    }
    const next = new URL(base)
    next.searchParams.set('max_id', list[list.length - 1].id)
    const prev = new URL(base)
    prev.searchParams.set('min_id', list[0].id)
    res.setHeader('Link', `<${next}>; rel="next", <${prev}>; rel="prev"`)
  }
  return list
}

function tagEntity(name) {
  const lower = name.toLowerCase()
  const uses = db.tagUse.get(lower) || 0
  const history = []
  for (let d = 0; d < 7; d++) {
    const day = Math.floor((db.now - d * DAY) / DAY) * 86400
    const h = [...lower].reduce((a, c) => a + c.charCodeAt(0), 0)
    const u = Math.max(0, Math.round((uses + 2) * (3 + ((h + d * 7) % 11)) / (d + 1)))
    history.push({ day: String(day), uses: String(u), accounts: String(Math.max(1, Math.round(u * 0.7))) })
  }
  const display = db.trendingTags.concat(db.followedTags).find(t => t.toLowerCase() === lower) || name
  return { name: display, url: `${ORIGIN}/tags/${display}`, history, following: db.followedTags.some(t => t.toLowerCase() === lower), featuring: false }
}

function contextOf(status) {
  const ancestors = []
  let cur = status
  while (cur.inReplyToId && statusOf(cur.inReplyToId)) {
    cur = statusOf(cur.inReplyToId)
    ancestors.unshift(cur)
  }
  const descendants = []
  const walk = (id) => {
    const kids = all().filter(s => s.inReplyToId === id && !s.reblog).sort((a, b) => cmp(a.id, b.id))
    for (const k of kids) {
      descendants.push(k)
      walk(k.id)
    }
  }
  walk(status.id)
  return { ancestors, descendants }
}

function findAccount(handle) {
  return db.byHandle.get(handle) || db.byHandle.get(handle.replace(/^@/, '')) || [...db.accounts.values()].find(a => a.acct.toLowerCase() === handle.toLowerCase().replace(/^@/, ''))
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks)
  const type = req.headers['content-type'] || ''
  if (type.includes('application/json')) {
    try {
      return JSON.parse(raw.toString() || '{}')
    }
    catch { return {} }
  }
  if (type.includes('application/x-www-form-urlencoded'))
    return Object.fromEntries(new URLSearchParams(raw.toString()))
  if (type.includes('multipart/form-data')) {
    const out = {}
    const text = raw.toString('latin1')
    for (const m of text.matchAll(/name="([^"]+)"(?:; filename="[^"]*")?\r\n(?:[^\r\n]+\r\n)*\r\n([\s\S]*?)\r\n--/g)) out[m[1]] = m[2]
    return out
  }
  return {}
}

// ---------- routes ----------
const routes = []
const on = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn })

on('GET', '/api/v2/instance', () => instanceV2())
on('GET', '/api/v1/instance', () => { const i = instanceV2(); return { uri: i.domain, title: i.title, shortDescription: i.description, description: i.description, email: i.contact.email, version: i.version, urls: { streamingApi: '' }, stats: { userCount: 18342, statusCount: 2841023, domainCount: 21877 }, thumbnail: i.thumbnail.url, languages: i.languages, registrations: true, approvalRequired: true, invitesEnabled: true, configuration: i.configuration, contactAccount: db.byHandle.get('magnus'), rules: i.rules } })
on('GET', '/api/v1/instance/rules', () => instanceV2().rules)
on('GET', '/api/v1/instance/extended_description', () => ({ updatedAt: '2025-06-01T00:00:00.000Z', content: `<p>${instanceV2().description}</p>` }))
on('GET', '/nodeinfo/2.0', () => ({ version: '2.0', software: { name: 'mastodon', version: '4.3.2' }, protocols: ['activitypub'], services: { outbound: [], inbound: [] }, usage: { users: { total: 18342, activeMonth: 4812, activeHalfyear: 9120 }, localPosts: 2841023 }, openRegistrations: true, metadata: { nodeName: 'Harbor Social' } }), true)
on('GET', '/api/v1/accounts/verify_credentials', () => me)
on('PATCH', '/api/v1/accounts/update_credentials', async ({ body }) => {
  if (body.display_name != null)
    me.displayName = body.display_name
  if (body.note != null) {
    me.note = render(body.note, db.byHandle).html
    me.source.note = body.note
  }
  return me
})
on('GET', '/api/v1/preferences', () => ({ 'posting:default:visibility': 'public', 'posting:default:sensitive': false, 'posting:default:language': 'en', 'reading:expand:media': 'default', 'reading:expand:spoilers': false }))
on('GET', '/api/v1/custom_emojis', () => [])
on('GET', '/api/v1/announcements', () => [])
on('GET', '/api/v1/push/subscription', () => { throw Object.assign(new Error('Record not found'), { status: 404 }) })
on('GET', '/api/v1/markers', () => ({ notifications: { lastReadId: db.notifications[5]?.id || '0', version: 312, updatedAt: new Date(db.now - 3 * 3600e3).toISOString() }, home: { lastReadId: '0', version: 1, updatedAt: new Date(db.now - 3600e3).toISOString() } }))
on('POST', '/api/v1/markers', ({ body }) => ({ notifications: { lastReadId: body?.notifications?.last_read_id || '0', version: 313, updatedAt: new Date().toISOString() } }))

// timelines
on('GET', '/api/v1/timelines/home', ({ q, p, res }) => paginate(desc(all().filter(visibleInHome)), q, p, res))
on('GET', '/api/v1/timelines/public', ({ q, p, res }) => {
  let list = all().filter(s => s.visibility === 'public' && !s.reblog)
  if (q.get('local') === 'true')
    list = list.filter(s => !s.account.acct.includes('@'))
  if (q.get('remote') === 'true')
    list = list.filter(s => s.account.acct.includes('@'))
  if (q.get('only_media') === 'true')
    list = list.filter(s => s.mediaAttachments.length)
  return paginate(desc(list), q, p, res)
})
on('GET', '/api/v1/timelines/tag/:tag', ({ q, p, res, m }) => {
  const t = decodeURIComponent(m.tag).toLowerCase()
  return paginate(desc(all().filter(s => !s.reblog && s.visibility === 'public' && s.tags.some(x => x.name.toLowerCase() === t))), q, p, res)
})
on('GET', '/api/v1/timelines/list/:id', ({ q, p, res, m }) => {
  const l = db.lists.find(x => x.id === m.id)
  const ids = new Set((l?.members || []).map(u => db.byHandle.get(u).id))
  return paginate(desc(all().filter(s => ids.has(s.account.id) && s.visibility !== 'direct')), q, p, res)
})
on('GET', '/api/v1/trends/statuses', ({ q }) => {
  const off = Number(q.get('offset') || 0)
  return all().filter(s => !s.reblog && s.visibility === 'public' && s.account.id !== me.id).sort((a, b) => (b.favouritesCount + b.reblogsCount * 2) - (a.favouritesCount + a.reblogsCount * 2)).slice(off, off + Number(q.get('limit') || 20))
})
on('GET', '/api/v1/trends/tags', ({ q }) => Number(q.get('offset') || 0) > 0 ? [] : db.trendingTags.map(tagEntity))
on('GET', '/api/v1/trends/links', ({ q }) => Number(q.get('offset') || 0) > 0 ? [] : Object.values(all().filter(s => s.card).reduce((acc, s) => (acc[s.card.url] = s.card, acc), {})).map((c, i) => ({ ...c, history: tagEntity(`link${i}`).history })))
on('GET', '/api/v2/suggestions', () => [...db.accounts.values()].filter(a => a.id !== me.id && !isFollowing(a.id)).map(a => ({ source: 'global', sources: ['featured'], account: a })))
on('DELETE', '/api/v1/suggestions/:id', () => ({}))

// statuses
on('GET', '/api/v1/statuses/:id', ({ m }) => statusOf(m.id) || notFound())
on('GET', '/api/v1/statuses/:id/context', ({ m }) => contextOf(statusOf(m.id) || notFound()))
on('GET', '/api/v1/statuses/:id/favourited_by', ({ m }) => { const s = statusOf(m.id); return s ? [...db.accounts.values()].filter(a => a.id !== s.account.id).slice(0, Math.min(20, s.favouritesCount)) : [] })
on('GET', '/api/v1/statuses/:id/reblogged_by', ({ m }) => { const s = statusOf(m.id); return s ? all().filter(b => b.reblog?.id === s.id).map(b => b.account) : [] })
on('GET', '/api/v1/statuses/:id/history', ({ m }) => { const s = statusOf(m.id); return s ? [{ content: s.content, spoilerText: s.spoilerText, sensitive: s.sensitive, createdAt: s.createdAt, account: s.account, mediaAttachments: s.mediaAttachments, emojis: [] }] : [] })
on('GET', '/api/v1/statuses/:id/source', ({ m }) => { const s = statusOf(m.id); return { id: s.id, text: s.content.replace(/<[^>]+>/g, ''), spoilerText: s.spoilerText } })
const toggle = (field, val, counter) => ({ m }) => {
  const s = statusOf(m.id) || notFound()
  const target = s.reblog || s
  if (counter && target[field] !== val)
    target[counter] += val ? 1 : -1
  target[field] = val
  return target
}
on('POST', '/api/v1/statuses/:id/favourite', toggle('favourited', true, 'favouritesCount'))
on('POST', '/api/v1/statuses/:id/unfavourite', toggle('favourited', false, 'favouritesCount'))
on('POST', '/api/v1/statuses/:id/bookmark', toggle('bookmarked', true))
on('POST', '/api/v1/statuses/:id/unbookmark', toggle('bookmarked', false))
on('POST', '/api/v1/statuses/:id/pin', toggle('pinned', true))
on('POST', '/api/v1/statuses/:id/unpin', toggle('pinned', false))
on('POST', '/api/v1/statuses/:id/mute', toggle('muted', true))
on('POST', '/api/v1/statuses/:id/unmute', toggle('muted', false))
on('POST', '/api/v1/statuses/:id/reblog', ({ m }) => {
  const s = statusOf(m.id) || notFound()
  s.reblogged = true
  s.reblogsCount++
  const b = { ...s, id: snowflake(Date.now()), createdAt: new Date().toISOString(), account: me, reblog: s, content: '', mentions: [], tags: [], mediaAttachments: [], card: null, poll: null }
  db.statuses.set(b.id, b)
  return b
})
on('POST', '/api/v1/statuses/:id/unreblog', ({ m }) => {
  const s = statusOf(m.id) || notFound()
  s.reblogged = false
  s.reblogsCount = Math.max(0, s.reblogsCount - 1)
  for (const b of all()) if (b.reblog?.id === s.id && b.account.id === me.id) db.statuses.delete(b.id)
  return s
})
on('POST', '/api/v1/statuses', ({ body }) => {
  const { html, mentions, tags } = render(body.status || '', db.byHandle)
  const id = snowflake(Date.now())
  const parent = body.in_reply_to_id ? statusOf(body.in_reply_to_id) : null
  if (parent)
    parent.repliesCount++
  const s = { id, uri: `${me.url}/statuses/${id}`, url: `${me.url}/${id}`, createdAt: new Date().toISOString(), editedAt: null, account: me, content: html, text: body.status, visibility: body.visibility || 'public', sensitive: !!body.sensitive || !!body.spoiler_text, spoilerText: body.spoiler_text || '', mediaAttachments: [], application: { name: 'Elk', website: 'https://elk.zone' }, mentions, tags: tags.map(name => ({ name, url: `${ORIGIN}/tags/${name}` })), emojis: [], reblogsCount: 0, favouritesCount: 0, repliesCount: 0, quotesCount: 0, favourited: false, reblogged: false, muted: false, bookmarked: false, pinned: false, reblog: null, poll: body.poll ? { id: String(Date.now()), expiresAt: new Date(Date.now() + Number(body.poll.expires_in || 86400) * 1000).toISOString(), expired: false, multiple: !!body.poll.multiple, votesCount: 0, votersCount: 0, options: (body.poll.options || []).map(title => ({ title, votesCount: 0 })), emojis: [], voted: true, ownVotes: [] } : null, card: null, language: body.language || 'en', inReplyToId: parent?.id || null, inReplyToAccountId: parent?.account.id || null, filtered: [], quote: null }
  db.statuses.set(id, s)
  me.statusesCount++
  return s
})
on('PUT', '/api/v1/statuses/:id', ({ m, body }) => { const s = statusOf(m.id) || notFound(); s.content = render(body.status || '', db.byHandle).html; s.editedAt = new Date().toISOString(); s.spoilerText = body.spoiler_text || ''; return s })
on('DELETE', '/api/v1/statuses/:id', ({ m }) => { const s = statusOf(m.id) || notFound(); db.statuses.delete(m.id); return { ...s, text: s.content.replace(/<[^>]+>/g, '') } })
on('POST', '/api/v1/polls/:id/votes', ({ m, body }) => {
  const s = all().find(x => x.poll?.id === m.id) || notFound()
  const choices = (body.choices || []).map(Number)
  s.poll.voted = true
  s.poll.ownVotes = choices
  for (const c of choices) s.poll.options[c].votesCount++
  s.poll.votesCount += choices.length
  s.poll.votersCount++
  return s.poll
})
on('GET', '/api/v1/polls/:id', ({ m }) => (all().find(x => x.poll?.id === m.id) || notFound()).poll)

// accounts
on('GET', '/api/v1/accounts/lookup', ({ q }) => findAccount(q.get('acct') || '') || notFound())
on('GET', '/api/v1/accounts/relationships', ({ q }) => q.getAll('id[]').concat(q.getAll('id')).map(relOf))
on('GET', '/api/v1/accounts/familiar_followers', ({ q }) => q.getAll('id[]').concat(q.getAll('id')).map(id => ({ id, accounts: db.followers.filter(a => a.id !== id).slice(id.length % 4, (id.length % 4) + 3) })))
on('GET', '/api/v1/accounts/:id', ({ m }) => db.accounts.get(m.id) || notFound())
on('GET', '/api/v1/accounts/:id/statuses', ({ m, q, p, res }) => {
  let list = all().filter(s => s.account.id === m.id && s.visibility !== 'direct')
  if (q.get('pinned') === 'true')
    return list.filter(s => s.pinned)
  if (q.get('exclude_replies') === 'true')
    list = list.filter(s => !s.inReplyToId)
  if (q.get('only_media') === 'true')
    list = list.filter(s => !s.reblog && s.mediaAttachments.length)
  if (q.get('exclude_reblogs') === 'true')
    list = list.filter(s => !s.reblog)
  if (q.get('tagged'))
    list = list.filter(s => s.tags.some(t => t.name.toLowerCase() === q.get('tagged').toLowerCase()))
  return paginate(desc(list), q, p, res)
})
on('GET', '/api/v1/accounts/:id/followers', ({ m }) => m.id === me.id ? db.followers : db.following.filter(a => a.id !== m.id).slice(0, 12).concat(m.id !== me.id && relOf(m.id).following ? [me] : []))
on('GET', '/api/v1/accounts/:id/following', ({ m }) => m.id === me.id ? db.following : db.followers.filter(a => a.id !== m.id).slice(2, 14))
on('GET', '/api/v1/accounts/:id/featured_tags', ({ m }) => m.id === me.id ? ['GreenRoofs', 'Pollinators', 'UrbanEcology'].map((n, i) => ({ id: String(90 + i), name: n, url: `${me.url}/tagged/${n}`, statusesCount: String(40 - i * 11), lastStatusAt: new Date(db.now - i * 3 * DAY).toISOString().slice(0, 10) })) : [])
on('GET', '/api/v1/accounts/:id/lists', ({ m }) => db.lists.filter(l => l.members.some(u => db.byHandle.get(u).id === m.id)).map(listOut))
on('GET', '/api/v1/accounts/:id/endorsements', () => [])
on('GET', '/api/v1/accounts/:id/identity_proofs', () => [])
const relSet = patch => ({ m }) => {
  const r = { ...relOf(m.id), ...patch }
  db.rel.set(m.id, r)
  return r
}
on('POST', '/api/v1/accounts/:id/follow', relSet({ following: true, showingReblogs: true }))
on('POST', '/api/v1/accounts/:id/unfollow', relSet({ following: false, notifying: false }))
on('POST', '/api/v1/accounts/:id/mute', relSet({ muting: true }))
on('POST', '/api/v1/accounts/:id/unmute', relSet({ muting: false }))
on('POST', '/api/v1/accounts/:id/block', relSet({ blocking: true, following: false }))
on('POST', '/api/v1/accounts/:id/unblock', relSet({ blocking: false }))
on('POST', '/api/v1/accounts/:id/note', ({ m, body }) => relSet({ note: body.comment || '' })({ m }))
on('POST', '/api/v1/accounts/:id/pin', relSet({ endorsed: true }))
on('POST', '/api/v1/accounts/:id/unpin', relSet({ endorsed: false }))

// notifications
on('GET', '/api/v1/notifications', ({ q, p, res }) => {
  let list = db.notifications
  const types = q.getAll('types[]')
  const exclude = q.getAll('exclude_types[]')
  if (types.length)
    list = list.filter(n => types.includes(n.type))
  if (exclude.length)
    list = list.filter(n => !exclude.includes(n.type))
  return paginate(list, q, p, res)
})
on('GET', '/api/v1/notifications/unread_count', () => ({ count: 5 }))
on('GET', '/api/v1/notifications/policy', () => ({ forNotFollowing: 'accept', forNotFollowers: 'accept', forNewAccounts: 'filter', forPrivateMentions: 'filter', forLimitedAccounts: 'filter', summary: { pendingRequestsCount: 0, pendingNotificationsCount: 0 } }))
on('GET', '/api/v2/notifications/policy', () => ({ forNotFollowing: 'accept', forNotFollowers: 'accept', forNewAccounts: 'filter', forPrivateMentions: 'filter', forLimitedAccounts: 'filter', summary: { pendingRequestsCount: 0, pendingNotificationsCount: 0 } }))
on('GET', '/api/v1/notifications/requests', () => [])
on('POST', '/api/v1/notifications/clear', () => { db.notifications.length = 0; return {} })
on('POST', '/api/v1/notifications/:id/dismiss', ({ m }) => { const i = db.notifications.findIndex(n => n.id === m.id); if (i >= 0) db.notifications.splice(i, 1); return {} })
on('GET', '/api/v1/notifications/:id', ({ m }) => db.notifications.find(n => n.id === m.id) || notFound())

// conversations, bookmarks, favourites
on('GET', '/api/v1/conversations', ({ q, p, res }) => paginate(db.conversations.slice().sort((a, b) => cmp(b.lastStatus.id, a.lastStatus.id)).map(c => ({ ...c, id: c.lastStatus.id, _cid: c.id })), q, p, res).map(({ _cid, ...c }) => ({ ...c, id: _cid })))
on('POST', '/api/v1/conversations/:id/read', ({ m }) => { const c = db.conversations.find(x => x.id === m.id); if (c) c.unread = false; return c || {} })
on('GET', '/api/v1/bookmarks', ({ q, p, res }) => paginate(desc(all().filter(s => s.bookmarked && !s.reblog)), q, p, res))
on('GET', '/api/v1/favourites', ({ q, p, res }) => paginate(desc(all().filter(s => s.favourited && !s.reblog)), q, p, res))

// lists
function listOut(l) {
  return { id: l.id, title: l.title, repliesPolicy: l.repliesPolicy, exclusive: l.exclusive }
}
on('GET', '/api/v1/lists', () => db.lists.map(listOut))
on('GET', '/api/v1/lists/:id', ({ m }) => listOut(db.lists.find(l => l.id === m.id) || notFound()))
on('GET', '/api/v1/lists/:id/accounts', ({ m }) => (db.lists.find(l => l.id === m.id)?.members || []).map(u => db.byHandle.get(u)))
on('POST', '/api/v1/lists', ({ body }) => { const l = { id: String(40 + db.lists.length), title: body.title || 'New list', repliesPolicy: body.replies_policy || 'list', exclusive: !!body.exclusive, members: [] }; db.lists.push(l); return listOut(l) })
on('PUT', '/api/v1/lists/:id', ({ m, body }) => { const l = db.lists.find(x => x.id === m.id) || notFound(); if (body.title) l.title = body.title; return listOut(l) })
on('DELETE', '/api/v1/lists/:id', ({ m }) => { db.lists = db.lists.filter(l => l.id !== m.id); return {} })
on('POST', '/api/v1/lists/:id/accounts', ({ m, body }) => { const l = db.lists.find(x => x.id === m.id); for (const id of [].concat(body.account_ids || body['account_ids[]'] || [])) { const a = db.accounts.get(id); if (a && !l.members.includes(a.acct)) l.members.push(a.acct) } return {} })
on('DELETE', '/api/v1/lists/:id/accounts', ({ m, q, body }) => { const l = db.lists.find(x => x.id === m.id); const ids = [].concat(body.account_ids || q.getAll('account_ids[]')); l.members = l.members.filter(u => !ids.includes(db.byHandle.get(u).id)); return {} })

// tags
on('GET', '/api/v1/followed_tags', () => db.followedTags.map(tagEntity))
on('GET', '/api/v1/tags/:tag', ({ m }) => tagEntity(decodeURIComponent(m.tag)))
on('POST', '/api/v1/tags/:tag/follow', ({ m }) => { const t = decodeURIComponent(m.tag); if (!db.followedTags.includes(t)) db.followedTags.push(t); return tagEntity(t) })
on('POST', '/api/v1/tags/:tag/unfollow', ({ m }) => { const t = decodeURIComponent(m.tag).toLowerCase(); db.followedTags = db.followedTags.filter(x => x.toLowerCase() !== t); return tagEntity(t) })
on('GET', '/api/v1/featured_tags', () => ['GreenRoofs', 'Pollinators', 'UrbanEcology'].map((n, i) => ({ id: String(90 + i), name: n, url: `${me.url}/tagged/${n}`, statusesCount: String(40 - i * 11), lastStatusAt: new Date(db.now - i * 3 * DAY).toISOString().slice(0, 10) })))

// search
on('GET', '/api/v2/search', ({ q }) => {
  const term = (q.get('q') || '').trim().toLowerCase().replace(/^[@#]/, '')
  const type = q.get('type')
  const limit = Number(q.get('limit') || 20)
  if (Number(q.get('offset') || 0) > 0 || !term)
    return { accounts: [], statuses: [], hashtags: [] }
  const accounts = [...db.accounts.values()].filter(a => a.acct.toLowerCase().includes(term) || a.displayName.toLowerCase().includes(term) || `${a.username}@harbor.social` === term)
  const statuses = desc(all().filter(s => !s.reblog && s.visibility === 'public' && s.content.replace(/<[^>]+>/g, '').toLowerCase().includes(term)))
  const tagNames = new Set([...db.tagUse.keys(), ...db.followedTags.map(t => t.toLowerCase()), ...db.trendingTags.map(t => t.toLowerCase())])
  const hashtags = [...tagNames].filter(t => t.includes(term)).map(t => tagEntity(t))
  return {
    accounts: !type || type === 'accounts' ? accounts.slice(0, limit) : [],
    statuses: !type || type === 'statuses' ? statuses.slice(0, limit) : [],
    hashtags: !type || type === 'hashtags' ? hashtags.slice(0, limit) : [],
  }
})

// moderation-ish & misc lists
on('GET', '/api/v1/mutes', () => db.mutes)
on('GET', '/api/v1/blocks', () => db.blocks)
on('GET', '/api/v1/domain_blocks', () => db.domainBlocks)
on('GET', '/api/v1/follow_requests', () => db.followRequests)
on('POST', '/api/v1/follow_requests/:id/authorize', ({ m }) => { db.followRequests = db.followRequests.filter(a => a.id !== m.id); return { ...relOf(m.id), followedBy: true } })
on('POST', '/api/v1/follow_requests/:id/reject', ({ m }) => { db.followRequests = db.followRequests.filter(a => a.id !== m.id); return relOf(m.id) })
on('GET', '/api/v1/scheduled_statuses', () => db.scheduled)
on('DELETE', '/api/v1/scheduled_statuses/:id', ({ m }) => { db.scheduled = db.scheduled.filter(s => s.id !== m.id); return {} })
on('GET', '/api/v2/filters', () => db.filters)
on('GET', '/api/v1/filters', () => db.filters.flatMap(f => f.keywords.map(k => ({ id: k.id, phrase: k.keyword, context: f.context, wholeWord: k.wholeWord, expiresAt: f.expiresAt, irreversible: f.filterAction === 'hide' }))))
on('GET', '/api/v1/endorsements', () => ['ingrid_b', 'priya'].map(u => db.byHandle.get(u)))
on('GET', '/api/v1/directory', () => [...db.accounts.values()].filter(a => a.id !== me.id))
on('POST', '/api/v2/media', () => ({ id: snowflake(Date.now()), type: 'image', url: `${ORIGIN}/media/photos/tibet-1.jpg`, previewUrl: `${ORIGIN}/media/photos/tibet-1.jpg`, remoteUrl: null, meta: { original: { width: 1280, height: 720, size: '1280x720', aspect: 1.777 } }, description: null, blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' }))
on('POST', '/api/v1/reports', () => ({ id: '1', actionTaken: false, category: 'other', comment: '', forwarded: false, statusIds: [], ruleIds: [] }))

on('GET', '/api/v1/search', ctx => routes.find(r => r.re.test('/api/v2/search')).fn(ctx))
on('GET', '/api/v1/accounts/:id/collections', () => [])
on('GET', '/api/v1/accounts/:id/in_collections', () => [])
on('GET', '/api/v1/statuses/:id/quotes', () => [])
on('DELETE', '/api/v1/domain_blocks', ({ q, body }) => { const d = body.domain || q.get('domain'); db.domainBlocks = db.domainBlocks.filter(x => x !== d); return {} })
on('POST', '/api/v1/domain_blocks', ({ q, body }) => { const d = body.domain || q.get('domain'); if (d && !db.domainBlocks.includes(d)) db.domainBlocks.push(d); return {} })
on('PUT', '/api/v1/media/:id', ({ m, body }) => ({ id: m.id, type: 'image', url: `${ORIGIN}/media/photos/tibet-1.jpg`, previewUrl: `${ORIGIN}/media/photos/tibet-1.jpg`, remoteUrl: null, meta: { original: { width: 1280, height: 720, size: '1280x720', aspect: 1.777 } }, description: body.description || null, blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' }))

function notFound() {
  throw Object.assign(new Error('Record not found'), { status: 404 })
}

// ---------- server ----------
const MIME = { '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' }
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Expose-Headers', 'Link, X-RateLimit-Reset, X-RateLimit-Limit, X-RateLimit-Remaining, X-Request-Id')
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }
  const url = new URL(req.url, ORIGIN)
  const p = url.pathname

  if (req.method === 'GET' && (p.startsWith('/media/') || p.startsWith('/headers/'))) {
    const file = p.startsWith('/headers/') ? path.join(here, 'media/photos/tibet-8.jpg') : path.join(here, path.normalize(p).replace(/^(\.\.[/\\])+/, ''))
    if (!file.startsWith(here) || !fs.existsSync(file)) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' })
    fs.createReadStream(file).pipe(res)
    return
  }

  for (const r of routes) {
    if (r.method !== req.method)
      continue
    const m = p.match(r.re)
    if (!m)
      continue
    try {
      const auth = req.headers.authorization
      if (auth && auth !== `Bearer ${TOKEN}`)
        throw Object.assign(new Error('The access token is invalid'), { status: 401 })
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readBody(req) : {}
      const result = await r.fn({ q: url.searchParams, p, m: m.groups || {}, res, req, body })
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(toSnake(result)))
    }
    catch (e) {
      res.writeHead(e.status || 500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
      if (!e.status)
        console.error(req.method, p, e)
    }
    return
  }
  console.warn('[stub] unhandled', req.method, p + url.search)
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Record not found' }))
})
server.listen(PORT, () => console.log(`[stub] Harbor Social Mastodon API on ${ORIGIN} (port ${PORT}); ${db.statuses.size} statuses, ${db.notifications.length} notifications, ${db.accounts.size} accounts`))
