// Seeds Get It. through its own HTTP API (uploads, detection + viz jobs via
// the fake Codex), then writes the study journal / knowledge-graph files in
// the app's on-disk schema with realistic dates. Usage:
//   SEED_URL=http://localhost:5401 GETIT_DATA_DIR=... node seed.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MD_DOCS } from "./docs-md.mjs";
import { BANK_DOCS } from "./bank-src.mjs";
import { STUDY } from "./study-src.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL0 = process.env.SEED_URL || "http://localhost:5401";
const DATA = process.env.GETIT_DATA_DIR;
const ONLY_BANK = process.argv.includes("--bank-only");

// ── 1. bank.json for the fake codex ───────────────────────────────────
const bank = {
  docs: BANK_DOCS.map((d) => ({
    title: d.title,
    concepts: d.concepts,
    cards: STUDY[d.id]?.cards?.length >= 4 ? STUDY[d.id].cards : undefined,
    quiz: STUDY[d.id]?.quiz?.length >= 4 ? STUDY[d.id].quiz : undefined,
  })),
};
fs.writeFileSync(path.join(HERE, "..", "stubs", "bank.json"), JSON.stringify(bank));
console.log("bank.json written");
if (ONLY_BANK) process.exit(0);

const DAY = 86400000;
const NOW = Date.parse("2026-11-15T17:40:00+01:00");
const at = (iso) => Date.parse(iso);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// id, upload source, uploadedAt, lastOpenedAt, mastery (null = no KG), viz share
const PLAN = [
  { id: "physics", sample: "physics", up: "2026-09-08T21:14", open: "2026-10-19T16:02", m: 0.55, viz: 1 },
  { id: "costituzione", sample: "costituzione", up: "2026-09-08T21:20", open: "2026-09-08T21:26", m: null, viz: 0.5 },
  { id: "anatomy", sample: "anatomy", up: "2026-09-09T10:41", open: "2026-10-02T18:30", m: 0.7, viz: 1 },
  { id: "chemistry", sample: "chemistry", up: "2026-09-09T10:55", open: "2026-09-12T09:10", m: 0.3, viz: 0.75 },
  { id: "calculus", sample: "calculus", up: "2026-09-10T15:03", open: "2026-10-28T11:47", m: 0.66, viz: 1 },
  { id: "membrane", md: 1, up: "2026-09-23T19:12", open: "2026-10-14T22:05", m: 0.8, viz: 1 },
  { id: "linalg", md: 4, up: "2026-10-01T14:30", open: "2026-11-12T20:41", m: 0.6, viz: 1 },
  { id: "thermo", md: 6, up: "2026-10-06T09:18", open: "2026-11-02T17:15", m: 0.42, viz: 0.75 },
  { id: "bayes", md: 5, up: "2026-10-15T16:44", open: "2026-11-13T15:20", m: 0.5, viz: 1 },
  { id: "neuro", md: 0, up: "2026-10-20T08:52", open: "2026-11-14T23:12", m: 0.62, viz: 1 },
  { id: "enzyme", md: 2, up: "2026-10-27T13:05", open: "2026-11-10T10:33", m: 0.38, viz: 0.6 },
  { id: "fourier", md: 3, up: "2026-11-05T18:20", open: "2026-11-15T16:58", m: 0.24, viz: 0.8 },
  { id: "micro", md: 7, up: "2026-11-14T12:02", open: null, m: null, viz: 0 },
];

async function api(p, opts = {}) {
  const r = await fetch(URL0 + p, opts);
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { raw: t, status: r.status }; }
}

// ── 2. uploads ────────────────────────────────────────────────────────
const docIds = {};
for (const p of PLAN) {
  const fd = new FormData();
  if (p.sample) fd.append("sample", p.sample);
  else {
    const d = MD_DOCS[p.md];
    fd.append("file", new Blob([d.md], { type: "text/markdown" }), d.file);
  }
  const res = await api("/api/upload", { method: "POST", body: fd });
  if (!res.docId) { console.error("upload failed", p.id, res); process.exit(1); }
  docIds[p.id] = res.docId;
  console.log("uploaded", p.id, res.docId, res.numPages, "pages");
}

