# OpenSeaBri Upstream Sync

<!-- Doc consistency pass: 2026-04-21 -->

Operational companion to `IMPORT_POLICY.md`. Defines when and how to check
upstream drift, and how to bump a pinned commit.

---

## 1. What's pinned

`imports/manifest.json` holds the ground truth. Current pins:

| Upstream | URL | Pinned SHA | License | Imported |
|----------|-----|-----------|---------|----------|
| openclaw | https://github.com/openclaw/openclaw | `ff67a890` | MIT | 2026-04-21 |
| hermes-agent | https://github.com/NousResearch/hermes-agent | `e7f8a5fe` | MIT | 2026-04-21 |
| nanobot | https://github.com/HKUDS/nanobot | `5853d5df` | MIT | 2026-05-03 |
| awesome-deepseek-agent | https://github.com/deepseek-ai/awesome-deepseek-agent | `5c11e014` | NOASSERTION | 2026-05-03 |

Per `IMPORT_POLICY.md` §3, only 40-char SHAs are valid. Tags and branches are rejected.

---

## 2. Drift reporter

The drift reporter is `scripts/sync-upstream.ts`. It does NOT mutate the manifest —
it only fetches the remote, compares against the pinned SHA, and prints a summary.

```bash
# Report all pinned upstreams
npx tsx scripts/sync-upstream.ts

# Report a single upstream
npx tsx scripts/sync-upstream.ts openclaw
npx tsx scripts/sync-upstream.ts hermes-agent
npx tsx scripts/sync-upstream.ts nanobot
npx tsx scripts/sync-upstream.ts awesome-deepseek-agent
```

### Prerequisite: `_upstream/` clones

The script expects shallow clones at `../_upstream/<name>` (sibling of `openseabri/`).
First-time setup:

```bash
mkdir -p ../_upstream
git clone https://github.com/openclaw/openclaw ../_upstream/openclaw
git clone https://github.com/NousResearch/hermes-agent ../_upstream/hermes-agent
git clone https://github.com/HKUDS/nanobot ../_upstream/nanobot
git clone https://github.com/deepseek-ai/awesome-deepseek-agent ../_upstream/awesome-deepseek-agent
```

These clones are used only for `git fetch` + `rev-list` + `show`. They carry no
build artifacts and are not part of the OpenSeaBri dependency graph.

### Output interpretation

```
── openclaw ──
  pinned: ff67a890af  (2026-04-21)
  url:    https://github.com/openclaw/openclaw
  status: 42 new commits on remote
  remote: 9a3e1c2b77  license line 1: "MIT License"
  log:
    9a3e1c2b feat: new sandbox tier
    ...
```

- `status: up-to-date` — no action needed.
- `status: N new commits on remote` — review the log. Proceed to §3 only if a
  listed change is a candidate per `IMPORT_POLICY.md` §6.
- `! license header may have changed` — STOP. Re-run the license audit before
  considering any bump.

---

## 3. Bumping a pin

Bumping is always a separate PR. Never bundle a pin bump with feature work.

1. Run the drift reporter and capture the output.
2. Review each commit between the pinned SHA and the candidate new SHA.
   Reject commits that introduce non-sustainability features, telemetry, new
   network callbacks, or license changes.
3. Update `imports/manifest.json`:
   - `commit` — new 40-char SHA
   - `imported_at` — today's date
   - `imported_paths` — unchanged unless you are also adopting new files
4. If license changed, update `LICENSES/<project>.txt` and the manifest `license`
   field, and re-run the `IMPORT_POLICY.md` §7 review gate from scratch.
5. If the bump brings new SPDX-adapted files into `main`, each file must carry
   the §4 SPDX header pointing at the new SHA.
6. PR title: `import: bump <project> to <short-sha>`
7. Required reviewers: CODEOWNERS authorized to sign off on license decisions.

---

## 4. Cadence

| Trigger | Action |
|---------|--------|
| Quarterly | Run `npx tsx scripts/sync-upstream.ts` and file an issue with the output. |
| Upstream security advisory | Run the reporter the same day; decide on an emergency bump. |
| Upstream relicense | Freeze the pin. Existing imports stay (legal at time of import). No new imports from that upstream. |
| Supply-chain incident (typosquat, maintainer compromise) | Freeze all pins. Full audit before any further adoption. |

---

## 5. What the reporter does NOT do

- Does not auto-pull or auto-bump. Pins are human-approved, always.
- Does not re-check license compatibility on pulled commits — that is a manual
  `IMPORT_POLICY.md` §2 review.
- Does not scan for malware, secrets, or telemetry added upstream. Reviewers
  must read the diff.
- Does not import files into OpenSeaBri. Use the documented adoption flow.

---

## 6. Related

- `IMPORT_POLICY.md` — governance (licenses, SPDX, review gate)
- `imports/manifest.json` — the pins
- `scripts/sync-upstream.ts` — the reporter
- `LICENSES/` — full upstream license texts
- `NOTICE` — Apache-2.0 attribution (if any Apache imports land in future)
