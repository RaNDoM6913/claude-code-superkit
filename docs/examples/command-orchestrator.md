# Tutorial: Building a /deploy Orchestrator Command

This tutorial walks you through creating a `/deploy` command -- an orchestrator that coordinates multiple agents through 4 phases: pre-checks, build, deploy, and verify.

## What You'll Build

A command that:
1. Dispatches a pre-deploy-validator agent (compilation, tests, lint, security)
2. Auto-detects the project stack and runs the appropriate build
3. Executes deployment (placeholder for your actual deploy target)
4. Verifies the deployment with health checks

## The Orchestrator Pattern

Most powerful commands are **orchestrators** -- they coordinate multiple agents through sequential phases:

```
Phase 1: Pre-checks  --> dispatch validator agents
Phase 2: Build       --> auto-detect stack, compile
Phase 3: Deploy      --> execute deployment
Phase 4: Verify      --> health check post-deploy
```

Not every phase needs an agent. Simple phases (build, deploy) can use direct Bash commands.

## Step 1: Create the Command File

Commands live in `.claude/commands/` as Markdown files.

Create `.claude/commands/deploy.md`:

```markdown
---
description: Deploy to production -- validate, build, deploy, and verify in one command
argument-hint: "[staging|production] [--skip-tests] [--dry-run]"
allowed-tools: Bash, Read, Grep, Glob, Agent
---
```

**Frontmatter explained:**

| Field | Value | Why |
|-------|-------|-----|
| `description` | Shown in `/help` | Users see this when listing commands |
| `argument-hint` | Usage hint | Shows what arguments the command accepts |
| `allowed-tools` | Tools this command can use | `Agent` is critical for dispatching sub-agents |

## Step 2: Write Phase 1 -- Pre-Checks

This phase dispatches a validator agent to ensure the codebase is ready for deployment.

```markdown
# Deploy Orchestrator

Validate, build, deploy, and verify in a single command.

## Configuration

$ARGUMENTS

Parse arguments:
- **Target**: `staging` (default) or `production`
- **Flags**: `--skip-tests` (skip test phase), `--dry-run` (validate + build only, no deploy)

## Phase 1 -- Pre-Deploy Validation

Dispatch the **pre-deploy-validator** agent to run comprehensive checks:

```
Run all pre-deployment checks:
1. TypeScript compilation (all frontends)
2. Go vet (backend)
3. Linting (all components)
4. Tests (backend unit tests)
5. Frontend builds (verify bundles compile)
6. Migration consistency (up/down pairs)
7. OpenAPI spec sync
8. Debug artifact scan (console.log, fmt.Print)
9. Environment config completeness

Report results as a checklist. FAIL blocks deployment.
```

### Gate Decision

If the pre-deploy-validator reports any **FAIL**:
- Display the failures
- Ask: "Pre-checks failed. Fix issues and retry, or override with --force?"
- Do NOT proceed to Phase 2 unless all checks pass or --force is used

If `--skip-tests` flag is set:
- Skip check #4 (tests) but run everything else
- Add a WARNING to the final report: "Tests were skipped"
```

## Step 3: Write Phase 2 -- Build

This phase auto-detects the project stack and runs the appropriate build commands.

```markdown
## Phase 2 -- Build

Auto-detect project components and build each:

### Auto-Detection

```bash
# Detect which components exist
[ -f backend/go.mod ] && echo "GO_BACKEND=true"
[ -f frontend/package.json ] && echo "FRONTEND=true"
[ -f adminpanel/frontend/package.json ] && echo "ADMIN_FRONTEND=true"
```

### Build Steps

For each detected component, run in this order:

**Go Backend** (if `go.mod` exists):
```bash
cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/api ./cmd/api
echo "Backend binary: $(ls -lh bin/api | awk '{print $5}')"
```

**User Frontend** (if `frontend/package.json` exists):
```bash
cd frontend && npm ci && npm run build
echo "Frontend bundle: $(du -sh dist/ | cut -f1)"
```

**Admin Frontend** (if `adminpanel/frontend/package.json` exists):
```bash
cd adminpanel/frontend && npm ci && npm run build
echo "Admin bundle: $(du -sh dist/ | cut -f1)"
```

### Build Artifacts Summary

Report what was built:
| Component | Binary/Bundle | Size |
|-----------|--------------|------|
| Backend   | bin/api      | X MB |
| Frontend  | dist/        | X MB |
| Admin     | dist/        | X MB |

If any build fails, STOP. Do not proceed to Phase 3.
```

## Step 4: Write Phase 3 -- Deploy

This phase is a placeholder -- replace with your actual deployment mechanism.

```markdown
## Phase 3 -- Deploy

> **NOTE**: Replace this section with your actual deployment commands.
> Examples: `rsync`, `docker push`, `kubectl apply`, `fly deploy`, `scp + systemctl`.

### Dry Run Check

If `--dry-run` flag is set:
- Skip this phase entirely
- Report: "Dry run complete. Build artifacts ready but not deployed."
- Jump to Phase 4 summary

### Deployment Steps (placeholder)

```bash
# Example: Docker-based deployment
# docker build -t myapp:$(git rev-parse --short HEAD) .
# docker push registry.example.com/myapp:$(git rev-parse --short HEAD)
# ssh deploy@server "docker pull registry.example.com/myapp:latest && docker-compose up -d"

