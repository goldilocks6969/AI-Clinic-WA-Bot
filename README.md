# PaperPlane — Patient WhatsApp Bot

Multi-tenant, WhatsApp-native patient assistant. **One** shared WhatsApp Business number serves many clinics (tenants); patients join a clinic by code/QR and everything they do is scoped to that `clinic_id`.

- **Runtime:** Fastify + TypeScript (stateless; all conversation state in Postgres)
- **Provider:** 2Factor (Meta BSP) behind a swappable adapter — canonical message shape mirrors the Meta Cloud API, so Meta-direct/360dialog are near-free swaps
- **DB:** your Postgres (the bot depends on the contract in [`db/reference_schema.sql`](db/reference_schema.sql))
- **Hosting:** Vercel Pro (Mumbai `bom1`) now; Dockerized for AWS Mumbai later

## Patient flow
`JOIN <code>` (or scan clinic QR) → profile (name, DOB, gender) → menu → **upload report**, **book appointment**, **view health record**, **switch clinic**.

## Run locally

Requires Node ≥20 and a Postgres you can reach.

```bash
npm install
cp .env.example .env          # set DATABASE_URL at minimum
npm run db:schema             # apply db/reference_schema.sql
npm run db:seed               # 3 demo clinics: PPC-DEL / PPC-MUM / PPC-BLR (+ doctors)
npm run dev                   # Fastify on http://localhost:8080
```

### Prove it works without WhatsApp
```bash
npm run simulate
```
Drives the real router with fake Meta-shaped webhooks for several patients across all 3 clinics, prints the chat transcript, then a per-clinic data summary + a cross-tenant isolation check.

## Endpoints
- `GET /health`
- `GET /api/webhook` — provider verification handshake
- `POST /api/webhook` — inbound messages (deduped by message id, then routed)

## Layout
```
src/whatsapp/      provider abstraction + 2Factor adapter (canonical Meta shape)
src/conversation/  state machine: router + handlers (onboarding, menu, reports, appointments, record, switch)
src/db/            pg pool + repositories (every query clinic_id-scoped)
src/storage/       object store (S3/Spaces; local-disk fallback in dev)
api/index.ts       Vercel serverless wrapper around the Fastify app
db/reference_schema.sql   the DB contract (your real schema can differ; map in repositories)
scripts/           applySchema, seed, simulate
```

## Deploy (M4)

### 1. Postgres (yours)
- Provision in an India region (DPDP). Front it with **PgBouncer**/pooled connection for serverless.
- Apply the contract (or map your real schema in `src/db/repositories/*`). Seed clinics.

### 2. 2Factor WhatsApp Business
- Onboard a number you own + Meta business verification; get the API key.
- Point its inbound webhook at `https://<your-app>/api/webhook`; set `WEBHOOK_VERIFY_TOKEN`.
- **Confirm during the trial** (then adjust `src/whatsapp/providers/twofactor.ts`):
  1. exact inbound webhook JSON shape (raw Cloud API vs wrapper) — see `parseMetaShaped`,
  2. real send endpoint + auth header (`SEND_PATH`, `Authorization`),
  3. media endpoint (`MEDIA_PATH`) and verification handshake.

### 3. Object storage
- S3 `ap-south-1` or DO Spaces (BLR) bucket; set `STORAGE_*`. (Without it, files write to local disk — dev only.)

### 4. Vercel
- Pro project, region `bom1` (see `vercel.json`). Set env vars: `DATABASE_URL`, `TWOFACTOR_API_KEY`, `TWOFACTOR_BASE_URL`, `WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_BUSINESS_NUMBER`, `STORAGE_*`.
- Deploy. Verify `GET /health`, then send `JOIN PPC-MUM` from a real phone.

### Scale path
The same Docker image runs on AWS Mumbai (ECS Fargate or EC2+ALB) when you outgrow Vercel — no code change.
