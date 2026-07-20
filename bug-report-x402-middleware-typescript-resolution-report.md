# Bug report: `@injectivelabs/x402/middleware` fails to resolve under common TypeScript configs

## Summary

Following the "Protecting your own API endpoint with x402" section of the
[Injective x402 docs](https://docs.injective.network/x402) produces a TypeScript compile error
out of the box, in a project using a very common (and until recently, default) `tsconfig.json`
setting. The package itself installs and contains valid type declarations — this is a
**module resolution compatibility gap**, not a missing/broken file.

## Environment

- Package: `@injectivelabs/x402` (installed via `npm install @injectivelabs/x402`, following the docs verbatim)
- TypeScript: 5.9.3
- `tsconfig.json`: `"module": "commonjs"`, `"moduleResolution": "node"`
- Node.js: 20.x

## Reproduction

Followed the docs' minimal example exactly:

```ts
import express from 'express';
import { injectivePaymentMiddleware } from '@injectivelabs/x402/middleware';
```

## Error

```
Cannot find module '@injectivelabs/x402/middleware' or its corresponding type declarations.
There are types at 'node_modules/@injectivelabs/x402/dist/middleware/index.d.ts', but this
result could not be resolved under your current 'moduleResolution' setting. Consider updating
to 'node16', 'nodenext', or 'bundler'.
```

## Root cause

TypeScript's own diagnostic message identifies the issue precisely: the package publishes
`./middleware` as a subpath export via its `package.json` `"exports"` field, with conditional
type resolution. The **classic** `moduleResolution: "node"` strategy (still the default in many
existing projects, and in project scaffolds generated before TS 5.0) does not understand
`"exports"`-based subpath resolution at all — it only understands the older, flat `main`/`types`
fields. Only the newer `"node16"`, `"nodenext"`, or `"bundler"` resolution strategies can follow
a package's `"exports"` map.

This means **any TypeScript project that hasn't already opted into one of the newer resolution
strategies will hit this exact error** the moment they try the docs' example verbatim, with no
indication from the docs that a specific `tsconfig.json` setting is a prerequisite.

## Why this is worth fixing in the docs (or the package)

- `moduleResolution: "node"` is still extremely common — it's the default produced by many
  starter templates, and is what a large fraction of existing CommonJS Node/Express projects
  (like the one that surfaced this) are already running.
- The docs example gives no indication that a specific `moduleResolution` value is required,
  so a developer following the tutorial exactly hits a compile error with no clear link back to
  "the docs assumed a newer resolver."
- The fix is a one-line diagnostic away for someone who knows to read the TS error carefully, but
  it stops a first-time integrator cold with no signal in the docs themselves.

## Suggested fixes (either would resolve this for future integrators)

1. **Docs fix (lowest effort):** add a short prerequisite note to the x402 tutorial's "Protecting
   your own API endpoint" section stating that consuming `@injectivelabs/x402/middleware` from
   TypeScript requires `"moduleResolution"` set to `"bundler"`, `"node16"`, or `"nodenext"` in
   `tsconfig.json`, with a one-line example of the required config.
2. **Package fix (more robust):** add a `"typesVersions"` mapping (or a flat re-export shim) in
   `@injectivelabs/x402`'s `package.json` so the `./middleware` subpath also resolves correctly
   under classic `moduleResolution: "node"`, removing the prerequisite entirely.
3. **Alternative:** ship a plain CommonJS `require()`-based example alongside the ESM `import`
   example in the docs, since `require("@injectivelabs/x402/middleware")` may sidestep this
   specific TS resolution path depending on how the package's exports map is structured (worth
   Injective's own verification, since this wasn't tested as part of this report).

## Note on scope

This is a TypeScript/Node ecosystem compatibility pattern, not unique to `@injectivelabs/x402` —
but since it blocks the docs' own quickstart example verbatim, it seemed worth flagging directly
rather than assuming every integrator will independently diagnose it from the raw compiler error.
