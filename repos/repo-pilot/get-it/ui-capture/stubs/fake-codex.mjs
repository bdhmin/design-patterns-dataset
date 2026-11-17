#!/usr/bin/env node
/**
 * Local stand-in for the `codex` CLI binary that @openai/codex-sdk spawns.
 * Wired in via CODEX_BINARY_PATH (see ../start.sh). Implements:
 *
 *   codex exec --experimental-json [--output-schema F] [... resume <id>]
 *       → reads the prompt on stdin, emits the JSONL event stream the SDK
 *         expects, with a final agent_message whose text is JSON matching
 *         the output schema (detection, viz specs, KG, chat, flashcards,
 *         quizzes, Feynman).
 *   codex app-server   → JSON-RPC `account/rateLimits/read` (plan limits)
 *   codex logout       → no-op
 *
 * Content comes from bank.json (concepts written for the seeded study
 * documents) with heuristic fallbacks for anything else the user uploads.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BANK = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(HERE, "bank.json"), "utf8"));
  } catch {
    return { docs: [] };
  }
})();
const ALL_CONCEPTS = BANK.docs.flatMap((d) => d.concepts.map((c) => ({ ...c, doc: d.title })));

const argv = process.argv.slice(2);

// ── app-server (rate limits) ────────────────────────────────────────────
if (argv[0] === "app-server") {
  let buf = "";
  const now = Math.floor(Date.now() / 1000);
  process.stdin.on("data", (c) => {
    buf += c.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id === 1) {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { userAgent: "codex_cli_rs/0.130.0" } }) + "\n");
      } else if (msg.id === 2) {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0", id: 2,
          result: {
            rateLimits: {
              planType: "plus",
              primary: { usedPercent: 37, windowDurationMins: 300, resetsAt: now + 2 * 3600 + 14 * 60 },
              secondary: { usedPercent: 62, windowDurationMins: 10080, resetsAt: now + 2 * 86400 + 5 * 3600 },
              credits: { hasCredits: false, unlimited: false, balance: "0" },
              rateLimitReachedType: null,
            },
          },
        }) + "\n");
      }
    }
  });
  process.stdin.on("end", () => process.exit(0));
  setTimeout(() => process.exit(0), 20000);
} else if (argv[0] === "logout" || argv[0] === "login") {
  process.exit(0);
} else if (argv[0] === "--version") {
  console.log("codex-cli 0.130.0");
  process.exit(0);
} else if (argv[0] === "exec") {
  runExec().catch((e) => {
    process.stderr.write(String(e?.stack || e));
    process.exit(1);
  });
} else {
  process.stderr.write("fake codex: unsupported args " + argv.join(" ") + "\n");
  process.exit(2);
}

// ── exec ────────────────────────────────────────────────────────────────
function argVal(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

function hash(s) {
  return parseInt(crypto.createHash("md5").update(s).digest("hex").slice(0, 8), 16);
}

async function runExec() {
  const prompt = await readStdin();
  const schemaFile = argVal("--output-schema");
  const schema = schemaFile ? JSON.parse(fs.readFileSync(schemaFile, "utf8")) : {};
  const cd = argVal("--cd") || process.cwd();
  const ri = argv.indexOf("resume");
  const resumeId = ri >= 0 ? argv[ri + 1] : null;
  const threadId = resumeId || crypto.randomUUID();

  // Persist thread context so resumed chat turns can still see the document.
  const stateDir = path.join(cd, ".fake-codex-threads");
  fs.mkdirSync(stateDir, { recursive: true });
  const stateFile = path.join(stateDir, threadId + ".txt");
  let context = prompt;
  if (resumeId) {
    try { context = fs.readFileSync(stateFile, "utf8") + "\n\n" + prompt; } catch { /* fresh */ }
  }
  fs.writeFileSync(stateFile, context.slice(-400000));

  const out = respond(schema, prompt, context);
  const text = JSON.stringify(out);
  // Feel like a real model: brief think time.
  await new Promise((r) => setTimeout(r, 400 + (hash(prompt) % 900)));

  const emit = (o) => process.stdout.write(JSON.stringify(o) + "\n");
  emit({ type: "thread.started", thread_id: threadId });
  emit({ type: "turn.started" });
  emit({ type: "item.completed", item: { id: "item_0", type: "agent_message", text } });
  const inTok = Math.round(prompt.length / 3.8);
  emit({
    type: "turn.completed",
    usage: {
      input_tokens: inTok,
      cached_input_tokens: Math.round(inTok * 0.6),
      output_tokens: Math.round(text.length / 3.6) + 180,
    },
  });
}

