# Historical `/dev` design concepts

The approved diagram is [the three-column design](../assets/dev-flow.png), embedded in the main [README](../../README.md). It shows all **16 phases, numbered 0–15**: Planning (7), Execution (5), Quality (4). The [orchestration guide](../guide/08-orchestration.md#the-dev-pipeline-16-phases) documents their order and complexity-dependent skips.

The four SVG concepts below and the [previous main diagram](../dev-flow.svg) are preserved as historical artwork. They fold Phase 0 (`Read Docs`) into the entry, leaving only 15 visible phase nodes and six Planning nodes. Their fixed four-reviewer fanout is illustrative: actual reviewers are selected by the changed scope, and testing and documentation have their own ordered phases. A `DONE` or `Shipped` label in an old concept does not establish commit or release completion. Use the approved diagram and workflow sources for the current behavior.

---

## 01 · Timeline horizontal
Historical left-to-right layout with colored phase zones and illustrative reviewer fanout. The limitations above apply.

<p align="center"><img src="01-timeline-horizontal.svg" alt="Timeline horizontal variant" width="1300"></p>

---

## 02 · Radial clock
Historical circular layout around a central `/dev` entry. The limitations above apply.

<p align="center"><img src="02-radial-clock.svg" alt="Radial clock variant" width="620"></p>

---

## 07 · Waterfall vertical
Historical alternating cascade with a reviewer branch. The limitations above apply.

<p align="center"><img src="07-waterfall-vertical.svg" alt="Waterfall vertical variant" width="500"></p>

---

## 09 · Node graph (dark schematic)
Historical dark schematic with a separate reviewer hub. The limitations above apply.

<p align="center"><img src="09-node-graph.svg" alt="Node graph dark variant" width="1250"></p>

---

These concepts are retained for design history. The main README uses the approved complete diagram linked above.
