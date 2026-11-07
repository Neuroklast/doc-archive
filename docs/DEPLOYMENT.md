# Deployment and operations (Vercel + Neon + R2)

Adapted from agent-documents stack and integration guides. **These are setup instructions; no infrastructure has been provisioned.**

## Prerequisites
- Vercel account/project linked to `Neuroklast/doc-archive`.
- Neon PostgreSQL database with compatible auth/session schema.
- Private Cloudflare R2 bucket and least-privilege credentials.
- Deployed HTTPS origin and allowed login/callback origins.
- Node/package-manager version fixed by `package.json` and lockfile once scaffolding exists.

## Proposed server environment variables
Document these in `.env.example` during implementation. Never put real values into Git.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection string; server only |
| `BETTER_AUTH_SECRET` | High-entropy secret for auth |
| `BETTER_AUTH_URL` | Canonical HTTPS application origin |
| `R2_ACCOUNT_ID` | Cloudflare account reference |
| `R2_ACCESS_KEY_ID` | Scoped storage access ID |
| `R2_SECRET_ACCESS_KEY` | Scoped storage secret |
| `R2_BUCKET` | Private bucket name |
| `R2_ENDPOINT` | Verified endpoint for chosen jurisdiction (if required) |

Do not prefix secrets with `NEXT_PUBLIC_`. Actual env names must align with implemented SDK/provider configuration.

## Provisioning sequence
1. Create/verify private Neon DB. Restrict console access and choose intended region; use a migration chain tied to Drizzle.
2. Create/verify private R2 bucket. Disable public access. Scope keys to the bucket/actions the app needs. Configure CORS for the exact Vercel production and preview origins used.
3. Configure Vercel project and server environment, with distinct preview/production data resources.
4. Establish Better Auth trusted origins and session/cookie settings for the production hostname.
5. Deploy after successful lint, typecheck, tests and production build. No real document uploaded before basic auth/ownership tests.
6. Check upload CORS, signed PUT/GET, PDF viewer worker loading, content security policy, search and cross-user denial on the deployed preview.
7. Verify backup/export and restore with **synthetic** records before storing important documents.

## Free-tier and operational expectations
- Personal/noncommercial scope for Vercel Hobby, subject to current terms.
- Validate current quotas for Vercel, Neon and R2 at setup time; provider offerings are not guaranteed.
- Monitor storage bytes, R2 operation counts, Neon compute/storage, errors and security events without logging OCR text.
- No production deployment, billing change, destructive schema reset or rotation without explicit user approval.

## Disaster recovery
- Back up Postgres schema+metadata and R2 originals/processed objects with the same logical snapshot or manifest of checksums/object keys.
- Restore into an isolated environment. Reconcile DB pointers with object manifests before switching traffic.
- A backup of SQL without PDFs, or PDFs without searchable metadata, is incomplete.
- Periodically verify sampled checksum and PDF readability; validate missing/orphan report and manual recovery workflow.

## Troubleshooting
- Failed CORS: inspect exact origin, preflight method and signed headers.
- 403 on signed URL: ensure expiry, bucket, content type and origin are correct; never log the full URL.
- DB cannot connect: check credentials, region, pool limits and platform network policy.
- OCR unavailable: lazy worker/WASM assets and supported browser; avoid automatic external fallback.
- Browser PDF blank: validate content type, worker asset path, CSP and downloaded bytes using synthetic sample.
