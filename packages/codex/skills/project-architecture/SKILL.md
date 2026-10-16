---
name: project-architecture
description: Use when a task depends on project modules, layers, data flow, configuration boundaries, or scale, including when the architecture reference is unfilled or conflicts with the source.
user-invocable: false
tokens: 692
---

# Project Architecture Reference

This shipped reference is **UNCONFIGURED**. Its empty fields are **UNKNOWN**, not
project facts or instructions to execute. A heading, placeholder, or example is
not evidence of a service, layer, dependency, or count.

## Use Relevant Evidence

1. Identify the architecture question needed for the authorized task. Read the
   applicable project instructions and existing configured architecture references
   first; preserve their supported content and conventions.
2. Check the relevant claims against available source, manifests, configuration,
   or recorded runtime evidence. Cite the path and section or symbol supporting
   each consequential claim. Distinguish current implementation, intended design,
   and inference; source layout alone does not prove deployed behavior or scale.
3. Evaluate entries individually. A supported module map can be usable while
   scale remains UNKNOWN. For missing, stale, or conflicting evidence, state what
   is uncertain and which sources disagree; do not fill gaps from generic patterns
   or silently promote a design document to current implementation.
4. Inspect only what resolves the task's relevant uncertainty. If an unresolved
   fact blocks a safe decision, report the missing evidence or request the needed
   clarification. Otherwise continue the supported work and carry the uncertainty
   into the result. Loading this reference does not authorize a repository-wide
   architecture rewrite or documentation edits.

## Project Fields

The entries below are inert placeholders. When an authorized task populates this
reference, replace only evidence-backed entries and record their sources. Mark
the reference PARTIALLY CONFIGURED while relevant entries remain unknown; use
CONFIGURED only for the documented scope. Keep known entries when others are
still unconfigured.

| Field | State and content |
|---|---|
| Current scale | UNKNOWN — service and migration counts, counting definitions, environment, and observation date have not been recorded. |
| System overview | UNKNOWN — system boundaries and relationships have not been recorded. |
| Module map | UNKNOWN — module paths, responsibilities, and dependency directions have not been recorded. |
| Data flow | UNKNOWN — relevant entry points, processing, storage, and external boundaries have not been traced. |
| Key configuration | UNKNOWN — configuration paths, consumers, and precedence have not been established. |

Report only the architecture relevant to the request: supported relationships and
their sources, consequences for the proposed change, and unresolved facts that
limit the conclusion. Do not invent topology, counts, deployment properties, or
configuration values to make the reference look complete.
