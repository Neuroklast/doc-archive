# Workflow

Adapted from agent-documents/core/workflow.md.

## Delivery loop
1. Inspect code, scripts, dependencies and current data contract.
2. Define affected files, acceptance criteria, tests, privacy/retention risks and rollback.
3. Implement the smallest cohesive slice. Feature branches and reviewable commits preferred.
4. Test behavior, authorization and failure paths. Run the manifest's actual checks without watch mode.
5. Review the diff for unintended changes, PII exposure, broken uploads, orphan objects and search leaks.
6. Update product docs and decision records when behavior or guarantees changed.
7. Open a PR with verification evidence. Merge only when required checks are green.

## Document-specific invariants
- A browser refresh or upload timeout must not create a phantom archived document.
- A failed OCR/classification step must not lose the uploaded original.
- An empty OCR result does not mean the source file is empty.
- Document/folder ownership must be checked on reads as well as writes.
- Repeated upload requests must be idempotent or detect duplicates without cross-user exposure.
- Never replace the only stored copy before a new version is durably confirmed.

## Quality commands
Use scripts actually defined in package.json and the pinned lockfile (once scaffolding exists). Typical pipeline: lint → typecheck → unit/integration tests → build → browser E2E for scanner/archive flows. A documentation-only repository has no runnable app checks.

## Review handoff
Report: changed files, risk, tests run, tests not run, environment/config changes, migration impact, rollback and next tasks. Do not describe unverified functionality as shipped.