// ── dispatch on schema shape ────────────────────────────────────────────
function respond(schema, prompt, context) {
  const props = schema.properties || {};
  if (props.concepts) return detect(prompt, !!props.concepts.items?.properties?.page);
  if (props.type && props.type.const) return viz(props.type.const, prompt);
  if (props.nodes) return kgBuild(prompt);
  if (props.updates) return kgEvaluate(prompt);
  if (props.reply) return chat(prompt, context);
  if (props.cards) return flashcards(prompt);
  if (props.questions) return quiz(prompt);
  if (props.childPrompt) return feynmanChild(prompt);
  if (props.summary) return feynmanSummary(prompt);
  return {};
}

// ── helpers ─────────────────────────────────────────────────────────────
const norm = (s) => s.replace(/\s+/g, " ").trim();

function sentences(text) {
  return norm(text)
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9"“(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

function docText(prompt) {
  const m = prompt.match(/DOCUMENT TEXT:\n([\s\S]*?)(?:\n\n(?:TOPIC:|---|GRAPH|KEY CONCEPTS)|$)/);
  return m ? m[1] : prompt;
}

function docTitle(prompt) {
  const m = prompt.match(/DOCUMENT: (.+)/);
  return m ? m[1].trim() : "this document";
}

function bankDocFor(text) {
  const low = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const d of BANK.docs) {
    let score = 0;
    for (const c of d.concepts) if (low.includes(c.key.toLowerCase())) score++;
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}

function anchorFor(pageText, key) {
  const t = norm(pageText);
  const i = t.toLowerCase().indexOf(key.toLowerCase());
  if (i < 0) return null;
  const end = i + key.length;
  let start = Math.max(0, end - 70);
  while (start > 0 && start < i && t[start - 1] !== " ") start++;
  let a = t.slice(start, end).trim();
  if (a.length < 12) a = t.slice(Math.max(0, end - 40), end).trim();
  return a.length >= 12 ? a : null;
}

function keywords(s) {
  const stop = new Set("the a an of and or to in on for is are was were be by with as at from that this what why how which who does do can could would should it its into about explain me my i you your than then there their our we".split(" "));
  return (s.toLowerCase().match(/[a-zà-ÿ0-9']{3,}/g) || []).filter((w) => !stop.has(w));
}

function bestSentences(text, query, n = 3) {
  const q = new Set(keywords(query));
  const scored = sentences(text).map((s, i) => {
    const ws = keywords(s);
    let sc = 0;
    for (const w of ws) if (q.has(w)) sc++;
    return { s, i, sc };
  });
  scored.sort((a, b) => b.sc - a.sc || a.i - b.i);
  return scored.slice(0, n).filter((x) => x.sc > 0).map((x) => x.s);
}

// ── detection ───────────────────────────────────────────────────────────
function detect(prompt, batched) {
  const parts = prompt.split(/===== PAGE_INDEX (\d+) =====\n/);
  const pages = [];
  for (let i = 1; i < parts.length; i += 2) {
    pages.push({ page: Number(parts[i]), text: parts[i + 1].split("\n--- END PAGES ---")[0] });
  }
  if (!pages.length) pages.push({ page: 0, text: prompt });
  const concepts = [];
  for (const p of pages) {
    const found = [];
    for (const c of ALL_CONCEPTS) {
      if (found.length >= 5) break;
      if (found.some((f) => f.label === c.label) || concepts.some((f) => f.label === c.label)) continue;
      const a = anchorFor(p.text, c.key);
      if (!a) continue;
      found.push({ page: p.page, label: c.label, type: c.type, anchor: a, context: c.context });
    }
    if (!found.length) found.push(...genericConcepts(p));
    concepts.push(...found);
  }
  const out = concepts.slice(0, batched ? 28 : 6);
  return { concepts: batched ? out : out.map(({ page, ...r }) => r) };
}

function genericConcepts(p) {
  const ss = sentences(p.text).filter((s) => s.length > 60);
  const picks = [ss[0], ss[Math.floor(ss.length / 2)]].filter(Boolean);
  const types = ["2d-text", "graph", "formula"];
  return [...new Set(picks)].map((s, i) => {
    const words = s.replace(/[^\p{L}\p{N}\s-]/gu, "").split(/\s+/).filter((w) => w.length > 3);
    const label = words.slice(0, 3).join(" ").slice(0, 40) || "Key idea";
    const anchor = s.slice(-70).replace(/^\S*\s/, "");
    return {
      page: p.page,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      type: types[(hash(s) + i) % types.length],
      anchor: anchor.length >= 12 ? anchor : s.slice(0, 60),
      context: s.slice(0, 560),
    };
  });
}

// ── visualizations ──────────────────────────────────────────────────────
function vizField(prompt, name) {
  const m = prompt.match(new RegExp("\\n" + name + ": (.*)"));
  return m ? m[1].trim() : "";
}

function viz(type, prompt) {
  const label = vizField(prompt, "CONCEPT") || "Concept";
  const ctx = vizField(prompt, "CONTEXT") || label;
  const c = ALL_CONCEPTS.find((x) => x.label === label);
  const spec = c && c.spec ? c.spec : {};
  const title = spec.title || label;
  const caption = spec.caption || (ctx.length > 200 ? ctx.slice(0, 197).replace(/\s\S*$/, "") + "…" : ctx);
  switch (type) {
    case "3d":
      return { type, title, caption, setup_code: threeD(spec.scene || "cluster", hash(label)) };
    case "2d-anim":
      return { type, title, caption, setup_code: twoD(spec.anim || "wave", title) };
    case "formula":
      return {
        type, title, caption,
        main_latex: spec.main_latex || "f(x) = \\sum_{k=0}^{n} a_k x^k",
        steps: spec.steps || [
          { latex: spec.main_latex || "f(x)", explanation: "Start from the relation stated in the text." },
          { latex: "\\text{identify each symbol}", explanation: "Name every quantity and its unit before manipulating anything." },
          { latex: "\\text{check limiting cases}", explanation: "Plug in an extreme value (0, ∞) to confirm the behaviour makes sense." },
        ],
      };
    case "graph":
      return {
        type, title, caption,
        chart_type: spec.chart_type || "function",
        x_label: spec.x_label || "x",
        y_label: spec.y_label || "y",
        data_json: JSON.stringify(spec.data || { fn: "Math.sin(x)", x_min: -6.28, x_max: 6.28, samples: 200 }),
      };
    case "2d-text":
    default:
      return {
        type: "2d-text", title, caption,
        body_markdown: spec.body_markdown || `**${label}**\n\n${ctx}\n\nIn short: this is one of the load-bearing ideas of the chapter — everything that follows assumes you can restate it in your own words [1].`,
        citations: spec.citations || [
          { label: "[1]", source: "Wikipedia — " + label, url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(label.replace(/\s+/g, "_")) },
        ],
      };
  }
}

function threeD(scene, seed) {
  const common = "camera.position.set(0, 1.4, 5);\nscene.background = new THREE.Color('#fafafa');\nscene.add(new THREE.AmbientLight(0xffffff, 0.7));\nvar dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(3, 5, 4); scene.add(dl);\n";
  if (scene === "tetra") {
    return common + "var C = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), new THREE.MeshStandardMaterial({ color: '#374151' }));\ngroup.add(C);\nvar dirs = [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]];\nfor (var i = 0; i < 4; i++) {\n  var v = new THREE.Vector3(dirs[i][0], dirs[i][1], dirs[i][2]).normalize().multiplyScalar(1.5);\n  var H = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), new THREE.MeshStandardMaterial({ color: '#93c5fd' }));\n  H.position.copy(v); group.add(H);\n  var len = v.length();\n  var b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 12), new THREE.MeshStandardMaterial({ color: '#9ca3af' }));\n  b.position.copy(v.clone().multiplyScalar(0.5));\n  b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());\n  group.add(b);\n}\nreturn { update: function (t) { group.rotation.y = t * 0.5; group.rotation.x = Math.sin(t * 0.3) * 0.2; } };";
  }
  if (scene === "ring") {
    return common + "for (var i = 0; i < 6; i++) {\n  var a = i * Math.PI / 3;\n  var c = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), new THREE.MeshStandardMaterial({ color: '#374151' }));\n  c.position.set(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0); group.add(c);\n  var h = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), new THREE.MeshStandardMaterial({ color: '#bfdbfe' }));\n  h.position.set(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0); group.add(h);\n  var b2 = i + 1;\n  var a2 = b2 * Math.PI / 3;\n  var p1 = new THREE.Vector3(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0);\n  var p2 = new THREE.Vector3(Math.cos(a2) * 1.3, Math.sin(a2) * 1.3, 0);\n  var d = p2.clone().sub(p1);\n  var bond = new THREE.Mesh(new THREE.CylinderGeometry(i % 2 ? 0.05 : 0.09, i % 2 ? 0.05 : 0.09, d.length(), 12), new THREE.MeshStandardMaterial({ color: '#6b7280' }));\n  bond.position.copy(p1.clone().add(p2).multiplyScalar(0.5));\n  bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());\n  group.add(bond);\n}\nvar cloud = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 16, 64), new THREE.MeshStandardMaterial({ color: '#7c3aed', transparent: true, opacity: 0.18 }));\ngroup.add(cloud);\nreturn { update: function (t) { group.rotation.y = t * 0.4; group.rotation.x = 0.6 + Math.sin(t * 0.4) * 0.15; } };";
  }
  if (scene === "cell") {
    return common + "var mem = new THREE.Mesh(new THREE.SphereGeometry(2, 48, 48), new THREE.MeshStandardMaterial({ color: '#fda4af', transparent: true, opacity: 0.25 }));\ngroup.add(mem);\nvar nuc = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), new THREE.MeshStandardMaterial({ color: '#7c3aed' }));\ngroup.add(nuc);\nfor (var i = 0; i < 9; i++) {\n  var m = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.35, 6, 12), new THREE.MeshStandardMaterial({ color: '#f59e0b' }));\n  var a = i * 0.7, r = 1.25 + (i % 3) * 0.18;\n  m.position.set(Math.cos(a) * r, Math.sin(a * 1.3) * 0.8, Math.sin(a) * r);\n  m.rotation.set(a, a * 0.5, 0); group.add(m);\n}\nfor (var j = 0; j < 14; j++) {\n  var ch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), new THREE.MeshStandardMaterial({ color: '#059669' }));\n  var th = j / 14 * Math.PI * 2;\n  ch.position.set(Math.cos(th) * 2, Math.sin(th * 2) * 0.3, Math.sin(th) * 2);\n  ch.lookAt(0, 0, 0); ch.rotateX(Math.PI / 2); group.add(ch);\n}\nreturn { update: function (t) { group.rotation.y = t * 0.3; nuc.scale.setScalar(1 + Math.sin(t * 2) * 0.03); } };";
  }
  if (scene === "heart") {
    return common + "var mat = function (c) { return new THREE.MeshStandardMaterial({ color: c }); };\nvar la = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), mat('#e11d48')); la.position.set(0.55, 0.7, 0); group.add(la);\nvar ra = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), mat('#2563eb')); ra.position.set(-0.55, 0.7, 0); group.add(ra);\nvar lv = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 32), mat('#be123c')); lv.position.set(0.4, -0.5, 0); lv.rotation.z = Math.PI + 0.2; group.add(lv);\nvar rv = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 32), mat('#1d4ed8')); rv.position.set(-0.4, -0.45, 0.1); rv.rotation.z = Math.PI - 0.2; group.add(rv);\nvar ao = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.14, 16, 40, Math.PI), mat('#f43f5e')); ao.position.set(0.2, 1.4, 0); group.add(ao);\nvar pa = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 16), mat('#3b82f6')); pa.position.set(-0.3, 1.5, 0.2); group.add(pa);\nreturn { update: function (t) { var s = 1 + Math.max(0, Math.sin(t * 7.5)) * 0.06; lv.scale.set(s, s, s); rv.scale.set(s, s, s); group.rotation.y = t * 0.4; } };";
  }
  // generic orbiting cluster
  const hue = seed % 360;
  return common + "var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color('hsl(" + hue + ", 55%, 55%)'), flatShading: true }));\ngroup.add(core);\nvar sats = [];\nfor (var i = 0; i < 8; i++) {\n  var s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), new THREE.MeshStandardMaterial({ color: '#0284c7' }));\n  group.add(s); sats.push(s);\n}\nvar ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.02, 8, 80), new THREE.MeshStandardMaterial({ color: '#9ca3af' }));\nring.rotation.x = Math.PI / 2; group.add(ring);\nreturn { update: function (t) { for (var i = 0; i < sats.length; i++) { var a = t * 0.8 + i * Math.PI / 4; sats[i].position.set(Math.cos(a) * 1.8, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.8); } core.rotation.y = t * 0.3; } };";
}

function twoD(anim, title) {
  const t = JSON.stringify(title);
  const head = "var title = " + t + ";\n";
  if (anim === "pendulum") {
    return head + "return { draw: function (ctx, w, h, time) {\n  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);\n  var L = h * 0.55, g = 9.81, th0 = 0.5, om = Math.sqrt(g / 1.2);\n  var th = th0 * Math.cos(om * time);\n  var px = w / 2, py = h * 0.12;\n  var bx = px + L * Math.sin(th), by = py + L * Math.cos(th);\n  ctx.strokeStyle = '#1a1a1d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 60, py); ctx.lineTo(px + 60, py); ctx.stroke();\n  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();\n  ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.arc(bx, by, 16, 0, Math.PI * 2); ctx.fill();\n  ctx.setLineDash([4, 4]); ctx.strokeStyle = '#9ca3af'; ctx.beginPath(); ctx.arc(px, py, L, Math.PI / 2 - th0, Math.PI / 2 + th0); ctx.stroke(); ctx.setLineDash([]);\n  ctx.fillStyle = '#1a1a1d'; ctx.font = '14px sans-serif'; ctx.fillText(title, 14, 22);\n  ctx.fillStyle = '#e11d48'; ctx.fillText('theta = ' + th.toFixed(2) + ' rad', 14, h - 16);\n} };";
  }
  if (anim === "membrane") {
    return head + "var ps = []; for (var i = 0; i < 40; i++) ps.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, s: i % 3 });\nreturn { draw: function (ctx, w, h, time, dt) {\n  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);\n  var mx = w / 2; ctx.fillStyle = '#fde68a'; ctx.fillRect(mx - 10, 30, 20, h - 50);\n  for (var k = 0; k < 4; k++) { ctx.fillStyle = '#059669'; ctx.fillRect(mx - 14, 60 + k * (h - 110) / 3, 28, 18); }\n  for (var i = 0; i < ps.length; i++) { var p = ps[i]; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y < 0.1 || p.y > 0.95) p.vy *= -1; if (p.x < 0.02 || p.x > 0.98) p.vx *= -1;\n    var X = p.x * w, Y = p.y * h; if (Math.abs(X - mx) < 14 && p.s !== 0) { p.vx *= -1; }\n    ctx.fillStyle = p.s === 0 ? '#0284c7' : (p.s === 1 ? '#e11d48' : '#d97706'); ctx.beginPath(); ctx.arc(X, Y, 5, 0, Math.PI * 2); ctx.fill(); }\n  ctx.fillStyle = '#1a1a1d'; ctx.font = '14px sans-serif'; ctx.fillText(title, 14, 20); ctx.font = '12px sans-serif'; ctx.fillText('outside', 20, h - 10); ctx.fillText('inside', w - 70, h - 10);\n} };";
  }
  if (anim === "spike") {
    return head + "return { draw: function (ctx, w, h, time) {\n  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);\n  var T = 4, tt = time % T; var ox = 50, oy = h - 40, W = w - 80, H = h - 90;\n  ctx.strokeStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(ox, 30); ctx.lineTo(ox, oy); ctx.lineTo(ox + W, oy); ctx.stroke();\n  function v(s) { if (s < 1) return -70; if (s < 1.15) return -70 + (s - 1) / 0.15 * 15; if (s < 1.35) return -55 + (s - 1.15) / 0.2 * 95; if (s < 1.7) return 40 - (s - 1.35) / 0.35 * 120; if (s < 2.4) return -80 + (s - 1.7) / 0.7 * 10; return -70; }\n  function Y(mv) { return oy - (mv + 90) / 140 * H; }\n  ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2; ctx.beginPath();\n  for (var i = 0; i <= 300; i++) { var s = i / 300 * T; if (s > tt) break; var x = ox + s / T * W; if (i === 0) ctx.moveTo(x, Y(v(s))); else ctx.lineTo(x, Y(v(s))); } ctx.stroke();\n  ctx.setLineDash([5, 4]); ctx.strokeStyle = '#d97706'; ctx.beginPath(); ctx.moveTo(ox, Y(-55)); ctx.lineTo(ox + W, Y(-55)); ctx.stroke(); ctx.setLineDash([]);\n  ctx.fillStyle = '#1a1a1d'; ctx.font = '14px sans-serif'; ctx.fillText(title, 14, 20); ctx.font = '12px sans-serif'; ctx.fillText('threshold -55 mV', ox + W - 110, Y(-55) - 6); ctx.fillText('Vm (mV)', 8, 44); ctx.fillText('time (ms)', ox + W - 60, oy + 18);\n} };";
  }
  if (anim === "market") {
    return head + "return { draw: function (ctx, w, h, time) {\n  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);\n  var ox = 50, oy = h - 40, W = w - 90, H = h - 80; var shift = Math.sin(time * 0.8) * 0.18;\n  ctx.strokeStyle = '#1a1a1d'; ctx.beginPath(); ctx.moveTo(ox, 30); ctx.lineTo(ox, oy); ctx.lineTo(ox + W, oy); ctx.stroke();\n  ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ox, oy - H * (0.95 + shift)); ctx.lineTo(ox + W, oy - H * (0.05 + shift)); ctx.stroke();\n  ctx.strokeStyle = '#e11d48'; ctx.beginPath(); ctx.moveTo(ox, oy - H * 0.05); ctx.lineTo(ox + W, oy - H * 0.95); ctx.stroke(); ctx.lineWidth = 1;\n  var q = (0.9 + shift) / 1.8; var p = 0.05 + 0.9 * q; var ex = ox + q * W, ey = oy - p * H;\n  ctx.setLineDash([4, 4]); ctx.strokeStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(ox, ey); ctx.lineTo(ex, ey); ctx.lineTo(ex, oy); ctx.stroke(); ctx.setLineDash([]);\n  ctx.fillStyle = '#059669'; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();\n  ctx.fillStyle = '#1a1a1d'; ctx.font = '14px sans-serif'; ctx.fillText(title, 14, 20); ctx.font = '12px sans-serif'; ctx.fillText('P', ox - 16, 40); ctx.fillText('Q', ox + W - 6, oy + 18); ctx.fillStyle = '#0284c7'; ctx.fillText('D', ox + W - 14, oy - H * (0.05 + shift) - 6); ctx.fillStyle = '#e11d48'; ctx.fillText('S', ox + W - 14, oy - H * 0.95 + 14);\n  ctx.fillStyle = '#059669'; ctx.fillText('P* = ' + (p * 10).toFixed(2) + ' EUR', ex + 10, ey - 8);\n} };";
  }
  // traveling wave (default)
  return head + "return { draw: function (ctx, w, h, time) {\n  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);\n  var mid = h / 2; ctx.strokeStyle = '#d1d5db'; ctx.beginPath(); ctx.moveTo(20, mid); ctx.lineTo(w - 20, mid); ctx.stroke();\n  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.beginPath();\n  for (var x = 20; x <= w - 20; x += 2) { var y = mid - Math.sin((x / w) * 4 * Math.PI - time * 2.2) * h * 0.22 * Math.exp(-((x - w / 2) * (x - w / 2)) / (w * w * 0.25)); if (x === 20) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.lineWidth = 1;\n  ctx.strokeStyle = '#0284c7'; ctx.setLineDash([4, 4]); ctx.beginPath();\n  for (var x2 = 20; x2 <= w - 20; x2 += 2) { var y2 = mid - Math.cos((x2 / w) * 4 * Math.PI - time * 2.2) * h * 0.12; if (x2 === 20) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); } ctx.stroke(); ctx.setLineDash([]);\n  ctx.fillStyle = '#1a1a1d'; ctx.font = '14px sans-serif'; ctx.fillText(title, 14, 22); ctx.font = '12px sans-serif'; ctx.fillStyle = '#6b7280'; ctx.fillText('t = ' + time.toFixed(1) + ' s', w - 80, h - 12);\n} };";
}

// ── knowledge graph ─────────────────────────────────────────────────────
function slug(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "node";
}

function kgBuild(prompt) {
  const text = docText(prompt);
  const bd = bankDocFor(text);
  if (bd && bd.kg) return bd.kg;
  const pageChunks = text.split(/\[page (\d+)\]\n/);
  const nodes = [];
  const source = bd ? bd.concepts : [];
  for (const c of source.slice(0, 10)) {
    nodes.push({ id: slug(c.label), label: c.label, summary: c.context.slice(0, 260), pageHints: [1] });
  }
  if (nodes.length < 4) {
    for (let i = 1; i < pageChunks.length && nodes.length < 8; i += 2) {
      for (const g of genericConcepts({ page: Number(pageChunks[i]) - 1, text: pageChunks[i + 1] })) {
        if (nodes.length >= 8) break;
        const id = slug(g.label);
        if (nodes.some((n) => n.id === id)) continue;
        nodes.push({ id, label: g.label, summary: g.context.slice(0, 260), pageHints: [Number(pageChunks[i])] });
      }
    }
  }
  while (nodes.length < 4) nodes.push({ id: "overview-" + nodes.length, label: "Overview " + (nodes.length + 1), summary: "Framing material from the opening of the document.", pageHints: [1] });
  const edges = [];
  for (let i = 1; i < nodes.length; i++) edges.push({ source: nodes[i - 1].id, target: nodes[i].id, relation: i % 2 ? "leads to" : "builds on" });
  return { nodes, edges, globalNote: "Fresh map built from the document — no interactions yet, so every concept starts at zero." };
}

function kgEvaluate(prompt) {
  const ids = [...prompt.matchAll(/"id":\s*"([^"]+)"/g)].map((m) => m[1]);
  const uniq = [...new Set(ids)].slice(0, 30);
  const evMatches = [...prompt.matchAll(/"id":\s*"([^"]+)"[\s\S]*?"memory":\s*(\d+),\s*"comprehension":\s*(\d+),\s*"structure":\s*(\d+),\s*"application":\s*(\d+)/g)];
  const prev = new Map(evMatches.map((m) => [m[1], [m[2], m[3], m[4], m[5]].map(Number)]));
  const updates = uniq.slice(0, 4).map((id, i) => {
    const p = prev.get(id) || [20, 15, 10, 5];
    const bump = (v, k) => Math.min(100, v + 6 + ((hash(id) >> k) % 9));
    return {
      id,
      evaluation: { memory: bump(p[0], 0), comprehension: bump(p[1], 3), structure: bump(p[2], 6), application: bump(p[3], 9) },
      evaluatorNote: i === 0 ? "Recalled correctly and phrased it in own words; next step is applying it to an unseen case." : "Small gain from the latest session — still mostly recognition rather than production.",
    };
  });
  return { updates, globalNote: "Steady progress: recall is ahead of application. Prioritise worked problems on the weakest nodes before re-reading." };
}

// ── chat / tools ────────────────────────────────────────────────────────
function lastStudentMsg(prompt) {
  const all = [...prompt.matchAll(/STUDENT: ([\s\S]*?)(?=\n\n(?:ASSISTANT:|STUDENT:|--- ASSISTANT REPLY)|$)/g)];
  return all.length ? all[all.length - 1][1].trim() : prompt.slice(-300);
}

function chat(prompt, context) {
  const q = lastStudentMsg(prompt);
  const text = docText(context);
  const hits = bestSentences(text, q, 3);
  const title = docTitle(context);
  if (!hits.length) {
    return { reply: `Good question — the notes in **${title}** don't address that directly. What they *do* give you is the framework around it, so I'd answer it by working from first principles:\n\n1. Pin down the definitions involved.\n2. Ask which assumption in the text would change the outcome.\n3. Check the result against one concrete example.\n\nWant me to walk through an example together?` };
  }
  const bullets = hits.map((s) => `- ${s}`).join("\n");
  const kw = keywords(q).slice(0, 2).join(" and ");
  return {
    reply: `Here's how the document frames it${kw ? ` (looking at ${kw})` : ""}:\n\n${bullets}\n\n**In plain words:** the key move is the first point — once you see *why* it holds, the rest follow as consequences rather than separate facts to memorise.\n\nA quick check for yourself: can you predict what changes if one of those conditions is removed?`,
  };
}

function flashcards(prompt) {
  const text = docText(prompt);
  const topicM = prompt.match(/TOPIC: (.+)/);
  const topic = topicM ? topicM[1] : "";
  const bd = bankDocFor(text);
  let cards = [];
  if (bd && bd.cards) cards = bd.cards.slice();
  if (cards.length < 4) {
    const ss = (topic && !topic.startsWith("the whole") ? bestSentences(text, topic, 8) : []).concat(sentences(text).filter((s) => s.length > 60));
    for (const s of ss) {
      if (cards.length >= 8) break;
      const words = s.split(" ");
      const subj = words.slice(0, Math.min(5, words.length)).join(" ");
      cards.push({ q: `According to the notes, what is true about "${subj.replace(/[,.;:]$/, "")}…"?`, a: s.slice(0, 590) });
    }
  }
  return { cards: cards.slice(0, 10) };
}

function quiz(prompt) {
  const text = docText(prompt);
  const bd = bankDocFor(text);
  if (bd && bd.quiz && bd.quiz.length >= 4) return { questions: bd.quiz.slice(0, 8) };
  const ss = sentences(text).filter((s) => s.length > 60).slice(0, 12);
  const questions = [];
  for (let i = 0; i < ss.length && questions.length < 5; i++) {
    const s = ss[i];
    const others = ss.filter((x) => x !== s);
    const correct = (hash(s) % 4);
    const opts = [others[(i + 1) % others.length], others[(i + 3) % others.length], others[(i + 5) % others.length]].map((o) => (o || "None of the above").slice(0, 200));
    opts.splice(correct, 0, s.slice(0, 200));
    questions.push({ stem: "Which of the following statements is made in the document?", options: opts.slice(0, 4), correctIndex: correct, explanation: "This is stated directly in the text; the other options come from different sections and answer a different question." });
  }
  while (questions.length < 4) questions.push({ stem: "What is the best first step when meeting an unfamiliar problem on this topic?", options: ["Restate the definitions involved", "Guess and move on", "Memorise the final formula", "Skip to the next chapter"], correctIndex: 0, explanation: "Restating definitions turns recognition into understanding — every later step depends on it." });
  return { questions };
}

function feynmanChild(prompt) {
  const turns = (prompt.match(/\nSTUDENT: /g) || []).length;
  const topicM = prompt.match(/TOPIC: (.+)/);
  const topic = topicM ? topicM[1].replace(/^the whole document.*/, "this") : "this";
  const lines = [
    `Hi! I'm eight. Can you tell me what ${topic} is, like you'd explain it to me?`,
    "Ohh. But WHY does it happen like that? What would happen if it didn't?",
    "Can you give me an example from real life, like something at my house?",
    "Wait, you used a big word there. What does it mean in kid words?",
    "So if I changed one thing, what would be different? Which part matters most?",
    "Okay I think I get it! Can you say the whole thing again in one sentence?",
  ];
  return { childPrompt: lines[Math.min(turns, lines.length - 1)] };
}

function feynmanSummary(prompt) {
  const turns = (prompt.match(/\nSTUDENT: /g) || []).length;
  return {
    summary: `Across ${turns} explanation${turns === 1 ? "" : "s"} you kept the core idea intact and found a solid everyday analogy. Gaps: you leaned on jargon when the child pushed on "why", and the causal chain skipped a step in the middle. Next time, rebuild that middle link out loud before reaching for the formula.`,
  };
}
