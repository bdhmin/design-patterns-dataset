// Seeds Surmai with the data of an established family account (Seattle-based, ~3 years of trips).
// Everything goes through the app's REST API / custom routes. Run against a fresh pb_data:
//   SURMAI_URL=http://127.0.0.1:5402 node .ui-capture/seed/seed.mjs
import fs from 'node:fs';
import path from 'node:path';
import { api, superuserToken, userToken, listAll, create, update, place, airport, airline, saveEntity, wall } from './lib.mjs';
import { TRIPS } from './trips.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ADMIN = { email: 'admin@surmai.net', password: 'ChangeMe123' };

const USERS = [
  { key: 'maya', name: 'Maya Chen', email: 'maya@chenokafor.family', password: 'Wanderlust#2026', currencyCode: 'USD', timezone: 'America/Los_Angeles', mapsProvider: 'openstreetmap', websiteAppearance: 'light' },
  { key: 'sam', name: 'Sam Okafor', email: 'sam@chenokafor.family', password: 'Wanderlust#2026', currencyCode: 'USD', timezone: 'America/Los_Angeles', mapsProvider: 'google', websiteAppearance: 'auto' },
  { key: 'priya', name: 'Priya Natarajan', email: 'priya.natarajan@fastmail.com', password: 'Wanderlust#2026', currencyCode: 'USD', timezone: 'America/Los_Angeles', mapsProvider: 'google', websiteAppearance: 'dark' },
  { key: 'tomas', name: 'Tomás Ferreira', email: 'tomas.ferreira@gmail.com', password: 'Wanderlust#2026', currencyCode: 'EUR', timezone: 'Europe/Lisbon', mapsProvider: 'openstreetmap', websiteAppearance: 'auto' },
  { key: 'grace', name: 'Grace Whitfield', email: 'grace.whitfield@outlook.com', password: 'Wanderlust#2026', currencyCode: 'USD', timezone: 'America/Denver', mapsProvider: 'google', websiteAppearance: 'light' },
];

// traveller profiles: owner is the user the profile belongs to; managers can edit it
const PROFILES = [
  { key: 'maya', owner: 'maya', email: 'maya@chenokafor.family', legalName: 'Maya Lin Chen', passportId: '567214983', extra: [
    { key: 'known_traveller_number', label: 'Known Traveler Number (KTN)', value: 'TT74K2R9Q' },
    { key: 'alaska_mileage_plan', label: 'Alaska Mileage Plan', value: '218 445 907' },
    { key: 'seat_preference', label: 'Seat preference', value: 'Window, forward of the wing' },
  ] },
  { key: 'sam', owner: 'sam', managers: ['maya'], email: 'sam@chenokafor.family', legalName: 'Samuel Chukwuemeka Okafor', passportId: '548830172', extra: [
    { key: 'known_traveller_number', label: 'Known Traveler Number (KTN)', value: 'TT9P3M1XW' },
    { key: 'delta_skymiles', label: 'Delta SkyMiles', value: '9301 448 216' },
    { key: 'dietary', label: 'Dietary', value: 'No shellfish (allergy)' },
  ] },
  { key: 'leo', owner: 'maya', managers: ['sam'], email: 'leo.okafor.chen@chenokafor.family', legalName: 'Leo Adebayo Okafor-Chen', passportId: '591027734', extra: [
    { key: 'date_of_birth', label: 'Date of birth', value: '2017-03-08' },
    { key: 'alaska_mileage_plan', label: 'Alaska Mileage Plan', value: '230 118 552' },
  ] },
  { key: 'ivy', owner: 'maya', managers: ['sam'], email: 'ivy.okafor.chen@chenokafor.family', legalName: 'Ivy Mei Okafor-Chen', passportId: '591027735', extra: [
    { key: 'date_of_birth', label: 'Date of birth', value: '2020-07-22' },
    { key: 'notes', label: 'Notes', value: 'Needs booster seat for car rentals (under 8)' },
  ] },
  { key: 'helen', owner: 'maya', email: 'helen.chen1952@comcast.net', legalName: 'Helen Wei Chen', passportId: '', extra: [
    { key: 'medicare', label: 'Medicare #', value: '1EG4-TE5-MK73' },
    { key: 'mobility', label: 'Mobility', value: 'Request wheelchair assistance at airports' },
  ] },
  { key: 'priya', owner: 'priya', email: 'priya.natarajan@fastmail.com', legalName: 'Priya Natarajan', passportId: 'Z4471093', extra: [] },
  { key: 'tomas', owner: 'tomas', email: 'tomas.ferreira@gmail.com', legalName: 'Tomás Ribeiro Ferreira', passportId: 'CB118402', extra: [
    { key: 'tap_miles', label: 'TAP Miles&Go', value: '402 118 927' },
  ] },
];

