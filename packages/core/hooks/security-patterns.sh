#!/bin/bash
# security-patterns.sh — PostToolUse hook (Edit/Write)
# Detects dangerous code patterns in real-time during editing
# Profile: standard, strict
#
# Based on Anthropic official security-guidance plugin patterns.
# Warns (does not block) — security-scanner agent does deep analysis.
#
# EXIT CODES:
#   0 = allow (always — this hook only warns)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Read tool input — PostToolUse payload: .tool_input.file_path.
# See doc-check-on-commit.sh for the historical-bug context — same JSON shape.
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // .file_path // .filePath // empty' 2>/dev/null)

# Only check code files
case "$FILE_PATH" in
  *.go|*.ts|*.tsx|*.js|*.jsx|*.py|*.rs|*.rb|*.java|*.kt) ;;
  *) exit 0 ;;
esac

# Skip if file doesn't exist
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

WARNINGS=""

# JavaScript/TypeScript patterns
case "$FILE_PATH" in *.ts|*.tsx|*.js|*.jsx)
  if grep -qn 'eval(' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: eval() detected — potential code injection"
  fi
  if grep -qn 'new Function(' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: new Function() — dynamic code execution"
  fi
  if grep -qn 'dangerouslySetInnerHTML' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: dangerouslySetInnerHTML — XSS risk, use DOMPurify"
  fi
  if grep -qn 'document\.write' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: document.write — DOM XSS vector"
  fi
  if grep -qn '\.innerHTML\s*=' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: innerHTML assignment — XSS vector"
  fi
  ;;
esac

# Python patterns
case "$FILE_PATH" in *.py)
  if grep -qn 'pickle\.loads\|pickle\.load(' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: pickle deserialization — arbitrary code execution"
  fi
  if grep -qn 'os\.system(' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: os.system() — command injection risk, use subprocess"
  fi
  if grep -qn '__import__(' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: __import__() — dynamic import risk"
  fi
  if grep -qn '\bexec(' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: exec() — arbitrary code execution"
  fi
  ;;
esac

# Go patterns
case "$FILE_PATH" in *.go)
  if grep -qn 'fmt\.Sprintf.*SELECT\|fmt\.Sprintf.*INSERT\|fmt\.Sprintf.*UPDATE\|fmt\.Sprintf.*DELETE' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: fmt.Sprintf in SQL — use parameterized queries"
  fi
  # Weak hash for passwords
  if grep -qn 'crypto/md5\|crypto/sha1' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: weak hash (md5/sha1) — use bcrypt or argon2 for passwords"
  fi
  # Command injection
  if grep -qn 'exec\.Command.*+\|exec\.CommandContext.*+' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: exec.Command with concatenation — potential command injection"
  fi
  # text/template in HTTP context (XSS)
  if grep -qn '"text/template"' "$FILE_PATH" 2>/dev/null; then
    if grep -q 'http\.\|Handler\|handler\|router\|chi\.\|gin\.\|echo\.' "$FILE_PATH" 2>/dev/null; then
      WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: text/template in HTTP context — use html/template for XSS safety"
    fi
  fi
  # HTTP server without timeouts
  if grep -qn 'http\.ListenAndServe\b' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: http.ListenAndServe without explicit timeouts — slowloris risk. Use http.Server{ReadTimeout, WriteTimeout}"
  fi
  ;;
esac

# GitHub Actions injection
case "$FILE_PATH" in .github/workflows/*.yml|.github/workflows/*.yaml)
  if grep -qn '\${{.*github\.event' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: GitHub Actions expression injection risk"
  fi
  ;;
esac

# Output warnings
if [ -n "$WARNINGS" ]; then
  echo -e "\nSecurity patterns detected:${WARNINGS}"
  echo "  Run /security-scan for deep analysis."
  echo ""
fi

exit 0
