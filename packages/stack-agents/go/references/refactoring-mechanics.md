# Refactoring Mechanics (behavior-preserving Go transforms)

> Reference document for go-reviewer and go-modernizer. Loaded on demand via Read tool.
> Upstream: golang.org/x/tools · github.com/uber-go/gopatch · github.com/dave/dst

A refactor is a transform that changes structure while provably preserving
behavior. In Go, "provably" means a construction-guaranteed tool did the edit —
not a freehand keystroke and not a text substitution. Pick the *weakest* tool
that can express the change, gate the risk against the blast radius's own test
coverage (see the safety net in `testing-patterns.md`), and never let a
refactor and a behavior change share a commit.

## Part 1 — The tool-escalation ladder

Two rules govern the whole ladder:

1. **Least-powerful tool first.** A `gofmt -r` rule you can read in one line is
   safer than a hand-written AST walk. Climb only when the rung below cannot
   express the transform.
2. **NEVER `sed`/`perl` a structural Go change.** Text tools rewrite *inside*
   string literals and comments, split identifiers that share a prefix, and
   have zero idea what scope a name lives in. Every rung below is
   syntax-aware; a regex is not. This rule has no exceptions.

Rungs, weakest first — each with a runnable command and its one-line trap:

1. **gopls code actions** — the blessed path for structural edits (Rename,
   Extract function/variable, Inline, "fill struct", organize imports). Drive
   them from the editor or the gopls MCP, not a shell. A CLI form exists —
   `gopls codeaction -kind=refactor.extract -exec ./pkg/file.go` — but it is
   *illustrative/debugging-only*; do not build a migration on it.
   Gotcha: code actions are single-file and cursor-scoped; they do not sweep a package.
2. **`gofmt -r`** — expression-pattern rewriting from the stdlib, no install.
   `gofmt -r 'fmt.Sprintf("%d", a) -> fmt.Sprint(a)' -w .`
   Gotcha: single-letter names are wildcards, but the rule matches **expressions only** — it cannot rewrite statements, add imports, or restructure control flow.
3. **`eg`** — example-based rewriting driven by a before/after template.
   `go install golang.org/x/tools/cmd/eg@latest` then `eg -t template.go -w ./...`
   Gotcha: like `gofmt -r` it transforms **expressions only** (a `before`/`after` function pair); it is not a migration engine.
4. **`gopatch`** — semantic patches (a diff-shaped `@@ ... @@` grammar) that
   *can* touch statements and imports.
   `gopatch -p rewrite.patch ./...`
   Gotcha: **beta, ~80% coverage** — treat it as an escalation rung for a specific pattern, not a whole-codebase migration tool; diff every result.
5. **go/analysis + `analysistest.RunWithSuggestedFixes`** — when a transform
   *recurs*, write an analyzer that emits a `SuggestedFix` and pin it with a
   golden-fixture test (`RunWithSuggestedFixes` applies the fix and diffs
   against `testdata/.../*.golden`). Ship it via `go vet -vettool=` or
   `go fix -fixtool=`.
   Gotcha: real engineering cost — only worth it above roughly a dozen call sites or a permanent lint.
6. **`go fix` / `//go:fix inline`** *(Go 1.26+)* — mark a wrapper or moved
   function `//go:fix inline`; `go fix ./...` then inlines every call, in this
   and downstream packages. The canonical low-risk way to retire a deprecated
   API or a v1→v2 import.
   `go fix ./...`
   Gotcha: the `inline` fixer and the `//go:fix` directive land in **Go 1.26** — gate on the toolchain the way go-modernizer gates every rewrite; it is a no-op on older `go`.
7. **`dave/dst`** — a decorated syntax tree for AST surgery that must survive
   round-tripping. Reach here only when no rung above fits.
   `import "github.com/dave/dst/decorator"` (parse → mutate → `decorator.Print`)
   Gotcha: use `dst`, **not** raw `go/ast` — `go/ast` attaches comments by byte offset and mangles their placement the moment you move a node.
