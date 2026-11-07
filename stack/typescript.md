# TypeScript conventions

Adapted from agent-documents/stack/typescript.md.

- `strict` mode, named exports for application modules; framework-required default exports permitted.
- Runtime validation at every trust boundary: request bodies, OCR results, browser file metadata, environment config, provider responses.
- Prefer `unknown` plus refinement instead of `any`; no `@ts-ignore` or blanket lint disables.
- Define domain types for `DocumentStatus`, `ProcessingStatus`, `UploadSession`, `StorageObject`, `OcrResult` and `ClassificationSuggestion`.
- Store dates as UTC instants where appropriate; distinguish document date from upload and processing timestamps.
- Use integer byte counts, nonnegative page counts and validated MIME/extension independent of user input.
- Keep PDF/OCR processors behind typed interfaces so browsers with limited APIs can use a safe fallback.
- Tests use synthetic sample documents and deterministic fixtures.
- Read and use the project's package scripts and lockfile. Do not add duplicate state-management or validation libraries.
