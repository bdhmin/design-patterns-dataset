// Small REST helpers for seeding Surmai through its own PocketBase API.
export const BASE = process.env.SURMAI_URL || 'http://127.0.0.1:5402';

export async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = token;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

export async function superuserToken(email, password) {
  const r = await api('POST', '/api/collections/_superusers/auth-with-password', {
    body: { identity: email, password },
  });
  return r.token;
}

export async function userToken(email, password) {
  const r = await api('POST', '/api/collections/users/auth-with-password', {
    body: { identity: email, password },
  });
  return r.token;
}

export async function listAll(collection, token, filter = '', extra = '') {
  const q = new URLSearchParams({ perPage: '500', filter });
  const r = await api('GET', `/api/collections/${collection}/records?${q}${extra}`, { token });
  return r.items;
}

export const create = (collection, body, token) =>
  api('POST', `/api/collections/${collection}/records`, { token, body });
export const update = (collection, id, body, token) =>
  api('PATCH', `/api/collections/${collection}/records/${id}`, { token, body });
export const del = (collection, id, token) => api('DELETE', `/api/collections/${collection}/records/${id}`, { token });

// "Fake UTC": Surmai stores wall-clock times of the place as if they were UTC.
export const wall = (d, hhmm = '00:00') => `${d}T${hhmm}:00Z`;

const placeCache = new Map();
export async function place(token, name, country, state) {
  const key = `${name}|${country}|${state || ''}`;
  if (placeCache.has(key)) return placeCache.get(key);
  let filter = `name="${name}" && countryName="${country}"`;
  if (state) filter += ` && stateName="${state}"`;
  const items = await listAll('places', token, filter);
  if (!items.length) throw new Error(`place not found: ${key}`);
  const p = items[0];
  const v = {
    id: p.id,
    name: p.name,
    stateName: p.stateName,
    countryName: p.countryName,
    latitude: p.latitude,
    longitude: p.longitude,
    timezone: p.timezone,
  };
  placeCache.set(key, v);
  return v;
}

const airportCache = new Map();
export async function airport(token, iata) {
  if (airportCache.has(iata)) return airportCache.get(iata);
  const items = await listAll('airports', token, `iataCode="${iata}"`);
  if (!items.length) throw new Error(`airport not found: ${iata}`);
  const a = items[0];
  const v = {
    id: a.id,
    name: a.name,
    iataCode: a.iataCode,
    countryCode: a.isoCountry,
    latitude: a.latitude,
    longitude: a.longitude,
    timezone: a.timezone,
  };
  airportCache.set(iata, v);
  return v;
}

const airlineCache = new Map();
export async function airline(token, code) {
  if (airlineCache.has(code)) return airlineCache.get(code);
  const items = await listAll('airlines', token, `code="${code}"`);
  if (!items.length) throw new Error(`airline not found: ${code}`);
  const a = items[0];
  const v = { id: a.id, name: a.name, code: a.code, logo: a.logo };
  airlineCache.set(code, v);
  return v;
}

// POST /api/surmai/trip/{id}/save-{kind} — the same multipart endpoint the UI uses,
// which also creates the linked trip_expenses record.
export async function saveEntity(token, tripId, kind, entityData, expense, files = []) {
  const form = new FormData();
  form.append(
    'payload',
    JSON.stringify({
      entityId: '',
      expense: expense || undefined,
      existingExpenseId: '',
      existingAttachmentIds: [],
      entityData: { ...entityData, trip: tripId },
    })
  );
  files.forEach((f, i) => form.append(`file_${i}`, new Blob([f.data], { type: f.type }), f.name));
  return api('POST', `/api/surmai/trip/${tripId}/save-${kind}`, { token, form });
}