8. **`deadcode -whylive`** — not a rewriter but the removal companion: proves
   what a deletion orphans and why a symbol is still reachable.
   `go install golang.org/x/tools/cmd/deadcode@latest` then `deadcode -whylive=pkg.Symbol ./...`
   Gotcha: it reasons over a build's reachability; unexported code hit only by reflection or `//go:linkname` can read as dead when it is not.

**Always finish with `goimports -w .`** after any mechanical transform — every
rung above can leave the import block stale, and a clean import list is the
cheapest signal that the edit type-checks.

## Part 2 — Smell → fix → tool → risk catalog

For *target shapes*, this table points at `design-patterns.md` rather than
re-teaching them; only the net-new **move/graft mechanics** are taught below it.

| Smell | Go fix (target shape) | Tool rung | Risk |
|-------|----------------------|-----------|------|
| Long positional constructor | Options struct — `design-patterns.md` §1 | gopls Extract + `gofmt -r` on call sites | Med |
| Package binds a concrete dependency | Consumer-side interface — `design-patterns.md` §5 | manual + `type A = B` alias | Med |
| Deep `if`/`else` nesting | Guard clauses — `design-patterns.md` §14 | gopls Extract / Inline | Low |
| Embedding for reuse | Composition — `design-patterns.md` §8 | gopls + manual | Low |
| Deprecated API called everywhere | `//go:fix inline` wrapper | `go fix` (1.26+) | Low |
| Repeated expression idiom | Template rewrite | `gofmt -r` → `eg` | Low |
| Type belongs in another package | `type A = B` alias move (below) | manual + `gopatch` for sites | Med |
| New logic tangled with untested legacy | Sprout (below) | manual + new tests | Low |
| Legacy call needs pre/post logic | Wrap (below) | gopls Rename + manual | Low |

**Move a type across packages via a temporary alias.** Moving `Foo` from
`pkg/old` to `pkg/new` in one shot breaks every importer. Instead: (1) define
`Foo` in `pkg/new`; (2) in `pkg/old` leave `type Foo = new.Foo` — an *alias*,
not a copy, so old importers keep compiling and stay type-identical; (3)
migrate importers to `pkg/new` (a `gopatch` or `//go:fix inline` job); (4)
delete the alias. Each step compiles green and is separately committable.

**Sprout Method/Class.** When new behavior must land inside a hairy, untested
function, do not edit that function's guts. Write the new behavior as a *new*
function or type with its own tests, and call it from the one place the old
code needs it. The risky legacy body is touched by one line, not rewritten.

**Wrap Method.** To add pre/post behavior to an existing call without editing
its body: rename the original (gopls Rename) to `fooCore`, then add a new `Foo`
with the original name that does the new work around a call to `fooCore`.
Callers are unchanged; the old behavior is preserved verbatim inside `fooCore`.

## Part 3 — Hard-rule gotchas

**After ANY rename, grep beyond the compiler.** gopls Rename guarantees the
code *compiles* — nothing more. It is blind to string-encoded uses of the name:
after renaming a field or type, grep the struct tags (`json:`, `db:`, `yaml:`,
`gorm:`), every `reflect`-based access (`FieldByName`, `MethodByName`,
`Tag.Get`), and any `text/template`/`html/template` files that name the old
identifier. Those keep compiling and fail at runtime.

**Never mix structural and behavioral changes in one commit.** A commit is
either a refactor (behavior byte-identical) or a behavior change — never both.
Reviewers and `git bisect` rely on that line. Concretely: **split a move from
an optimization.** Move the code in one commit, then optimize it in the next;
a move buried inside a perf change is unreviewable and un-revertable.

**Break import cycles with a consumer-side interface *before* moving code.**
If relocating a type would create an import cycle, do not fight the move —
first define the small interface at the *consumer* (`design-patterns.md` §5) so
the dependency inverts, *then* move. Ordering matters: the seam comes first.

Every transform above is only as safe as the tests guarding its blast radius.
Before touching code, size that blast radius's coverage and pick your caution
tier per the **Coverage-Adaptive Refactoring Safety Net** in
`testing-patterns.md` — below 40% you write characterization tests and install
seams before any transform, and restrict yourself to construction-guaranteed
tools from the ladder above.
