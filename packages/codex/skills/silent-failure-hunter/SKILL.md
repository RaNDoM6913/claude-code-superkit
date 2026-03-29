---
name: silent-failure-hunter
description: Find swallowed errors, empty catches, silent fallbacks -- code that hides failures
user-invocable: false
---

# Silent Failure Hunter

Find code that suppresses errors instead of handling them. Silent failures are the hardest bugs to debug -- the code "works" but loses data or state without any visible indication.

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` -- error handling conventions
2. `docs/architecture/backend-layers.md` -- expected error patterns

## When to Use

- During `/review` pipeline -- dispatched for changed code files
- After new endpoint/service creation -- verify error paths
- Periodic codebase health check

## Detection Patterns

### Go
```
_ = err                          # Explicitly discarding error
_ = someFunc()                   # Discarding error return
if err != nil { return nil }     # Swallowing error, returning nil
if err != nil { }                # Empty error handler
```

### JavaScript/TypeScript
```
catch (e) {}                     # Empty catch block
catch (e) { /* ignore */ }       # Intentionally swallowed
.catch(() => {})                 # Promise error swallowed
.catch(() => null)               # Promise error -> null
try { ... } catch { }            # Catch without variable
```

### Python
```
except:                          # Bare except catches everything
except Exception:                # Too broad
    pass                         # Swallowed
except Exception as e:           # Caught but unused
    pass
```

### Bash/Shell
```
2>/dev/null                      # Stderr suppressed
|| true                          # Error masked
|| :                             # Error masked (POSIX)
set +e ... dangerous ... set -e  # Error checking disabled
```

### Cross-Language
```
// @ts-ignore                    # TypeScript error suppressed
// noinspection                  # IDE warning suppressed
# type: ignore                   # Mypy error suppressed
//nolint                         # Go linter suppressed
```

## Evaluation

For each pattern found, evaluate:

1. **Is it intentional?** -- Check for explanatory comments like "// error is expected here because..."
2. **Is it safe?** -- Some patterns are safe (e.g., `_ = file.Close()` in Go deferred cleanup)
3. **Is data at risk?** -- Does the swallowed error mean data loss, state corruption, or security bypass?

### Severity
- **CRITICAL** -- Error suppression on data write path, auth path, or payment path
- **WARNING** -- Error suppression on non-critical path without explanation
- **SUGGESTION** -- Error suppression with comment explaining why it's safe

## Output Format

```
[SEVERITY] file:line -- description
  Pattern: <code snippet>
  Risk: <what could go wrong>
  Fix: <handle the error, log it, or add explanatory comment>
```

### Summary
```
## Silent Failure Report

Scanned: N files
Critical: X (data/auth/payment paths)
Warning: Y (unexplained suppression)
Suggestion: Z (commented but worth reviewing)

Patterns found:
- Empty catches: N
- Discarded errors: N
- Stderr suppression: N
- Linter suppressions: N
```

## Important

Not all error suppression is wrong. The goal is to ensure EVERY suppression is INTENTIONAL and DOCUMENTED. An `_ = err` with a comment "// close error is safe to ignore in cleanup" is fine. An `_ = err` with no explanation is a bug waiting to happen.
