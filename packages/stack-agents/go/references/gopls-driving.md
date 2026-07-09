# Driving gopls (semantic navigation)

> Reference document for go-reviewer, go-error-reviewer, go-concurrency-reviewer. Loaded on demand via Read tool. Opt-in — requires the gopls MCP server.
> Upstream: https://github.com/golang/tools/tree/master/gopls · https://github.com/samber/cc-skills-golang

Grep finds text. gopls resolves the build: accurate references, interface satisfaction, and reference blast-radius that a regex cannot compute. This is exactly the accuracy gap on interface- and blast-radius findings. gopls is the Go team's language server; it exposes eight `go_*` tools over MCP. It is an external binary plus a registration step, so treat it as strictly opt-in — never assume it is wired.

## Setup (opt-in)

**Requires:** the `gopls` MCP server. This capability is inert until it is registered.

```bash
go install golang.org/x/tools/gopls@latest   # the binary
claude mcp add gopls -- gopls mcp            # register it with Claude Code
```

The server MUST be registered under the exact name `gopls`. The tools resolve as `mcp__gopls__go_*`; that namespace only exists if the server name is `gopls`. Register it under any other name and none of the tools below are callable.

If the server is not registered, everything below is inert — fall back to grep for references and `go doc` for external symbol contracts, exactly as the Evidence Gate already prescribes. Never assume the server is wired: probe with `go_workspace` first, and if it errors, drop to the grep + `go doc` path for the whole review.

## The eight tools

| Tool | Params | Use for |
|------|--------|---------|
| `go_workspace` | `{}` | Modules, packages, and layout of the workspace. Probe first — a clean return means the server is live. |
| `go_search` | `{"query"}` | Fuzzy-find a symbol by name, workspace-wide. Locate a definition before reading it. |
| `go_file_context` | `{"file"}` | A file's own symbols plus its intra-package dependencies. The semantic replacement for reading a file to orient. |
| `go_package_api` | `{"packagePaths":[]}` | A package's exported API surface. Resolves interface satisfaction and public contracts. |
| `go_symbol_references` | `{"file","symbol"}` | Every reference to a symbol, workspace-wide. The blast-radius tool — run before touching any definition. |
| `go_diagnostics` | `{"files":[]}` | Compiler + analyzer diagnostics for the listed files. NOT pushed automatically — you must call it after every edit. |
| `go_vulncheck` | `{"pattern":"./..."}` | Reachable vulnerabilities via govulncheck. Run only when `go.mod` / `go.sum` changed. |
| `go_rename_symbol` | *(params inferred: `file`, `symbol`, `newName` — confirm against your running server; upstream mcp.md/matrix.md do not publish the signature)* | Rename a symbol and every reference to it. Blocks any rename that would break interface satisfaction. |

## Read → Edit workflow order

**Reading (orient before you judge):**
`go_workspace` (probe + layout) → `go_search` (find the symbol) → `go_file_context` (the file's own symbols + local deps) → `go_package_api` (the exported surface / interface contracts).

**Editing (blast-radius before you touch, verify after):**
1. `go_symbol_references` on the definition to establish the full blast radius **BEFORE** you change anything. Every caller you would break is here.
2. Make the edit.
3. `go_diagnostics` on the changed files — **MANDATORY**. Diagnostics are not pushed to you; an unrun diagnostic is an unverified edit.
4. Fix what it reports and re-run `go_diagnostics` until clean.
5. `go_vulncheck` **only if `go.mod` changed** — a new or bumped dependency can pull in a reachable CVE.

## Load-bearing gotchas

- **Disk-only, no unsaved buffer.** The server sees files as they are on disk. Write your edit before you query — an unsaved change is invisible to `go_symbol_references`, `go_diagnostics`, and every other tool.
- **Results reflect ONLY the queried file's build config.** A query on `foo_windows.go` resolves under the Windows build; it will miss references in `bar_linux.go`. For cross-platform blast radius, re-run the reference query under the other GOOS / build-tag combinations — do not trust a single-config answer as complete.
- **References and call-hierarchy are static-dispatch only.** Calls made through an interface method or a function value are INVISIBLE to `go_symbol_references` — it resolves concrete, statically-dispatched calls, not dynamic ones. When a symbol is reached via an interface or a `func` field, corroborate the call sites manually (grep the method name, trace the interface) before you trust the reported blast radius.
- **Rename blocks interface-breaking changes.** `go_rename_symbol` refuses a rename that would break interface satisfaction — a rejection is signal, not a bug. It tells you the symbol participates in an interface contract you had not accounted for.
- **Scope = workspace + go.sum-pinned deps.** The server sees your workspace and the dependencies pinned in `go.sum`. A package that is not yet imported is out of scope; `go_search` / `go_package_api` will not find it. For a symbol in a not-yet-imported package, fall back to `go doc <pkg>` per the Evidence Gate instead of concluding it does not exist.

## Access-path ranking

Prefer the MCP path. It is the production interface.

1. **MCP (preferred)** — the `go_*` tools above. This is the path these agents use.
2. **Native LSP (bonus, experimental)** — enable with `ENABLE_LSP_TOOL=1`. Auto-pushes diagnostics as you edit, but it is experimental; use it only as a convenience layer over MCP, never as the sole path.
3. **CLI (`gopls codeaction`, etc.)** — debugging-only. Reach for the `gopls` command line to diagnose the server itself, never as the production navigation path.

Whatever the path, a gopls result is a valid VERIFIED citation — the same standing as a `file:line` you Read. When gopls is not wired, none of this applies: grep and `go doc` remain the citation sources. Never assume the server is wired; confirm it, then use it.
