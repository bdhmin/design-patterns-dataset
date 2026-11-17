// Core identity of the local Mastodon stub ("Harbor Social", served at localhost:4410).
export const SERVER = 'localhost:4410'
export const ORIGIN = `http://${SERVER}`
export const DOMAIN = 'harbor.social'
export const TOKEN = 'hs_9Qm3vX2pLr7TzK1bYw8NcE4uJd6HaF0sGi5oPkRtVe'

export const ME = {
  id: '109331842207715321',
  username: 'maren',
  acct: 'maren',
  displayName: 'Maren Lindqvist',
  locked: false,
  bot: false,
  discoverable: true,
  group: false,
  createdAt: '2022-11-07T18:22:41.000Z',
  note: '<p>Urban ecologist in Gothenburg 🌿 Studying pollinators on green roofs. Weekend sourdough, weekday bike commuter. She/her.</p><p>Posts in English &amp; Swedish. <a href="http://localhost:4410/tags/GreenRoofs" class="mention hashtag" rel="tag">#<span>GreenRoofs</span></a> <a href="http://localhost:4410/tags/Pollinators" class="mention hashtag" rel="tag">#<span>Pollinators</span></a></p>',
  url: 'http://localhost:4410/@maren',
  avatar: 'http://localhost:4410/media/avatars/maren.svg',
  avatarStatic: 'http://localhost:4410/media/avatars/maren.svg',
  header: 'http://localhost:4410/media/photos/tibet-2.jpg',
  headerStatic: 'http://localhost:4410/media/photos/tibet-2.jpg',
  followersCount: 1284,
  followingCount: 312,
  statusesCount: 2147,
  lastStatusAt: '2026-11-15',
  emojis: [],
  fields: [],
}

export function instanceV2() {
  return {
    domain: DOMAIN,
    title: 'Harbor Social',
    version: '4.3.2',
    sourceUrl: 'https://github.com/mastodon/mastodon',
    description: 'A friendly Mastodon server for people around the North Sea and Baltic: scientists, makers, cyclists, cooks and the generally curious.',
    usage: { users: { activeMonth: 4812 } },
    thumbnail: { url: `${ORIGIN}/media/photos/tibet-9.jpg`, blurhash: null, versions: {} },
    icon: [],
    languages: ['en', 'sv', 'da', 'nb', 'de'],
    configuration: {
      urls: { streaming: '', status: null },
      vapid: { publicKey: '' },
      accounts: { maxFeaturedTags: 10, maxPinnedStatuses: 5 },
      statuses: { maxCharacters: 500, maxMediaAttachments: 4, charactersReservedPerUrl: 23 },
      mediaAttachments: { supportedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'], imageSizeLimit: 16777216, imageMatrixLimit: 33177600, videoSizeLimit: 103809024, videoFrameRateLimit: 120, videoMatrixLimit: 8294400 },
      polls: { maxOptions: 4, maxCharactersPerOption: 50, minExpiration: 300, maxExpiration: 2629746 },
      translation: { enabled: false },
    },
    registrations: { enabled: true, approvalRequired: true, message: null },
    apiVersions: { mastodon: 2 },
    contact: { email: 'moderators@harbor.social', account: null },
    rules: [
      { id: '1', text: 'Be kind. No harassment, hate speech or discrimination.', hint: '' },
      { id: '2', text: 'Use content warnings for politics, food and lewd content.', hint: '' },
      { id: '3', text: 'Add alt text to your images where you can.', hint: '' },
      { id: '4', text: 'No unmarked automated accounts.', hint: '' },
    ],
  }
}
