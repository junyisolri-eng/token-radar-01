# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/junyisolri-eng/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/junyisolri-eng/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token radar — the best token launch radar: a ranked board of 197 protocols that record no token, each with an implied launch value and a farm plan. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|dir>
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=am6vk7mc&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

## Model (radar-2.1)

`implied_value = TVL x categoryMultiple x growthMult x chainMult x maturityMult x tradingCorrection`

- **tradingCorrection**: 1 for every protocol except two. The snapshot's
  record is not proof a protocol has no token, and a live market check on
  2026-11-24 verified that USDD (a stablecoin at about $0.997, market cap
  about $1.55B) and Bittensor dTAO (TAO at about $191.9, market cap about
  $2.25B) already trade. Both stay on the board — the coverage gate
  requires all 40 watchlist slugs — but their implied launch value is a
  residual ($700,000 for USDD, $600,000 for Bittensor dTAO), demoting them
  to the bottom two ranks, and their farm steps say plainly the token
  already trades. The correction factor is carried in each row's model, so
  the dashboard's displayed arithmetic still multiplies out.

- **categoryMultiple**: the median mcap/TVL of live-token protocols in the same
  category, computed from the sealed snapshot itself on every run (median, not
  mean; 3–4 comparables are shrunk halfway to the global median of 0.205;
  fewer use the global median). Clamped to [0.05, 0.80]. No name is hardcoded.
- **growthMult**: 7-day TVL change winsorised to [-50, +100]%, then
  `1 + 0.0035 x pct`, in [0.825, 1.35]. One protocol's +4448% week is treated
  as +100%, so a single spike cannot dominate the board.
- **chainMult**: `1 + 0.02` per extra chain, capped at 1.10.
- **maturityMult**: `0.70 + 0.30 x sqrt(min(age, 1095) / 1095)` — surviving the
  first year matters most; unknown age uses 0.85.

## What is ranked

Rankable = records no token (mcap, gecko_id and symbol all null) and is not a
product of a token that already trades: no CEX, bridge, canonical bridge,
cross-chain bridge, liquid-staking / liquid-restaking / restaked-BTC product,
no versioned pool name, no wrapped/staked/staking word, no exchange prefix.
That strict rule leaves **197 protocols** (40 watchlist + 157 below the floor).
The 145 pre-token records left out are mostly CEXs (Bybit, $13.8B TVL),
bridges (WBTC, $7.9B) and staked products — ranking them as launches would
put a centralised exchange at the top of a "which token launches next" board.
A 250-row board would need those rows, so this board is 197 honest rows.

Live-token protocols are kept apart in the dashboard's Live view, shown at
their market's own value, never mixed into the ranked board.

## Farm plans

Six steps per protocol, generated from its own record (category, primary
chain, TVL tier, age): concrete capital ($50–$250 by TVL), gas cost by chain
(Ethereum ~$12, Solana/Base/Arbitrum ~$1–2), hold days (60/45/30 by age),
weekly qualifying actions, and a step that distinguishes the pre-launch farm
(check points weekly) from the post-launch claim (claim only from the
protocol's own published link, never pay a fee to claim, expect vesting).

## Dashboard

`dashboard/` (index.html + app.css + app.js, 19,499 bytes, no network) reads
`data.js` next to it: a sortable, searchable board of the 197 pre-token
protocols (search, category filter, watchlist-only toggle, sort by rank / TVL /
7-day change / age / name), a detail panel per protocol showing the model's multipliers (plus the
already-trading correction where it applies) and its six farm steps, and a separate Live view of the 24
already-trading protocols for comparison. View and filters live in the URL
hash, so `#view=live` and `#slug=gauntlet` deep-link. View it locally by
serving the built output: `python3 -m http.server` inside `out/`, then open
`/dashboard/`.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|dir>
```

Writes `board.json`, `data.js`, copies `dashboard/` and `screenshots/`, and
writes `dossier.json` (when 3 screenshots are present) via
`vendor/makefun-board.ts`.
