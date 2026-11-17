#!/usr/bin/env python3
"""Build a local module tree for the Go backend from GitHub mirrors.

proxy.golang.org and the vanity hosts (golang.org/x, modernc.org, ...) are not
reachable from the capture sandbox, but codeload.github.com is. For every
module in backend/go.sum this downloads the tagged/committed source tree from
the matching GitHub repository and writes go.work with `replace` directives
pointing at the local copies. Modules that are only needed for their go.mod
(not built) get a stub directory with a bare go.mod.

Usage: python3 fetch.py   (run from repo root)
"""
import io, os, re, subprocess, sys, tarfile, concurrent.futures as cf

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))

VANITY = {
    "filippo.io/edwards25519": "FiloSottile/edwards25519",
    "go.yaml.in/yaml/v3": "yaml/go-yaml",
    "go.yaml.in/yaml/v4": "yaml/go-yaml",
    "google.golang.org/protobuf": "protocolbuffers/protobuf-go",
    "gopkg.in/yaml.v3": "go-yaml/yaml",
    "gopkg.in/yaml.v2": "go-yaml/yaml",
    "gopkg.in/check.v1": "go-check/check",
    "jaytaylor.com/html2text": "jaytaylor/html2text",
    "google.golang.org/appengine": "golang/appengine",
}


def repo_for(mod):
    """Return (owner/repo, subdir) for a module path."""
    if mod in VANITY:
        return VANITY[mod], ""
    m = re.match(r"golang\.org/x/([^/]+)$", mod)
    if m:
        return "golang/" + m.group(1), ""
    m = re.match(r"modernc\.org/([^/]+)(/v\d+)?$", mod)
    if m:
        return "modernc-org/" + m.group(1), ""
    if mod.startswith("github.com/"):
        parts = mod.split("/")
        repo = parts[1] + "/" + parts[2]
        rest = [p for p in parts[3:]]
        if rest and re.match(r"v\d+$", rest[-1]):
            rest = rest[:-1]
        return repo, "/".join(rest)
    return None, None


def ref_for(version):
    v = version.replace("+incompatible", "")
    m = re.match(r".*-(\d{14})-([0-9a-f]{12})$", v)
    if m:
        return m.group(2)
    return v


def fetch(mod, version, need_source):
    dest = os.path.join(SRC, mod + "@" + version)
    if os.path.exists(os.path.join(dest, ".fetched")):
        return mod, version, dest, "cached"
    repo, sub = repo_for(mod)
    ref = ref_for(version)
    major = re.search(r"/v(\d+)$", mod)
    candidates = []
    if repo:
        candidates.append(ref)
        if sub:
            candidates.append(sub + "/" + ref)
    data = None
    for r in candidates:
        url = f"https://codeload.github.com/{repo}/tar.gz/{r}"
        try:
            p = subprocess.run(["curl", "-fsSL", "--retry", "3", "-m", "300", url], capture_output=True)
            if p.returncode == 0 and p.stdout:
                data = p.stdout
                break
        except Exception as e:  # noqa
            last = e
    os.makedirs(dest, exist_ok=True)
    if data is None:
        if need_source:
            print("FAILED", mod, version, repo, file=sys.stderr)
        with open(os.path.join(dest, "go.mod"), "w") as f:
            f.write(f"module {mod}\n")
        return mod, version, dest, "stub"
    tf = tarfile.open(fileobj=io.BytesIO(data))
    members = tf.getmembers()
    top = members[0].name.split("/")[0]
    # pick the module root: subdir, or vN subdir for major versions living in a folder
    roots = [sub] if sub else [""]
    if major:
        roots = [(sub + "/" if sub else "") + "v" + major.group(1)] + roots
    root = None
    names = {m.name for m in members}
    for r in roots:
        p = top + ("/" + r if r else "") + "/go.mod"
        if p in names or (not r):
            root = r
            if p in names:
                break
    prefix = top + ("/" + root if root else "") + "/"
    for m in members:
        if not m.name.startswith(prefix) or not (m.isfile() or m.isdir()):
            continue
        rel = m.name[len(prefix):]
        if not rel or "/.idea/" in "/" + rel or "/.vscode/" in "/" + rel or os.path.basename(rel).startswith(".git"):
            continue
        out = os.path.join(dest, rel)
        if m.isdir():
            os.makedirs(out, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(out), exist_ok=True)
            with open(out, "wb") as f:
                f.write(tf.extractfile(m).read())
    open(os.path.join(dest, ".fetched"), "w").close()
    gm = os.path.join(dest, "go.mod")
    if not os.path.exists(gm):
        with open(gm, "w") as f:
            f.write(f"module {mod}\n")
    return mod, version, dest, "ok"


def main():
    full, modonly = {}, {}
    for line in open(os.path.join(REPO, "backend", "go.sum")):
        mod, ver, _ = line.split()
        if ver.endswith("/go.mod"):
            modonly.setdefault(mod, set()).add(ver[:-7])
        else:
            full.setdefault(mod, set()).add(ver)
    # one directory per module path: pick the version listed in go.mod when present
    gomod = open(os.path.join(REPO, "backend", "go.mod")).read()
    wanted = {}
    for mod in set(full) | set(modonly):
        m = re.search(re.escape(mod) + r" (v\S+)", gomod)
        vers = sorted((full.get(mod) or modonly.get(mod)))
        wanted[mod] = (m.group(1) if m else vers[-1], mod in full)
    wanted["github.com/mattn/go-sqlite3"] = ("v1.14.53", True)
    # modules only reached through deeper parts of the module graph; go.mod stubs suffice
    extra = os.path.join(ROOT, "extra-stubs.txt")
    if os.path.exists(extra):
        for line in open(extra):
            if line.strip():
                m, v = line.split()
                if m not in wanted:
                    stub = os.path.join(SRC, m + "@" + v)
                    os.makedirs(stub, exist_ok=True)
                    open(os.path.join(stub, "go.mod"), "w").write(f"module {m}\n")
                    open(os.path.join(stub, ".fetched"), "w").close()
                    wanted[m] = (v, False)
    jobs = []
    with cf.ThreadPoolExecutor(6) as ex:
        for mod, (ver, need) in wanted.items():
            jobs.append(ex.submit(fetch, mod, ver, need))
        results = [j.result() for j in jobs]
    lines = ["go 1.27.0", "", "use ../../backend", ""]
    for mod, ver, dest, status in sorted(results):
        lines.append(f"replace {mod} => ./{os.path.relpath(dest, ROOT)}")
        print(status, mod, ver)
    lines = [l for l in lines if not l.startswith("replace modernc.org/sqlite ")]
    lines.append("replace modernc.org/sqlite => ./shims/sqlite")
    lines.append("replace github.com/mattn/go-sqlite3 => ./src/github.com/mattn/go-sqlite3@v1.14.53")
    with open(os.path.join(ROOT, "go.work"), "w") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
