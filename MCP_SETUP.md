# MCP Utilities Overview

This project can leverage three Model Context Protocol (MCP) capabilities provided by the current development environment tools:

1. Atom of Thought (AoT)
2. Sequential Thinking
3. Context7 (Library Documentation Fetcher)

> These are orchestration / reasoning tools exposed by the assistant runtime, not runtime dependencies of the Next.js app itself. They do not require npm packages here. You use them during development sessions (like this one) to enhance reasoning, planning, or to pull framework/library docs.

## 1. Atom of Thought (AoT)
Structured decomposition for complex problems.

Typical uses:
- Breaking down multi-step refactors
- Evaluating alternative architectural approaches
- Generating hypotheses + verification chain before large changes

Workflow pattern:
1. Define premise atoms (requirements / constraints)
2. Add reasoning atoms building on premises
3. Introduce hypothesis atoms (candidate solutions)
4. Add verification atoms to test hypotheses
5. Conclude with a conclusion atom (approved solution path)

When to skip: simple UI tweaks or trivial bug fixes.

## 2. Sequential Thinking
A lighter-weight, flexible chain-of-thought tool. Good for:
- Quick design sketches
- Iterative refinement with the option to revise earlier steps
- Exploring two branches of an idea then converging

Use Sequential Thinking when you want speed and adaptability; use full AoT when you need rigor and explicit verification layers.

## 3. Context7 Library Docs
Fetches up-to-date documentation slices for popular libraries (e.g., Next.js, React, Tailwind) to ground answers.

Recommended pattern:
1. Resolve the library ID (e.g. `next`, `react`, `tailwindcss`).
2. Pull targeted topics ("routing", "hooks", "streaming", etc.).
3. Apply insights—cite version-specific nuances if relevant.

## Integration Notes
Because these are assistant-side capabilities:
- No code changes or imports required in `src/`.
- They are not bundled into the production build.
- They leave no runtime footprint—purely for development / reasoning assistance.

## Suggested Usage Conventions (Team)
| Scenario | Tool | Rationale |
|----------|------|-----------|
| Large refactor plan | AoT | Explicit premises + verification reduce regressions |
| Quick feature ideation | Sequential Thinking | Fast iteration, lightweight edits |
| Unsure about Next.js 15 feature detail | Context7 | Pull authoritative docs excerpt |
| Comparing caching strategies | AoT + Context7 | Combine structured reasoning with doc grounding |

## Lightweight Checklist Templates
### AoT Premise Template
- P1: Business requirement
- P2: Performance constraint (e.g., TTFB < 500ms)
- P3: Existing architectural limitation

### Sequential Thinking Starter
1. Restate goal plainly
2. List 2–3 candidate approaches
3. Pick one, note risk(s)
4. Mitigation idea
5. Final chosen plan

## When NOT to Use These
- Pure styling adjustments
- Single-line bug fixes
- Content edits (copy changes)

## Future Enhancements (Optional)
If we decide to formalize this in-code:
- Add a `/docs/decisions/` folder with AoT session exports summarizing architectural decisions.
- Add a PR template section: "Was AoT / Sequential Thinking used? (link if yes)".
- Build a small script to snapshot resolved Context7 docs for reproducibility in audits.

---
If you want an AoT or sequential analysis generated for an upcoming task, just ask: e.g., "Run AoT to plan migrating the streaming pipeline to edge runtime".