const RATES = { USD: 1, EUR: 0.861, GBP: 0.758, JPY: 154.62, CAD: 1.398, MXN: 18.37, ISK: 126.4, CRC: 503.1, CHF: 0.795, AUD: 1.532, INR: 88.71, NZD: 1.743, ARS: 1418.5, CLP: 942.6 };

async function main() {
  const su = await superuserToken(ADMIN.email, ADMIN.password);

  // --- surmai settings: currency rates (the hourly job would fetch these from open.er-api.com)
  const existingRates = await listAll('currency_conversions', su);
  for (const [code, rate] of Object.entries(RATES)) {
    const ex = existingRates.find((r) => r.currencyCode === code);
    if (ex) await update('currency_conversions', ex.id, { conversionRate: rate }, su);
    else await create('currency_conversions', { currencyCode: code, conversionRate: rate }, su);
  }

  // --- users
  const users = {};
  for (const u of USERS) {
    const found = await listAll('users', su, `email="${u.email}"`);
    const { key, password, ...data } = u;
    users[key] = found[0] || (await create('users', { ...data, password, passwordConfirm: password, verified: true, emailVisibility: true }, su));
  }
  const tokens = {};
  for (const u of USERS) tokens[u.key] = await userToken(u.email, u.password);

  // --- traveller profiles
  const profiles = {};
  for (const p of PROFILES) {
    const found = await listAll('traveller_profiles', su, `email="${p.email}"`);
    profiles[p.key] =
      found[0] ||
      (await create('traveller_profiles', {
        email: p.email,
        legalName: p.legalName,
        passportId: p.passportId,
        ownerId: users[p.owner].id,
        managers: (p.managers || []).map((m) => users[m].id),
        additionalFields: p.extra,
      }, su));
  }

  // --- trips
  const ctx = { su, users, tokens, profiles };
  for (const t of TRIPS) await seedTrip(ctx, t);

  // --- demo trip archive shipped with the app, imported through the trip import route
  const existing = await listAll('trips', su, `name~"Costa Rica"`);
  if (!existing.length) {
    const zip = fs.readFileSync(path.join(HERE, '../../backend/datasets/demo_trip.zip'));
    const form = new FormData();
    form.append('tripData', new Blob([zip], { type: 'application/zip' }), 'costa-rica-2027.zip');
    const res = await api('POST', '/api/surmai/trip/import', { token: tokens.maya, form });
    const tripId = res.tripId || res.id;
    const imported = tripId ? { id: tripId } : (await listAll('trips', su, `name~"Costa Rica"`))[0];
    await update('trips', imported.id, {
      name: 'Costa Rica — Pura Vida',
      description: 'A week in Costa Rica with the kids: a bit of San José, rainforest and volcano around La Fortuna, then beach time near Liberia before flying home.',
      collaborators: [users.sam.id],
      travellers: [profiles.maya.id, profiles.sam.id, profiles.leo.id, profiles.ivy.id],
      budget: { value: 7500, currency: 'USD' },
    }, su);
  }

  // --- invitations: Priya invites Maya to her trip (still open), Grace's one was accepted earlier
  await seedInvitations(ctx);

  // --- announcements -> notifications (hook fans them out to every user)
  const ann = await listAll('announcements', su);
  if (!ann.length) {
    await create('announcements', {
      subject: 'Traveller profiles are here',
      text: 'Keep passport numbers, loyalty programs and known traveler numbers for everyone you travel with in one place.',
      message: '<p>Each person you travel with can now have a <strong>traveller profile</strong>. Add passport details, frequent flyer numbers and anything else you are tired of digging out of old emails, then attach profiles to trips, flights and hotel stays.</p><p>Profiles you manage for kids or relatives stay private to you and the other managers.</p>',
      sender: 'Surmai',
      expiry: '2027-03-01 00:00:00.000Z',
    }, su);
    await create('announcements', {
      subject: 'Maintenance window: Sunday Nov 22, 02:00–02:30 PT',
      text: 'The server will restart for an upgrade and a fresh backup. Offline copies of your trips keep working.',
      message: '<p>The server will be restarted on <strong>Sunday, November 22 between 2:00 and 2:30 AM Pacific</strong> to upgrade to the latest release and take a full backup.</p><p>Trips you have opened recently remain available offline during the window.</p>',
      sender: 'Admin',
      expiry: '2026-11-23 00:00:00.000Z',
    }, su);
  }
  const notes = await listAll('notifications', su, `userId="${users.maya.id}"`);
  if (!notes.some((n) => n.subject.startsWith('Sam shared'))) {
    await create('notifications', { userId: users.maya.id, subject: 'Sam shared “Maui Holidays” with you', text: 'Sam Okafor added you as a collaborator.', sender: 'Sam Okafor', read: true }, su);
    await create('notifications', { userId: users.maya.id, subject: 'Welcome to Surmai', text: 'Start by creating your first trip or importing one from a file.', sender: 'Surmai', read: true }, su);
  }
  console.log('seed complete');
}

