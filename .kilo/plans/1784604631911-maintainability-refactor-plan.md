# Maintainability Refactor Plan

## Goal

Make the codebase easier for humans to navigate and change without changing
product behavior, API contracts, database behavior, or the current product
roadmap. Apply the work incrementally so every batch can be typechecked and
tested independently.

## Agreed Conventions

### Module structure

Use this as the default order for implementation modules:

1. Imports, grouped as built-ins, external packages, shared aliases, and
   relative imports. Use type-only imports where appropriate.
2. Local type declarations.
3. Constants, grouped by domain meaning rather than alphabetically.
4. Private helpers.
5. Public functions, classes, or component definitions.
6. Optional explicit export block for modules where a final public API list is
   clearer.

Exports do not have to be at the bottom. Export declarations at their point of
definition are preferred when they make the public API easier to discover.
Barrel files may keep their re-exports together.

Ordering is semantic, not alphabetical. Alphabetize imports and simple
unordered collections only. Keep related functions, types, and constants
together even when that conflicts with alphabetical order.

### Functions

- Prefer named `function` declarations for named module-level operations,
  factories, route handlers, and reusable helpers.
- Use arrow functions for callbacks, short transformations, closures, and code
  that intentionally needs lexical `this`.
- Do not use hoisting as a reason to call functions before their definitions;
  declaration-before-use is preferred when it improves reading order.
- Keep side effects at clear boundaries and prefer pure functions for parsing,
  formatting, filtering, and transformations.

### Names and types

- Use the project domain vocabulary consistently: `Listing`, `Game`, `Shop`,
  `Conversation`, `Message`, `Seller`, and `Buyer`.
- Prefer expressive names over unexplained abbreviations.
- Prefix booleans with `is`, `has`, `can`, or `should`.
- Include units in names such as `priceCents`, `timeoutMs`, or `distanceMiles`.
- Distinguish raw, parsed, normalized, and serialized values in names.
- Use `unknown` rather than `any` for untrusted input.
- Add explicit return types to exported functions, public boundaries, and
  complex callbacks; allow straightforward local inference.
- Preserve each layer's external naming contract. Do not rename API or database
  fields as part of this refactor merely to impose camelCase or snake_case.

### TSDoc for exported declarations

- Every source declaration exported from a module has a concise TSDoc comment:
  exported types, constants, functions, classes, components, route handlers,
  and test-facing helpers are all included.
- The comment starts with a short description of the declaration's purpose or
  contract, normally one sentence.
- Add `@param` tags only when the parameter name is not sufficiently expressive
  or the parameter has a non-obvious constraint, unit, or interpretation.
- Do not add redundant `@param` tags that merely repeat names such as `path`,
  `database`, or `listingId` when the declaration and types already make their
  meaning clear.
- Use additional tags such as `@returns`, `@throws`, or `@example` only when
  they communicate behavior that is not obvious from the signature and brief
  summary.
- Document exported declarations at their source. Re-export-only barrels do not
  need duplicate TSDoc; `export *` and direct re-export statements are exempt.
- Document the exported type or function as a whole, not every property, unless
  an individual property has non-obvious domain semantics.

Example:

```ts
/** Resolves a project-relative path against the repository root. */
export function resolveProjectPath(path: string): string {
  ...
}

/** Loads game rankings from CSV text and persists them in batches. */
export function loadGameRanksCsv(
  csvText: string,
  createGamesBatch: CreateGamesBatch,
): CreateGameInput[] {
  ...
}
```

### Scope and sharing

- Keep implementation details private by default.
- Colocate code with its primary consumer.
- Share values only when they represent stable domain meaning or are genuinely
  reused by multiple consumers.
- Keep shared package code independent of application-specific code.
- Do not create generic utilities or abstractions solely to remove a small
  amount of duplication.
- Maintain clear boundaries: routes handle HTTP parsing, authorization, and
  responses; stores handle database access; integrations handle external
  services; UI components handle presentation and interaction.
- Avoid circular dependencies and accidental public exports.

### Constants, errors, comments, and tests

- Give repeated domain strings and numeric literals names.
- Maintain one source of truth for enum-like values, labels, and validation.
- Validate untrusted input at the boundary and use stronger types internally.
- Do not silently swallow errors; preserve existing error contracts while
  making failure paths explicit.
- Use comments for rationale, invariants, and non-obvious constraints, not for
  restating code.
- Test public behavior and contracts rather than implementation details.
- Keep tests and focused test helpers next to the code they verify.

## Explicit Non-Goals

- Do not alphabetize all functions, types, or constants.
- Do not require every export to appear at the bottom of a file.
- Do not redesign the API, database schema, authentication model, or product
  workflows.
- Do not combine this work with pending product tasks such as pagination,
  frontend auth centralization, image validation, or trade workflows.
- Do not perform a large semantic rewrite merely because a module can be made
  shorter.

## Incremental Execution

### 1. Establish a safe baseline

- Record the current results of `bun run typecheck`, `bun run test`, and
  `bun run build`.
- Inventory module-level exports, duplicated domain constants/types, obvious
  `any` usage, circular-dependency risks, and modules that mix route, database,
  integration, and presentation responsibilities.
- Identify behavior-sensitive files and preserve their existing tests before
  refactoring them.

### 2. Add objective tooling before source cleanup

- Add a repository `lint` command and a formatting check/format command.
- Migrate the existing package-level ESLint configuration to a checked-in
  configuration compatible with the repository's TypeScript, Preact, and
  current ESLint versions. Resolve the existing ESLint/config peer-version
  mismatch rather than ignoring it.
