// Builds the in-memory Mastodon state for the stub. Deterministic (seeded RNG); dates are
// relative to `now` so the account always looks actively used.
import { DOMAIN, ME, ORIGIN } from './core.mjs'
import { CARDS, MY_POSTS, PERSONAS, PHOTO_ALT, REPLY_LINES } from './personas.mjs'

const PHOTO_SIZES = { 1: [1280, 720], 2: [1600, 900], 3: [1440, 810], 4: [1760, 990], 5: [900, 1600], 6: [720, 1280], 7: [990, 1760], 8: [1440, 810], 9: [1920, 1080] }
const BLURHASHES = ['LEHV6nWB2yk8pyo0adR*.7kCMdnj', 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH', 'L6PZfSi_.AyE_3t7t7R**0o#DgR4', 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.']

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let seq = 0
export function snowflake(ms) {
  seq = (seq + 1) % 65536
  return ((BigInt(Math.floor(ms)) << 16n) + BigInt(seq)).toString()
}

export function buildDb(now = Date.now()) {
  const r = rng(20261115)
  const pick = arr => arr[Math.floor(r() * arr.length)]
  const int = (a, b) => a + Math.floor(r() * (b - a + 1))
  const HOUR = 3600e3
  const DAY = 24 * HOUR

  // ---------- accounts ----------
  const accounts = new Map() // id -> account
  const byHandle = new Map() // username or user@domain -> account
  const me = { ...ME, lastStatusAt: new Date(now).toISOString().slice(0, 10) }
  me.fields = [
    { name: 'Lab', value: linkHtml('https://urbanpollinators.se'), verifiedAt: '2023-02-14T10:00:00.000Z' },
    { name: 'Location', value: 'Göteborg, Sverige', verifiedAt: null },
    { name: 'Pronouns', value: 'she/her', verifiedAt: null },
  ]
  me.source = { privacy: 'public', sensitive: false, language: 'en', note: 'Urban ecologist in Gothenburg 🌿 Studying pollinators on green roofs. Weekend sourdough, weekday bike commuter. She/her.\n\nPosts in English & Swedish. #GreenRoofs #Pollinators', fields: me.fields.map(f => ({ name: f.name, value: f.name === 'Lab' ? 'https://urbanpollinators.se' : f.value, verifiedAt: f.verifiedAt })), followRequestsCount: 2 }
  me.role = { id: '-99', name: '', permissions: '65536', color: '', highlighted: false }
  accounts.set(me.id, me)
  byHandle.set('maren', me)

  PERSONAS.forEach((p, i) => {
    const id = `1093${String(1000 + i * 37).padStart(6, '0')}${String(i).padStart(4, '0')}`
    const acct = p.domain ? `${p.u}@${p.domain}` : p.u
    const url = p.domain ? `https://${p.domain}/@${p.u}` : `${ORIGIN}/@${p.u}`
    const header = (i % 3 === 0) ? `${ORIGIN}/media/photos/tibet-${(i % 9) + 1}.jpg` : `${ORIGIN}/headers/original/missing.png`
    const a = {
      id, username: p.u, acct, displayName: p.name, locked: !!p.locked, bot: !!p.bot, discoverable: true, group: false, indexable: true,
      createdAt: `${p.since}T09:${String(10 + i).padStart(2, '0')}:00.000Z`,
      note: `<p>${esc(p.bio)}</p>`, url, uri: url,
      avatar: `${ORIGIN}/media/avatars/${p.u}.svg`, avatarStatic: `${ORIGIN}/media/avatars/${p.u}.svg`,
      header, headerStatic: header,
      followersCount: p.followers, followingCount: p.following, statusesCount: int(180, 4200),
      lastStatusAt: null, emojis: [],
      fields: (p.fields || []).map(([name, value]) => ({ name, value: value.startsWith('https://') ? linkHtml(value) : esc(value), verifiedAt: value.startsWith('https://') && i % 2 === 0 ? '2024-03-01T12:00:00.000Z' : null })),
    }
    accounts.set(id, a)
    byHandle.set(acct, a)
    byHandle.set(p.u, a)
  })

  // relationships from my point of view
  const notFollowed = new Set(['dmitri', 'erik_s', 'theo', 'climatedesk'])
  const notFollowingMe = new Set(['dmitri', 'climatedesk', 'tobias', 'birdsofvast', 'ravi'])
  const rel = new Map()
  for (const p of PERSONAS) {
    const a = byHandle.get(p.u)
    rel.set(a.id, {
      id: a.id, following: !notFollowed.has(p.u), showingReblogs: true, notifying: ['ingrid_b', 'oskar'].includes(p.u), followedBy: !notFollowingMe.has(p.u),
      blocking: false, blockedBy: false, muting: false, mutingNotifications: false, requested: false, requestedBy: false, domainBlocking: false, endorsed: ['ingrid_b', 'priya'].includes(p.u), note: '', languages: null,
    })
  }

  // ---------- statuses ----------
  const statuses = new Map()
  const tagUse = new Map()

  function mention(handle) {
    const a = byHandle.get(handle)
    return a ? { id: a.id, username: a.username, url: a.url, acct: a.acct } : null
  }

  function makeStatus(account, spec, createdMs, extra = {}) {
    const s = typeof spec === 'string' ? { t: spec } : spec
    const { html, mentions, tags } = render(s.t, byHandle)
    for (const t of tags) tagUse.set(t.toLowerCase(), (tagUse.get(t.toLowerCase()) || 0) + 1)
    const id = snowflake(createdMs)
    const reach = Math.max(1, Math.round(Math.sqrt(account.followersCount || 50)))
    const media = (s.media || []).map((n, k) => mediaFor(n, `${id}${k}`))
    let poll = null
    if (s.poll) {
      const expired = (now - createdMs) > 2 * DAY
      const votes = s.poll.map(() => int(3, Math.max(8, reach * 3)))
      const total = votes.reduce((x, y) => x + y, 0)
      poll = { id: String(4000 + statuses.size), expiresAt: new Date(createdMs + 2 * DAY).toISOString(), expired, multiple: false, votesCount: total, votersCount: total, options: s.poll.map((title, k) => ({ title, votesCount: votes[k] })), emojis: [], voted: account.id === me.id || r() < 0.5, ownVotes: account.id === me.id ? [] : (r() < 0.5 ? [int(0, s.poll.length - 1)] : []) }
      if (!poll.voted)
        poll.ownVotes = []
    }
    let card = null
    if (s.card && CARDS[s.card]) {
      const c = CARDS[s.card]
      const [w, h] = c.img ? PHOTO_SIZES[c.img] : [0, 0]
      card = { url: c.url, title: c.title, description: c.description, type: 'link', authorName: '', authorUrl: '', providerName: c.providerName, providerUrl: '', html: '', width: c.img ? 400 : 0, height: c.img ? Math.round(400 * h / w) : 0, image: c.img ? `${ORIGIN}/media/photos/tibet-${c.img}.jpg` : null, embedUrl: '', blurhash: c.img ? BLURHASHES[c.img % 4] : null, publishedAt: null }
    }
    const isMine = account.id === me.id
    const status = {
      id, uri: `${account.url}/statuses/${id}`, url: `${account.url}/${id}`, createdAt: new Date(createdMs).toISOString(), editedAt: null,
      account, content: html, text: null, visibility: s.visibility || 'public', sensitive: !!(s.cw || s.sensitive), spoilerText: s.cw || '',
      mediaAttachments: media, application: isMine ? { name: 'Elk', website: 'https://elk.zone' } : null, mentions, tags: tags.map(name => ({ name, url: `${ORIGIN}/tags/${name}` })), emojis: [],
      reblogsCount: Math.floor(r() * reach * 0.8), favouritesCount: int(1, reach * 2 + 3), repliesCount: 0, quotesCount: 0,
      favourited: !isMine && r() < 0.22, reblogged: false, muted: false, bookmarked: false, pinned: false,
      reblog: null, poll, card, language: s.lang || 'en', inReplyToId: null, inReplyToAccountId: null, filtered: [], quote: null,
      ...extra,
    }
    statuses.set(id, status)
    return status
  }

  function mediaFor(n, id) {
    const [w, h] = PHOTO_SIZES[n]
    const sw = 640
    const sh = Math.round(sw * h / w)
    return { id, type: 'image', url: `${ORIGIN}/media/photos/tibet-${n}.jpg`, previewUrl: `${ORIGIN}/media/photos/tibet-${n}.jpg`, remoteUrl: null, previewRemoteUrl: null, textUrl: null, meta: { original: { width: w, height: h, size: `${w}x${h}`, aspect: w / h }, small: { width: sw, height: sh, size: `${sw}x${sh}`, aspect: w / h }, focus: { x: 0, y: 0 } }, description: PHOTO_ALT[n], blurhash: BLURHASHES[n % 4] }
  }

  // persona posts: spread over ~24 days, denser recently
  const personaStatuses = []
  PERSONAS.forEach((p) => {
    const a = byHandle.get(p.u)
    p.posts.forEach((spec) => {
      const ageH = Math.pow(r(), 1.6) * 24 * 24 + r() * 0.5
      personaStatuses.push(makeStatus(a, spec, now - ageH * HOUR - int(1, 59) * 60e3))
    })
  })

  // my posts
  const mine = MY_POSTS.map(spec => makeStatus(me, spec, now - spec.age * DAY - int(5, 300) * 60e3))
  mine.forEach((s) => {
    s.favouritesCount = int(12, 140)
    s.reblogsCount = int(2, 40)
  })
  // pin two of my posts
  mine[2].pinned = true
  mine[5].pinned = true

  // threads: replies to my posts and my replies back
  const replyTargets = mine.slice().reverse()
  REPLY_LINES.forEach(([who, text], i) => {
    const target = replyTargets[i % replyTargets.length]
    const a = byHandle.get(who)
    const created = Math.min(now - 60e3, Date.parse(target.createdAt) + int(10, 600) * 60e3)
    const reply = makeStatus(a, `@maren ${text}`, created, { inReplyToId: target.id, inReplyToAccountId: me.id })
    target.repliesCount++
    if (i % 3 === 0) {
      const back = makeStatus(me, `@${a.acct} ${pick(['Thank you! 💚', 'Ha, yes. Exactly this.', 'Let\'s talk more at the seminar!', 'Will send you the list tomorrow.', 'Absolutely, DM me.'])}`, Math.min(now - 30e3, created + int(5, 120) * 60e3), { inReplyToId: reply.id, inReplyToAccountId: a.id })
      reply.repliesCount++
      mine.push(back)
    }
  })
  // my replies to others
  const replyTo = [
    ['oskar', 'Yes! Back row, judging fonts, as is tradition.'],
    ['freya', 'Wild thyme, bird\'s-foot trefoil, harebell and viper\'s bugloss do well in thin substrate here — I\'ll send you our full list for Denmark.'],
    ['priya', 'Hoverflies were 18% of all visits on the native-mix roofs! You were right, as usual.'],
    ['ravi', 'Printing this and taping it to the wall of every research group I know.'],
    ['amira', 'The fox librarian is perfect. I need this as a print for my office.'],
  ]
  for (const [who, text] of replyTo) {
    const target = personaStatuses.find(s => s.account.username === who)
    if (!target)
      continue
    const created = Math.min(now - 90e3, Date.parse(target.createdAt) + int(20, 400) * 60e3)
    mine.push(makeStatus(me, `@${target.account.acct} ${text}`, created, { inReplyToId: target.id, inReplyToAccountId: target.account.id }))
    target.repliesCount++
  }
  // a few replies between other people
  for (let i = 0; i < 10; i++) {
    const target = pick(personaStatuses)
    const a = byHandle.get(pick(PERSONAS).u)
    if (a.id === target.account.id)
      continue
    const text = pick(['This!', 'Saving this for later.', 'Couldn\'t agree more.', 'Ha! Painfully accurate.', 'Thanks for sharing, learned something today.', 'Congrats, that is a big deal!', 'Do you have a source for this? Would love to read more.', 'Same thing happened to me last week.'])
    makeStatus(a, `@${target.account.acct} ${text}`, Math.min(now - 60e3, Date.parse(target.createdAt) + int(10, 300) * 60e3), { inReplyToId: target.id, inReplyToAccountId: target.account.id })
    target.repliesCount++
  }

  // boosts by followed accounts
  const boosts = []
  for (let i = 0; i < 28; i++) {
    const orig = pick([...personaStatuses, ...mine.filter(s => !s.inReplyToId)])
    const booster = byHandle.get(pick(PERSONAS).u)
    if (booster.id === orig.account.id || orig.reblog)
      continue
    const created = Math.min(now - 30e3, Date.parse(orig.createdAt) + int(10, 2000) * 60e3)
    const b = { ...makeStatus(booster, '', created), reblog: orig, content: '', mentions: [], tags: [], mediaAttachments: [], card: null, poll: null }
    statuses.set(b.id, b)
    boosts.push(b)
  }
  // my boosts
  for (const who of ['ingrid_b', 'elinor', 'priya']) {
    const orig = personaStatuses.find(s => s.account.username === who)
    orig.reblogged = true
    const b = { ...makeStatus(me, '', Date.parse(orig.createdAt) + 45 * 60e3), reblog: orig, content: '', mentions: [], tags: [], mediaAttachments: [], card: null, poll: null }
    statuses.set(b.id, b)
  }

  // bookmarks
  const bookmarkIds = []
  for (const s of personaStatuses) {
    if (s.card || (s.mediaAttachments.length && r() < 0.3) || r() < 0.06) {
      s.bookmarked = true
      bookmarkIds.push(s.id)
    }
  }

  // ---------- direct conversations ----------
  const conversations = []
  const dms = [
    ['elinor', ['Hi Maren! Would you have 20 minutes next week for a short phone interview about the green roof study? Thinking of a piece on urban biodiversity for the newsletter.', 'Of course! Tuesday or Wednesday afternoon work best for me.', 'Wednesday 14:00 it is. I\'ll call the number on your lab page.']],
    ['oskar', ['Do you still have the spare infiltrometer? Mine flooded 🙃', 'It\'s in the cabinet by the window, take it! Just bring it back before the April survey.']],
    ['ingrid_b', ['Reviewer comments are in for the follow-up paper. Mostly positive, one grumpy one. Let\'s meet Friday?', 'Friday works. I\'ll bring cardamom buns to counteract the grumpy reviewer.']],
    ['freya', ['Here\'s our shed roof — about 6 m², south facing. Too small to bother?', 'Not too small at all! Even 6 m² of native flowers makes a difference. Sending you the species list now.']],
    ['lotta', ['Your starter is ready for pickup whenever. Feed it at 1:5:5 and it will be happy.']],
    ['magnus', ['Hey, would you be up for joining the moderation team? We need someone in a European timezone who\'s not me 😅', 'Let me think about it over the weekend — honoured to be asked!']],
  ]
  dms.forEach(([who, lines], i) => {
    const a = byHandle.get(who)
    let t = now - (i * 1.7 + 0.3) * DAY - int(1, 300) * 60e3
    let last = null
    lines.forEach((line, k) => {
      const fromMe = k % 2 === 1
      const author = fromMe ? me : a
      const to = fromMe ? a : me
      last = makeStatus(author, `@${to.acct} ${line}`, t, { visibility: 'direct', inReplyToId: last ? last.id : null, inReplyToAccountId: last ? last.account.id : null })
      t += int(15, 400) * 60e3
    })
    conversations.push({ id: String(800 + i), unread: i < 2 && lines.length % 2 === 1, accounts: [a], lastStatus: last })
  })

  // ---------- notifications ----------
  const notifications = []
  const pushN = (type, account, status, ms) => notifications.push({ id: snowflake(ms), type, createdAt: new Date(ms).toISOString(), account, status: status || null, groupKey: `${type}-${status ? status.id : account.id}` })
  for (const s of mine.filter(x => !x.reblog && x.visibility !== 'direct')) {
    const base = Date.parse(s.createdAt)
    const nFav = Math.min(9, Math.floor(s.favouritesCount / 8) + 1)
    for (let k = 0; k < nFav; k++)
      pushN('favourite', byHandle.get(pick(PERSONAS).u), s, Math.min(now - 20e3, base + int(2, 3000) * 60e3))
    for (let k = 0; k < Math.min(4, Math.floor(s.reblogsCount / 6)); k++)
      pushN('reblog', byHandle.get(pick(PERSONAS).u), s, Math.min(now - 20e3, base + int(5, 3000) * 60e3))
  }
  for (const s of statuses.values()) {
    if (s.account.id !== me.id && s.mentions.some(m => m.id === me.id) && s.visibility !== 'direct')
      pushN('mention', s.account, s, Date.parse(s.createdAt))
  }
  for (const who of ['nora', 'greta_k', 'erik_s', 'theo', 'chen', 'hanna'])
    pushN('follow', byHandle.get(who), null, now - int(1, 40 * 24) * HOUR)
  const myPoll = mine.find(s => s.poll)
  if (myPoll)
    pushN('poll', me, myPoll, Date.parse(myPoll.poll.expiresAt))
  const ingridPost = personaStatuses.find(s => s.account.username === 'ingrid_b')
  pushN('status', byHandle.get('ingrid_b'), ingridPost, Date.parse(ingridPost.createdAt) + 1000)
  const oskarPost = personaStatuses.find(s => s.account.username === 'oskar')
  pushN('status', byHandle.get('oskar'), oskarPost, Date.parse(oskarPost.createdAt) + 1000)
  notifications.sort((a, b) => cmp(b.id, a.id))

  // ---------- lists, tags, misc ----------
  const lists = [
    { id: '31', title: 'Ecology & science', repliesPolicy: 'list', exclusive: false, members: ['ingrid_b', 'priya', 'chen', 'oskar', 'freya'] },
    { id: '32', title: 'Gothenburg locals', repliesPolicy: 'followed', exclusive: false, members: ['jonas', 'lotta', 'oskar', 'greta_k', 'magnus', 'birdsofvast'] },
    { id: '33', title: 'Tech people', repliesPolicy: 'list', exclusive: false, members: ['tobias', 'ravi', 'wren', 'sofia', 'nora'] },
    { id: '34', title: 'Climate news', repliesPolicy: 'none', exclusive: true, members: ['elinor', 'climatedesk'] },
  ]
  const followedTags = ['GreenRoofs', 'Pollinators', 'UrbanEcology', 'Sourdough', 'Cycling', 'Gothenburg']
  const trendingTags = ['Pollinators', 'Climate', 'Sourdough', 'MastoArt', 'Birds', 'Photography', 'CSS', 'SRE', 'Housing', 'Fermentation']

  const following = PERSONAS.filter(p => !notFollowed.has(p.u)).map(p => byHandle.get(p.u))
  const followers = PERSONAS.filter(p => !notFollowingMe.has(p.u)).map(p => byHandle.get(p.u))
  const followRequests = [byHandle.get('erik_s'), byHandle.get('theo')]
  const mutes = []
  const blocks = []
  const domainBlocks = ['spam.example', 'crypto-moon.social']
  const scheduled = [
    { id: '7001', scheduledAt: new Date(now + 1.6 * DAY).toISOString(), params: { text: 'Reminder: our open lab day is this Saturday! Come see the roof plots and the bee hotel. 10:00–14:00, all welcome. #UrbanEcology', visibility: 'public', sensitive: false, spoilerText: null, language: 'en', poll: null, mediaIds: null, inReplyToId: null, scheduledAt: null, idempotency: null, applicationId: 1, withRateLimit: false }, mediaAttachments: [] },
    { id: '7002', scheduledAt: new Date(now + 5.3 * DAY).toISOString(), params: { text: 'Abstract deadline for the Nordic Urban Ecology conference is Friday. Get those submissions in!', visibility: 'unlisted', sensitive: false, spoilerText: null, language: 'en', poll: null, mediaIds: null, inReplyToId: null, scheduledAt: null, idempotency: null, applicationId: 1, withRateLimit: false }, mediaAttachments: [] },
  ]
  const filters = [
    { id: '61', title: 'US politics', context: ['home', 'public'], expiresAt: null, filterAction: 'warn', keywords: [{ id: '611', keyword: 'midterms', wholeWord: true }, { id: '612', keyword: 'senate race', wholeWord: false }], statuses: [] },
    { id: '62', title: 'Spoilers', context: ['home', 'notifications', 'public', 'thread'], expiresAt: new Date(now + 9 * DAY).toISOString(), filterAction: 'hide', keywords: [{ id: '621', keyword: 'season finale', wholeWord: false }], statuses: [] },
  ]

  for (const a of accounts.values()) {
    const latest = [...statuses.values()].filter(s => s.account.id === a.id).map(s => s.createdAt).sort().pop()
    if (latest)
      a.lastStatusAt = latest.slice(0, 10)
  }

  return { now, me, accounts, byHandle, rel, statuses, notifications, conversations, lists, followedTags, trendingTags, tagUse, following, followers, followRequests, mutes, blocks, domainBlocks, scheduled, filters, bookmarkIds, CARDS }
}

export function cmp(a, b) {
  const x = BigInt(a)
  const y = BigInt(b)
  return x < y ? -1 : x > y ? 1 : 0
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function linkHtml(url) {
  const noProto = url.replace(/^https?:\/\//, '')
  const proto = url.slice(0, url.length - noProto.length)
  const shown = noProto.length > 30 ? noProto.slice(0, 30) : noProto
  const rest = noProto.slice(shown.length)
  return `<a href="${esc(url)}" target="_blank" rel="nofollow noopener noreferrer" translate="no"><span class="invisible">${proto}</span><span class="${rest ? 'ellipsis' : ''}">${esc(shown)}</span><span class="invisible">${esc(rest)}</span></a>`
}

// Converts the light markup used in personas.mjs into Mastodon-style HTML.
export function render(text, byHandle) {
  const mentions = []
  const tags = []
  const paras = text.split(/\n\n+/).map((para) => {
    const tokens = para.split(/(\s+)/)
    return tokens.map((tok) => {
      if (/^\s+$/.test(tok))
        return tok.includes('\n') ? '<br />' : tok
      const m = tok.match(/^(.*?)([.,!?:;)]*)$/)
      const core = m[1]
      const trail = m[2]
      if (/^https?:\/\//.test(core))
        return linkHtml(core) + esc(trail)
      if (/^#[\p{L}\p{N}_]+$/u.test(core)) {
        const name = core.slice(1)
        tags.push(name)
        return `<a href="${DOMAIN_ORIGIN}/tags/${name}" class="mention hashtag" rel="tag">#<span>${esc(name)}</span></a>${esc(trail)}`
      }
      if (/^@[\w.]+(@[\w.-]+)?$/.test(core)) {
        const handle = core.slice(1)
        const a = byHandle.get(handle) || byHandle.get(handle.split('@')[0])
        if (a) {
          if (!mentions.some(x => x.id === a.id))
            mentions.push({ id: a.id, username: a.username, url: a.url, acct: a.acct })
          return `<span class="h-card" translate="no"><a href="${a.url}" class="u-url mention">@<span>${esc(a.username)}</span></a></span>${esc(trail)}`
        }
      }
      return esc(tok)
    }).join('')
  })
  return { html: paras.map(p => `<p>${p}</p>`).join(''), mentions, tags: [...new Set(tags)] }
}
const DOMAIN_ORIGIN = ORIGIN
export { DOMAIN }