async function seedTrip(ctx, t) {
  const { su, users, tokens, profiles } = ctx;
  const owner = t.owner || 'maya';
  const tok = tokens[owner];
  const found = await listAll('trips', su, `name="${t.name.replace(/"/g, '\\"')}"`);
  if (found.length) return;

  const destinations = [];
  for (const d of t.destinations || []) destinations.push(await place(su, ...d));

  const trip = await create('trips', {
    name: t.name,
    description: t.description || '',
    startDate: `${t.start} 08:00:00.000Z`,
    endDate: `${t.end} 07:59:59.999Z`,
    ownerId: users[owner].id,
    destinations,
    participants: [],
    collaborators: (t.collaborators || []).map((k) => users[k].id),
    travellers: (t.travellers || []).map((k) => profiles[k].id),
    notes: t.notes || '',
    budget: t.budget ? { value: t.budget[0], currency: t.budget[1] } : null,
  }, tok);
  const tv = (list) => (list || t.travellers || []).map((k) => profiles[k].id);

  for (const f of t.flights || []) {
    const [code, num, from, to, depD, depT, arrD, arrT, cost, cur, pnr, seats, extra] = f;
    const o = await airport(su, from);
    const d = await airport(su, to);
    const al = await airline(su, code);
    await saveEntity(tok, trip.id, 'transportation', {
      type: 'flight', origin: from, destination: to,
      cost: { value: cost, currency: cur },
      departureTime: wall(depD, depT), arrivalTime: wall(arrD, arrT),
      link: extra?.link || '', travellers: tv(extra?.travellers),
      metadata: { provider: al, reservation: pnr, origin: o, destination: d, flightNumber: `${code}${num}`, seats, notes: extra?.notes || '' },
    }, cost > 0 ? { name: `Flight: ${from} to ${to}`, cost: { value: cost, currency: cur }, occurredOn: wall(depD, depT), category: 'transportation' } : null);
  }

  for (const g of t.ground || []) {
    const { type, from, to, dep, arr, cost, cur, provider, reservation, notes, fromAddr, toAddr } = g;
    const o = from[1] ? await place(su, ...from) : null;
    const d = to[1] ? await place(su, ...to) : null;
    const oName = o ? o.name : from[0];
    const dName = d ? d.name : to[0];
    await saveEntity(tok, trip.id, 'transportation', {
      type, origin: oName, destination: dName,
      cost: { value: cost || 0, currency: cur || 'USD' },
      departureTime: wall(...dep), arrivalTime: wall(...arr), link: g.link || '', travellers: tv(g.travellers),
      metadata: { provider, reservation, origin: o || oName, destination: d || dName, originAddress: fromAddr || '', destinationAddress: toAddr || '', notes: notes || '' },
    }, cost > 0 ? { name: `Transportation: ${oName} -> ${dName}`, cost: { value: cost, currency: cur }, occurredOn: wall(...dep), category: 'transportation' } : null);
  }

  for (const r of t.rentals || []) {
    const pl = await place(su, ...r.place);
    await saveEntity(tok, trip.id, 'transportation', {
      type: 'rental_car', origin: r.pickup, destination: r.dropoff, link: '', travellers: tv(r.travellers),
      cost: { value: r.cost, currency: r.cur },
      departureTime: wall(...r.dep), arrivalTime: wall(...r.arr),
      metadata: { confirmationCode: r.confirmation, rentalCompany: r.company, place: pl, notes: r.notes || '' },
    }, { name: `Car Rental: ${r.company}`, cost: { value: r.cost, currency: r.cur }, occurredOn: wall(...r.dep), category: 'transportation' });
  }

  for (const l of t.lodgings || []) {
    const pl = await place(su, ...l.place);
    await saveEntity(tok, trip.id, 'lodging', {
      type: l.type || 'hotel', name: l.name, address: l.address,
      startDate: wall(l.in, l.inT || '15:00'), endDate: wall(l.out, l.outT || '11:00'),
      confirmationCode: l.confirmation || '', link: l.link || '', travellers: tv(l.travellers),
      cost: { value: l.cost || 0, currency: l.cur || 'USD' },
      metadata: { place: pl, notes: l.notes || '' },
    }, l.cost > 0 ? { name: `Lodging: ${l.name}`, cost: { value: l.cost, currency: l.cur }, occurredOn: wall(l.in, l.inT || '15:00'), category: 'lodging' } : null);
  }

  for (const a of t.activities || []) {
    const pl = await place(su, ...a.place);
    await saveEntity(tok, trip.id, 'activity', {
      name: a.name, description: a.description || '', address: a.address || '',
      startDate: wall(...a.start), endDate: a.end ? wall(...a.end) : '',
      link: a.link || '', travellers: tv(a.travellers),
      cost: { value: a.cost || 0, currency: a.cur || 'USD' },
      confirmationCode: a.confirmation || '',
      metadata: { place: pl },
    }, a.cost > 0 ? { name: `Activity: ${a.name}`, cost: { value: a.cost, currency: a.cur }, occurredOn: wall(...a.start), category: 'activities' } : null);
  }

  for (const e of t.expenses || []) {
    const [name, category, date, value, cur, notes, split] = e;
    let splits = [];
    if (split) {
      const keys = split === true ? t.travellers.filter((k) => ['maya', 'sam', 'priya', 'tomas', 'grace'].includes(k)) : split;
      const share = Math.floor((value / keys.length) * 100) / 100;
      splits = keys.map((k, i) => ({ travellerId: profiles[k].id, amount: i === 0 ? Math.round((value - share * (keys.length - 1)) * 100) / 100 : share }));
    }
    await create('trip_expenses', { name, trip: trip.id, category, occurredOn: wall(date, '12:00'), cost: { value, currency: cur }, notes: notes || '', splits }, tok);
  }
}

async function seedInvitations({ su, users, tokens }) {
  const inv = await listAll('invitations', su);
  if (inv.length) return;
  const priyaTrip = (await listAll('trips', su, `name="Joshua Tree Birthday Weekend"`))[0];
  if (priyaTrip) {
    await api('POST', '/api/collections/invitations/records', {
      token: tokens.priya,
      body: { message: 'Maya!! Come camp with us for my 40th. Sam can have the kids that weekend, right? 🌵', from: users.priya.id, recipientEmail: 'maya@chenokafor.family', status: 'open', trip: priyaTrip.id, expiresOn: '2026-12-15 00:00:00.000Z' },
    }).catch((e) => console.warn('invitation (priya):', e.message));
  }
  const graceTrip = (await listAll('trips', su, `name="Moab & Arches Long Weekend"`))[0];
  if (graceTrip) {
    await api('POST', '/api/collections/invitations/records', {
      token: tokens.grace,
      body: { message: 'Bringing the Subaru — you two just need to get to SLC.', from: users.grace.id, recipientEmail: 'maya@chenokafor.family', status: 'open', trip: graceTrip.id, expiresOn: '2027-01-20 00:00:00.000Z' },
    }).catch((e) => console.warn('invitation (grace):', e.message));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
