# Go CLI Patterns (Cobra + Viper)

> Reference document for go-reviewer. Loaded on demand via Read tool.
> Upstream: https://cobra.dev · https://github.com/spf13/viper

The kubectl/docker/gh/hugo shape — a command tree with layered config — is one of the most common Go artifacts. This is review-hygiene guidance for that shape, not a tutorial.

## Choosing the Layer

Pick the smallest tool that fits; don't reach for Cobra reflexively.

- **stdlib `flag`** — a trivial single-purpose tool with no subcommands. One binary, a handful of flags, no config file. Adding Cobra here is ceremony.
- **Cobra alone** — you need a command tree (`app sync`, `app status`, nested groups) but config is flags-and-env only, no file layering.
- **Cobra + Viper** — the production default: a command tree *plus* precedence across flags, env, and a config file. This is where the silent-failure bugs below live.

`urfave/cli` (v3) is the other mainstream framework and a fine choice; this document is cobra-first to match the kit's opinionated stack, so review Cobra unless the project already standardized on urfave.

## Project Layout

```
cmd/myapp/
  main.go        // only calls cmd.Execute(); nothing else
  root.go        // rootCmd + viper init + persistent flags
  sync.go        // one subcommand per file
  status.go
internal/...      // real logic lives here, not in cmd/
```

`main.go` stays a three-line shim so the command tree is importable and testable. `root.go` owns Viper initialization; each subcommand gets its own file and registers itself onto `rootCmd` in an `init()` or an explicit builder. Business logic belongs in `internal/`, called *from* the `RunE`, never inlined into it.

## Root Command Hygiene

**Silence the double-print.** Set both on the root command:

```go
rootCmd := &cobra.Command{
    Use:           "myapp",
    SilenceUsage:  true, // don't dump usage on every RunE error
    SilenceErrors: true, // you print the error yourself in main
}
```

Without `SilenceUsage`, any error returned from `RunE` makes Cobra print the full usage text after your error message — noise on a real failure. With both silenced, `main` owns the final print and exit code:

```go
func main() {
    if err := cmd.Execute(); err != nil {
        fmt.Fprintln(os.Stderr, "myapp:", err)
        os.Exit(1)
    }
}
```

**Exit codes** are an API. Honor the conventions:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Generic runtime error |
| 2 | Misuse — bad flags or arguments |
| 64–78 | `sysexits.h` (64 `EX_USAGE`, 78 `EX_CONFIG`, …) for tools that integrate with mail/init systems |
| 126 | Command found but not executable |
| 127 | Command not found |
| 128+N | Terminated by signal N (130 = SIGINT / Ctrl-C, 143 = SIGTERM) |

**stdout vs stderr.** stdout is the program's *pipeable output* (the data a caller greps or pipes into `jq`); stderr is logs, progress, and diagnostics. Never `fmt.Println` directly — write through `cmd.OutOrStdout()` and `cmd.ErrOrStderr()` so tests can capture streams and callers can redirect them independently.

**Machine vs human output.** Offer `--output json|table|plain` and default by detecting a pipe:

```go
stat, _ := os.Stdout.Stat()
piped := (stat.Mode() & os.ModeCharDevice) == 0 // not a TTY → default to json/plain
```