- Add the parser and rules required to lint TypeScript and JSX without turning
  subjective module ordering into a lint failure.
- Add a compatible TSDoc/JSDoc lint plugin and configure it to require a
  documentation comment for exported source declarations. Keep concision,
  useful wording, and the decision to add `@param` tags as human-review
  concerns rather than brittle lint rules.
- Add a formatter configuration with stable line width, quotes, semicolons,
  trailing commas, and line endings. Let the formatter own whitespace and
  layout; do not hand-maintain formatting rules in prose.
- Add lint and format checks to CI alongside the existing typecheck and test
  checks. Keep build validation in the local acceptance checklist.
- Apply formatting separately from semantic refactors where practical so
  reviews can distinguish mechanical changes from behavior changes.

### 3. Refactor shared code first

Process `packages/shared/src` in small filesets, starting with constants,
validation, formatters, utilities, and then types/barrels.

- Apply the agreed module layout and naming rules.
- Preserve the intentional semantic order in files such as condition values,
  labels, options, and validators.
- Audit duplicated listing/status/condition definitions across the apps. Move
  only cross-boundary domain definitions into the shared package; keep
  database-row and route-only types local.
- Make barrel exports explicit and limited to the supported shared API.
- Add concise TSDoc to every exported source declaration; do not add duplicate
  comments to shared barrel re-exports.
- Run typecheck and the relevant shared tests after each fileset.

### 4. Refactor API infrastructure and data access

Process these groups in dependency order:

1. `apps/api/src/utils`, `middleware`, and `auth`
2. `apps/api/src/bgg` and `storage`
3. `apps/api/src/db`
4. `apps/api/src/test` and colocated database tests

For each group:

- Separate local types, constants, private helpers, and public operations.
- Keep SQL row shapes, persistence types, and HTTP response types distinct
  unless they are intentionally the same contract.
- Keep ownership filtering, authentication, error handling, and SQL parameter
  ordering unchanged.
- Name values with units and lifecycle meaning where ambiguity exists.
- Extract shared helpers only when they have a stable domain contract and more
  than one legitimate consumer.
- Add or improve concise TSDoc on exported stores, records, helpers, and
  persistence-facing contracts while their behavior is already under review.
- Run the focused tests, then the full typecheck and test suite.

### 5. Refactor API routes and route registration

Process `apps/api/src/routes` by domain, beginning with lower-risk routes and
ending with `listings`, `conversations`, and `index.ts`.

- Keep route factories, injected dependencies, parsers, and handlers easy to
  distinguish.
- Keep request parsing and validation at the HTTP boundary.
- Keep authorization checks explicit and close to the data access they protect.
- Preserve route paths, status codes, response shapes, and auth defaults.
- Use named function declarations for route factories/handlers where that
  improves stack traces and navigation; retain arrows for callbacks and small
  local transformations.
- Add concise TSDoc to exported route factories, handlers, parsers, and public
  route-facing types. Describe auth, ownership, or response behavior only when
  it is not evident from the signature.
- Do not reorder validation or side effects unless tests demonstrate that the
  behavior is unchanged.

### 6. Refactor frontend pages, components, and helpers

Process `apps/web/src` in this order:

1. Pure page helpers and tests, including `gamesFilters` and upload helpers
2. Shared presentational components
3. Pages
4. `index.tsx` and route registration

- Keep page-specific state and helpers local unless they have a clear shared
  contract.
- Keep reusable UI behavior in components or focused hooks/utilities rather
  than duplicating it across pages.
- Preserve Preact component conventions and existing loading, error, and auth
  behavior.
- Add concise TSDoc to exported components, props types, and reusable page
  helpers; omit redundant parameter tags for self-explanatory props and values.
- Do not introduce frontend auth centralization as part of this cleanup; that
  remains the separate roadmap task in `TASKS.md`.
- Run the focused component/page tests and the full web test suite after each
  group.

### 7. Refactor scripts and test support

- Apply the same conventions to `scripts`, keeping one-off command behavior
  and environment variable semantics unchanged.
- Add concise TSDoc to exported script functions and shared script types, while
  keeping command-specific implementation details private.
- Keep test-only fixtures and helpers test-local unless multiple test domains
  require a stable shared fixture.
- Give tests scenario-oriented names and remove only demonstrably unused
  helpers.

### 8. Finalize enforcement and documentation

- Update the repository's contributor/developer guidance with the concise
  conventions above, without documenting subjective rules that tooling cannot
  enforce.
- Run formatting check, lint, typecheck, tests, and build on the complete
  refactored tree.
- Review the final diff for accidental API/schema changes, broad renames,
  weakened ownership checks, changed error behavior, and unnecessary shared
  abstractions.
- Ensure CI invokes the same commands developers use locally.

## Per-Batch Acceptance Criteria

Every refactor batch is complete only when:

- Formatting and lint checks pass for the touched files.
- Every exported source declaration has concise TSDoc, with `@param` tags only
  where they add information beyond an expressive parameter name.
- The relevant focused tests pass.
- `bun run typecheck` passes.
- The full `bun run test` suite passes before merging the batch.
- No public API, database, auth, or response-contract changes are present.
- Any intentional exception to the conventions is local, understandable, and
  documented by the code structure or a short rationale comment.

## Final Success Criteria

- All maintained source modules follow the semantic module layout or have a
  clear local reason not to.
- Public APIs, shared domain definitions, and layer boundaries are easy to
  identify from the file structure.
- Naming is consistent and expresses domain concepts and units.
- Repeated behavior is either intentionally local or backed by a justified
  shared abstraction.
- CI enforces formatting, linting, type safety, and tests without enforcing
  low-value alphabetical or export-position rules.
