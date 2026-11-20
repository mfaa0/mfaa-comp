# MFAA AI Company — Starter

## What this starter does
- Serves a responsive Arabic RTL office dashboard.
- Defines six AI department roles.
- Sends a task to a selected role using the OpenAI Responses API.
- Saves tasks and approval requests in `data.json`.
- The Publisher role prepares metadata and creates an owner-approval request.
- No external publishing, messaging, or payment endpoints exist in this starter.

## Run on a computer or Node.js hosting
1. Install Node.js 20 or newer.
2. In this folder run: `npm install`
3. Copy `.env.example` to `.env`.
4. Put your NEW API key in `.env` as `OPENAI_API_KEY=...` (never put it in `public/` or commit `.env`).
5. Run: `npm start`
6. Open `http://localhost:3000`.

## Deploy
Deploy this folder to a Node.js host that supports environment variables and persistent storage.
Set `OPENAI_API_KEY` in the host's private environment-variable settings. Do not upload `.env`.
If the host has ephemeral storage, replace the JSON file storage with a managed database before production.

## Security
- Revoke any key that was pasted into a chat or exposed.
- Use a fresh project key, apply usage limits where available, and monitor usage.
- This is a starter, not production-hardened: before public launch add owner login, authorization, rate limits, CSRF protection, audit logs, database backups, and per-user access control.
- Approval decisions are recorded only. They do not trigger publication or any external action.
