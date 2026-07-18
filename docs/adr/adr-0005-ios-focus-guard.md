# ADR-0005: Shared iOS Focus And Viewport Guard

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-06-10 |
| Last verified | 2026-07-18 |

## Context

WKWebView can leave the visual viewport shifted after text focus even when
document scroll positions report zero. Local field fixes did not cover transitions,
unmounts, or delayed native movement.

## Decision

Use shared focus scopes, transition sequencing, touch guards, visual viewport
observation, scroll correction, and a narrow proxy-input helper where required.

## Alternatives

- CSS-only fixes, per-field scroll calls, and globally moving inputs were rejected
  because they did not reliably protect the real layout.

## Consequences

Focus behavior has global coordination and requires native validation. New text
surfaces must identify their scroll and focus ownership.

## Supersedes / Superseded By

None.

## Related Documents

- [Mobile and iOS Architecture](../architecture/mobile-ios.md)
- [iOS Development](../development/ios-development.md)

## Verification

`App.tsx`, `App.css`, and `mobileFocusAssist.ts` implement the guard and tests
cover its browser-observable behavior.