echo "PLACEHOLDER: Replace with your deployment commands"
echo "Target: $TARGET (staging or production)"
echo "Commit: $(git rev-parse --short HEAD)"
```

### Post-Deploy Tag

After successful deployment, tag the commit:
```bash
git tag -a "deploy-$(date +%Y%m%d-%H%M)" -m "Deployed to $TARGET"
```
```

## Step 5: Write Phase 4 -- Verify

```markdown
## Phase 4 -- Verify

After deployment, verify the service is healthy.

### Health Check

```bash
# Replace URL with your actual health endpoint
HEALTH_URL="https://api.example.com/healthz"
if [ "$TARGET" = "staging" ]; then
  HEALTH_URL="https://staging-api.example.com/healthz"
fi

# Retry health check up to 5 times with 10s delay
for i in $(seq 1 5); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "Health check passed (attempt $i)"
    break
  fi
  echo "Health check failed (attempt $i, status=$STATUS), retrying in 10s..."
  sleep 10
done

if [ "$STATUS" != "200" ]; then
  echo "CRITICAL: Health check failed after 5 attempts"
  echo "Consider rolling back: git revert HEAD && /deploy $TARGET"
fi
```

### Version Verification

```bash
# Verify deployed version matches what we built
DEPLOYED_VERSION=$(curl -s "$HEALTH_URL" | jq -r '.version // "unknown"')
EXPECTED_VERSION=$(git rev-parse --short HEAD)
if [ "$DEPLOYED_VERSION" = "$EXPECTED_VERSION" ]; then
  echo "Version verified: $DEPLOYED_VERSION"
else
  echo "WARNING: Version mismatch. Expected $EXPECTED_VERSION, got $DEPLOYED_VERSION"
fi
```

## Report

Output a deployment summary:

```
## Deployment Report

### Target
$TARGET ($HEALTH_URL)

### Pre-Checks
| Check | Status |
|-------|--------|
| TypeScript | PASS |
| Go Vet | PASS |
| Tests | PASS (or SKIPPED) |
| ... | ... |

### Build
| Component | Size | Time |
|-----------|------|------|
| Backend | X MB | Xs |
| Frontend | X MB | Xs |

### Deployment
- Commit: abc1234
- Tag: deploy-20260323-1430
- Duration: Xs

### Health Check
- Status: PASS/FAIL
- Version: abc1234
- Response time: Xms

### Overall: SUCCESS / FAILED
```

If `--dry-run`: report ends after Build section with "Dry run -- no deployment executed."
```

## The Complete File

Here's the full `.claude/commands/deploy.md` assembled:

```markdown
---
description: Deploy to production -- validate, build, deploy, and verify in one command
argument-hint: "[staging|production] [--skip-tests] [--dry-run]"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# Deploy Orchestrator

Validate, build, deploy, and verify in a single command.

## Configuration

$ARGUMENTS

Parse arguments:
- **Target**: first positional arg, `staging` (default) or `production`
- **Flags**: `--skip-tests`, `--dry-run`

## Phase 1 -- Pre-Deploy Validation

Dispatch the **pre-deploy-validator** agent:

> Run all pre-deployment checks. Report each as PASS/FAIL.
> FAIL on any critical issue blocks deployment.

Gate: if any FAIL, stop and report. Do not proceed.

## Phase 2 -- Build

Auto-detect stack from project files:
- `go.mod` --> `CGO_ENABLED=0 go build`
- `package.json` + `tsconfig.json` --> `npm ci && npm run build`
- `Cargo.toml` --> `cargo build --release`

Build each detected component. Report sizes.

## Phase 3 -- Deploy

If `--dry-run`: skip this phase.

Execute deployment commands (replace placeholder with your infra):
- Docker push, rsync, kubectl apply, fly deploy, etc.
- Tag the deployed commit.

## Phase 4 -- Verify

Health check the deployed service (retry 5x with 10s delay).
Verify deployed version matches the built commit.

## Report

Output summary table with pre-check results, build sizes, deploy status, and health check.
```

## Key Takeaways

1. **Orchestrators coordinate agents** -- dispatch `pre-deploy-validator` for heavy checks
2. **Auto-detection makes commands portable** -- check for `go.mod`, `package.json`, etc.
3. **Gates prevent bad deploys** -- Phase 1 failures block Phase 2
4. **`$ARGUMENTS` enables flexible input** -- flags, targets, modes
5. **Dry run support** -- always provide a safe way to test the pipeline
6. **Health checks close the loop** -- verify the deployment actually worked
7. **The `Agent` tool in `allowed-tools`** -- required for dispatching sub-agents

## Next Steps

- Replace Phase 3 placeholder with your actual deployment commands
- Add a `--rollback` flag that reverts the last deployment
- Create a `/deploy-status` command that checks current deployment health
- Wire a `Stop` hook that warns if you have uncommitted changes when ending a session after deployment
