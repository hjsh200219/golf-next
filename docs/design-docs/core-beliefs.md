# Core Beliefs — Agent-First Development

## 1. Repository is the System of Record

All knowledge needed to work on this project lives in the repository. External docs (Slack, Google Docs, email) are invisible to agents. If it's not in the repo, it doesn't exist.

## 2. Instructions are Maps, Not Encyclopedias

`AGENTS.md` stays concise. It points to detailed docs in `docs/`. Agents start at the map level and drill into detail as needed.

## 3. Progressive Disclosure

Agents don't need to read everything upfront. The structure is:
```
AGENTS.md (rules) → ARCHITECTURE.md (system) → docs/ (details)
```

## 4. Architecture is Mechanically Enforced

Layer rules aren't suggestions — they should be enforced by linters and tests. Error messages should tell the agent how to fix violations.

## 5. Agent-Readable Code Over Clever Abstractions

Prefer explicit, readable code that an agent can understand, verify, and modify over clever abstractions that require deep context. Simple repetition is better than premature abstraction.

## 6. Evidence Over Assumptions

- Run `tsc --noEmit` — don't assume types are correct
- Run `npm test` — don't assume tests pass
- Read the file — don't assume the content
