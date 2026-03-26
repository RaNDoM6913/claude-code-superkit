#!/bin/sh
# claude-code-superkit — installer wrapper
# For direct use: npx claude-code-superkit
# This wrapper is for users who cloned the repo directly.
command -v node >/dev/null 2>&1 || { printf 'Error: Node.js 18+ is required.\nInstall: https://nodejs.org\n' >&2; exit 1; }
exec node "$(dirname "$0")/bin/cli.js" "$@"
