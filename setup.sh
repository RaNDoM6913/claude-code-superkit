#!/bin/sh
# claude-code-superkit — installer wrapper
# Run: bash setup.sh [options]  (from a cloned repo — current primary install path)
# Registry alternative: npx claude-code-superkit@1.5.3 when that version is available in npm.
command -v node >/dev/null 2>&1 || { printf 'Error: Node.js 18+ is required.\nInstall: https://nodejs.org\n' >&2; exit 1; }
exec node "$(dirname "$0")/bin/cli.js" "$@"