**Graceful shutdown.** Derive the root context from `signal.NotifyContext` so Ctrl-C cancels in-flight work instead of hard-killing it:

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
```

**Version embedding** via ldflags, not a hardcoded constant:

```
go build -ldflags "-X main.version=$(git describe --tags) -X main.commit=$(git rev-parse --short HEAD)"
```

**Testing discipline.** Drive the command through its own I/O and args, and assert on the captured buffer:

```go
buf := new(bytes.Buffer)
cmd.SetOut(buf)
cmd.SetErr(buf)
cmd.SetArgs([]string{"sync", "--dry-run"})
err := cmd.Execute()
```

Any code that prints via `cmd.OutOrStdout()` is now assertable; code that called `fmt.Println` is not.

## Cobra Gotchas

**The five hooks run in this exact order:**

`PersistentPreRunE` → `PreRunE` → `RunE` → `PostRunE` → `PersistentPostRunE`

**A child's `PersistentPreRunE` REPLACES the parent's — it does not chain.** If the root sets up logging/config in `PersistentPreRunE` and a subcommand defines its own, the parent's never runs and config is silently uninitialized. Call the parent explicitly:

```go
PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
    if p := cmd.Parent(); p != nil && p.PersistentPreRunE != nil {
        if err := p.PersistentPreRunE(cmd, args); err != nil {
            return err
        }
    }
    return openDBConn()
},
```

Alternatively set the package-global `cobra.EnableTraverseRunHooks = true` (Cobra 1.8+) once in `main` to chain every parent's hooks automatically — but then verify no subcommand still calls its parent manually (it would run twice).

**Always `RunE`, never `Run`.** `Run` has no error return, so its only escape is `os.Exit`/`panic` — both bypass deferred cleanup (open files, DB handles, `stop()`). `RunE` returns the error up to `Execute`, defers fire, and `main` sets the exit code.

**Validate arity with `Args`, never `len(args)` inside `RunE`.** Use `cobra.NoArgs`, `cobra.ExactArgs(n)`, `cobra.MinimumNArgs(n)`, `cobra.RangeArgs(min, max)`, or compose with `cobra.MatchAll(...)`. Cobra rejects bad input *before* `RunE` with proper usage text; a hand-rolled `len(args)` check duplicates that badly and skips the usage output.

**Build a FRESH command tree per test.** Cobra accumulates flag state across executions — a persistent flag set in one test leaks into the next. Have a `newRootCmd()` constructor and call it at the top of every test rather than reusing a package-level `rootCmd`.

## Viper Gotchas

**Precedence, highest to lowest:** explicit `Set` > flag > env > config file > key/value store > default. Reviewers should know this order cold, because most "my config is ignored" bugs are a value winning at a higher tier than expected.

**THE ENV TRIO — the premium silent failure.** For env vars to resolve, `SetEnvPrefix` + `SetEnvKeyReplacer` + `AutomaticEnv` must *all* be wired. Miss the replacer and nested keys silently never resolve, because Viper looks up the dotted name verbatim:

```go
// WRONG — MYAPP_DATABASE_HOST is set, but this returns ""
v.SetEnvPrefix("MYAPP")
v.AutomaticEnv()
v.GetString("database.host") // Viper searches env "MYAPP_DATABASE.HOST" (dot preserved) → miss
```

```go
// CORRECT — the replacer maps the dot to an underscore
v.SetEnvPrefix("MYAPP")
v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
v.AutomaticEnv()
v.GetString("database.host") // reads MYAPP_DATABASE_HOST
```

No error, no warning — the value is just always the default. Flag every `AutomaticEnv()` that lacks a paired `SetEnvKeyReplacer`.

**`BindPFlag` timing.** Bind in `init()` or `PersistentPreRunE`, never in `RunE` — by `RunE` the earlier hooks that read config have already run, so the binding is too late to matter.

**Handle the missing-file case explicitly.** A flag/env-only run has no config file and must not crash:

```go
if err := v.ReadInConfig(); err != nil {
    var nf viper.ConfigFileNotFoundError
    if !errors.As(err, &nf) {
        return fmt.Errorf("read config: %w", err) // real error (bad YAML, perms)
    }
    // no file — fine, fall back to flags/env/defaults
}
```

**`UnmarshalKey` over `Sub`.** Decode into a struct with `mapstructure` tags via `v.UnmarshalKey("database", &cfg)`. `v.Sub("database")` returns `nil` for a missing key, so the next method call is a nil-pointer panic.

**Isolate tests with `viper.New()`.** The package-level singleton leaks state between tests; construct a fresh `viper.New()` instance per test.

Watch-and-reload (`WatchConfig`) and remote KV backends (etcd/Consul) are out of scope; see cobra.dev.

## Common Mistakes

| Mistake | Severity | Symptom / Fix |
|---------|----------|---------------|
| `AutomaticEnv` without `SetEnvKeyReplacer` | **CRITICAL** | Nested env keys silently never resolve — always the default. Wire the full trio. |
| `Run` instead of `RunE` | **CRITICAL** | `os.Exit`/`panic` bypass defers; leaks resources and mangles exit codes. Use `RunE`. |
| Child `PersistentPreRunE` shadows parent | **CRITICAL** | Parent setup (config, logging) never runs. Call `cmd.Parent().PersistentPreRunE` explicitly. |
| `v.Sub(key)` on a possibly-missing key | **CRITICAL** | Returns `nil` → nil-pointer panic. Use `UnmarshalKey` into a struct. |
| `ReadInConfig` error unhandled | **WARNING** | Flag/env-only runs crash on a missing file. Ignore only `ConfigFileNotFoundError` via `errors.As`. |
| Missing `SilenceUsage`/`SilenceErrors` | **WARNING** | Full usage dump on every runtime error. Silence both; print in `main`. |
| `len(args)` checks inside `RunE` | **WARNING** | Duplicates validation, skips usage text. Use `cobra.ExactArgs`/`MatchAll`. |
| `BindPFlag` called in `RunE` | **WARNING** | Too late for hooks that already read config. Bind in `init`/`PersistentPreRunE`. |
| `fmt.Println` instead of `cmd.OutOrStdout()` | **WARNING** | Unassertable in tests; breaks stream redirection. Write through the command's writers. |
| Reusing a package-level `rootCmd` across tests | **WARNING** | Cobra accumulates flag state; tests bleed. Build a fresh tree per test. |
| Diagnostics on stdout | **SUGGESTION** | Pollutes piped output. Logs → stderr, data → stdout. |

## Further Reading

- Cobra: https://cobra.dev
- Viper: https://github.com/spf13/viper
- `sysexits.h` codes: https://man.freebsd.org/cgi/man.cgi?sysexits
