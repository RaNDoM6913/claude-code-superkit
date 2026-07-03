---
name: project-architecture
description: Project architecture reference — modules, layers, data flow
tokens: 277
user-invocable: false
---

# YOUR_PROJECT Architecture Reference

Auto-loaded template. Fill each section with real project details when you run `/superkit-init`, or by hand. While a section still reads `TODO`, this skill is unconfigured — agents must NEVER report a placeholder as a project fact.

Fill a count by running the example command and pasting the number. Keep example commands as plain inline code; do not prefix a command with a bang before its backtick (that would run it on load).

## Current Scale
- Services: TODO — count with `ls services/ | wc -l`
- Migrations: TODO — count with `ls migrations/*.up.sql | wc -l`

## System Overview
TODO: high-level component map / system diagram.

## Module Map
TODO: modules or services, and what each one owns.

## Data Flow
TODO: main request/response paths and background job flows.

## UI Components & Styling
TODO: component library and styling approach — design tokens, spacing scale, breakpoints, dark-mode support. Read by the visual-reviewer agent. Write "N/A — no frontend" if the project has no UI.

## Key Configuration
TODO: config files and what each one controls.
