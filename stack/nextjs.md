# Next.js on Vercel

Adapted from agent-documents/stack/nextjs.md.

- App Router and Server Components by default. Use Client Components only for interactive scanner, PDF rendering and browser Web Workers.
- Do not import `window`, canvas, PDF.js worker loaders, OpenCV.js or Tesseract.js into server bundles.
- Authenticated route handlers and server actions must verify the active session and document ownership on every operation. Page guards and middleware are not authorization.
- Do not put OCR text, file bytes, private metadata or signed links in public caches, static generation or build logs. Use `no-store` for sensitive responses.
- Use one API contract, consistent error handling and narrow request validation.
- Start Google Drive resumable uploads on the server with the linked user's OAuth token, then transfer large PDFs browser → Google using the session URI only. Never expose OAuth access or refresh tokens. Future R2 uses its own signed-PUT adapter.
- Avoid multipart uploads through Vercel function bodies. Verify provider-specific limits before choosing transport.
- Lazy-load PDF/OCR/image dependencies, process in Workers, keep mobile memory budgets in mind.
- Pin the installed Next.js version. Consult that version's current middleware/proxy, caching and security APIs rather than copying outdated patterns.
- Security headers and CSP must allow only necessary Google Drive upload and OAuth origins plus Worker/WebAssembly policies; test Drive CORS and resume in an actual browser before deploying. Future R2 origins remain optional.