// ── 3. detection + viz through the jobs API ───────────────────────────
for (const p of PLAN) {
  if (!p.open) continue;
  const id = docIds[p.id];
  await api(`/api/jobs/detect/${id}`, { method: "POST" });
  const meta = await api(`/api/doc/${id}`);
  const numPages = meta.numPages || meta.pages?.length || 1;
  for (let i = 0; i < 80; i++) {
    const t = await api(`/api/tags/${id}`);
    const f = t.file || t;
    if ((f.pagesAnalyzed || []).length >= numPages) break;
    await sleep(500);
  }
  const t = await api(`/api/tags/${id}`);
  const tags = (t.file || t).tags || [];
  const want = Math.round(tags.length * p.viz);
  for (const tag of tags.slice(0, want)) {
    await api(`/api/jobs/viz/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tagId: tag.id }) });
  }
  for (let i = 0; i < 80 && want; i++) {
    const tt = await api(`/api/tags/${id}`);
    const ts = (tt.file || tt).tags || [];
    if (ts.filter((x) => x.ready || x.error).length >= want) break;
    await sleep(500);
  }
  console.log("tags", p.id, tags.length, "viz requested", want);
}
await sleep(1500);

// ── 4. on-disk journal, KG, dates ─────────────────────────────────────
const rnd = (() => { let s = 42; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
const uid = () => "s" + Math.floor(rnd() * 1e12).toString(36) + Math.floor(rnd() * 1e6).toString(36);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

const NOTES_HI = ["Explains it unprompted and applies it to new cases; keep it warm with spaced review.", "Strong: correct on every quiz item and used it in own words in chat.", "Solid recall and a clean Feynman explanation — ready for exam-style problems."];
const NOTES_MID = ["Recalls the definition but hesitated applying it to an unseen example.", "Good recognition on quizzes; explanations still lean on the textbook's wording.", "Understands the idea, but confuses it with a neighbouring concept under time pressure."];
const NOTES_LO = ["Only seen while reading — no flashcard or quiz evidence yet.", "Missed both quiz items on this; revisit the worked example on the page.", "Not yet tested."];

function writeJson(p, obj, mtime) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  if (mtime) fs.utimesSync(p, new Date(mtime), new Date(mtime));
}

const index = JSON.parse(fs.readFileSync(path.join(DATA, "docs.json"), "utf8"));
for (const p of PLAN) {
  const id = docIds[p.id];
  const dir = path.join(DATA, "docs", id);
  const up = at(p.up + ":00+01:00");
  const open = p.open ? at(p.open + ":00+01:00") : null;
  const bankDoc = BANK_DOCS.find((b) => b.id === p.id);
  const study = STUDY[p.id] || { extraNodes: [], cards: [], quiz: [], chats: [] };
  const span = (open ?? up) - up;
  const tAt = (f) => Math.round(up + span * f);

  // meta + index dates
  const metaP = path.join(dir, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaP, "utf8"));
  meta.uploadedAt = up;
  meta.lastOpenedAt = open;
  writeJson(metaP, meta, open ?? up);
  const row = index.docs.find((d) => d.id === id);
  Object.assign(row, { uploadedAt: up, lastOpenedAt: open });

  // tags: active tag + one failed viz for realism
  const tagsP = path.join(dir, "tags.json");
  if (fs.existsSync(tagsP)) {
    const tf = JSON.parse(fs.readFileSync(tagsP, "utf8"));
    tf.savedAt = open ?? up;
    const ready = tf.tags.filter((t) => t.ready);
    tf.activeTagId = ready.length ? ready[Math.min(1, ready.length - 1)].id : null;
    if (p.id === "thermo") {
      const pending = tf.tags.find((t) => !t.ready && t.type === "2d-anim") || tf.tags.find((t) => !t.ready);
      if (pending) { pending.error = "The generated scene failed to compile after 4 attempts (SyntaxError: Unexpected token ')')."; pending.attempts = 4; }
    }
    writeJson(tagsP, tf, open ?? up);
  }

  if (!open) continue;

  // knowledge graph
  if (p.m != null) {
    const nodes = [];
    for (const c of bankDoc.concepts) nodes.push({ id: slug(c.label), label: c.label, summary: c.context.slice(0, 270), pageHints: [1] });
    for (const [nid, label, summary, pages] of study.extraNodes) nodes.push({ id: nid, label, summary, pageHints: pages });
    const evalCount = Math.max(1, Math.round(p.m * 22 + rnd() * 5));
    for (const n of nodes) {
      const base = p.m * 100 + (rnd() - 0.5) * 50;
      const untouched = rnd() < 0.12 && p.m < 0.6;
      n.evaluation = untouched
        ? { memory: 0, comprehension: 0, structure: 0, application: 0 }
        : { memory: clamp(base + 12 + rnd() * 10), comprehension: clamp(base + rnd() * 10 - 2), structure: clamp(base - 8 + rnd() * 12), application: clamp(base - 15 + rnd() * 12) };
      const avg = (n.evaluation.memory + n.evaluation.comprehension + n.evaluation.application) / 3;
      const pool = untouched ? NOTES_LO : avg > 70 ? NOTES_HI : avg > 35 ? NOTES_MID : NOTES_LO;
      n.evaluatorNote = pool[Math.floor(rnd() * pool.length)];
    }
    const edges = [];
    for (let i = 1; i < nodes.length; i++) {
      edges.push({ source: nodes[Math.floor(rnd() * i)].id, target: nodes[i].id, relation: ["explains", "is a consequence of", "requires", "is measured by", "is an example of", "contrasts with"][Math.floor(rnd() * 6)] });
    }
    for (let k = 0; k < Math.floor(nodes.length / 3); k++) {
      const a = nodes[Math.floor(rnd() * nodes.length)].id, b = nodes[Math.floor(rnd() * nodes.length)].id;
      if (a !== b && !edges.some((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a))) edges.push({ source: a, target: b, relation: "is related to" });
    }
    const weakest = nodes.slice().sort((a, b) => a.evaluation.application - b.evaluation.application)[0];
    const kg = {
      v: 1, docId: id, status: "ready", buildAt: up + 90000, lastEvaluatedAt: open - 120000, evaluationCount: evalCount,
      nodes, edges,
      globalNote: p.m > 0.6
        ? `Most of the map is solid — recall and comprehension are well ahead. The gap is application: "${weakest.label}" still breaks down on unseen problems. A short quiz on it is the best next step.`
        : p.m > 0.4
          ? `Halfway there. Definitions are in place, but links between concepts are shaky. Focus on "${weakest.label}" and try explaining how it connects to its neighbours.`
          : `Early days: most nodes have only been read, not tested. Start with flashcards on the core definitions, then one quiz to calibrate.`,
    };
    writeJson(path.join(dir, "kg.json"), kg, open - 120000);
  }

  // work context
  const wc = { v: 1, docId: id, chats: [], flashcards: [], quizzes: [], feynman: [] };
  study.chats.forEach((c, i) => {
    const start = tAt(0.35 + 0.5 * (i / Math.max(1, study.chats.length)));
    const messages = c.msgs.map(([role, content], k) => ({ role, content, ts: start + k * 95000 + Math.floor(rnd() * 40000) }));
    wc.chats.push({ id: uid(), title: c.title, createdAt: start, updatedAt: messages[messages.length - 1].ts, messages });
  });
  if (study.cards.length) {
    const sessions = p.m > 0.55 ? 3 : p.m > 0.35 ? 2 : 1;
    for (let s = 0; s < sessions; s++) {
      const created = tAt(0.2 + 0.7 * (s / sessions));
      const unfinished = s === sessions - 1 && p.id === "fourier";
      const cards = study.cards.map((c, k) => {
        if (unfinished && k >= 3) return { ...c };
        const good = rnd() < p.m + s * 0.12;
        return { ...c, userAnswer: good ? c.a.split(/[.:;]/)[0].toLowerCase() : (rnd() < 0.5 ? "not sure" : "i think it's the opposite?"), rating: good ? (rnd() < 0.5 ? 4 : 3) : (rnd() < 0.5 ? 2 : 1), answeredAt: created + (k + 1) * 50000 };
      });
      wc.flashcards.push({ id: uid(), topic: s === 0 ? "all" : bankDoc.concepts[s % bankDoc.concepts.length].label, createdAt: created, endedAt: unfinished ? undefined : created + cards.length * 50000 + 20000, cards });
    }
  }
  if (study.quiz.length) {
    const sessions = p.m > 0.5 ? 2 : 1;
    for (let s = 0; s < sessions; s++) {
      const created = tAt(0.4 + 0.5 * (s / sessions));
      const questions = study.quiz.map((q, k) => {
        const right = rnd() < p.m + s * 0.15;
        return { ...q, chosenIndex: right ? q.correctIndex : (q.correctIndex + 1 + Math.floor(rnd() * 3)) % 4, answeredAt: created + (k + 1) * 70000 };
      });
      wc.quizzes.push({ id: uid(), topic: "all", createdAt: created, endedAt: created + questions.length * 70000 + 15000, questions });
    }
  }
  (study.feynman || []).forEach((f, i) => {
    const created = tAt(0.75 + i * 0.1);
    wc.feynman.push({ id: uid(), topic: f.topic, createdAt: created, endedAt: created + f.turns.length * 180000, turns: f.turns.map(([cp, ue], k) => ({ childPrompt: cp, userExplanation: ue, ts: created + (k + 1) * 170000 })), summary: f.summary });
  });
  const hasWork = wc.chats.length + wc.flashcards.length + wc.quizzes.length + wc.feynman.length;
  if (hasWork) writeJson(path.join(dir, "workctx.json"), wc, open - 60000);
  console.log("journal", p.id, { chats: wc.chats.length, decks: wc.flashcards.length, quizzes: wc.quizzes.length, feynman: wc.feynman.length });
}
writeJson(path.join(DATA, "docs.json"), index);

// Returning user: launch popups already dismissed, settings saved once.
writeJson(path.join(DATA, "welcome.json"), { dismissed: { welcome: "0.0.0", community: "0.0.0" }, savedAt: at("2026-09-08T21:10:00+01:00") });
console.log("done", NOW > 0);
