# Codex-Cryptum-2026

## Backend 

Start with [backend setup](backend/README.md), then review the [architecture and API contract](docs/architecture.md) and [database schema](docs/schema.md).

```powershell
cd D:\codex-cryptum\Codex-Cryptum-2026\backend
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

The protected competition backend implements sessions, team-specific flag verification, atomic scoring and official standings. LLM inference and vulnerable challenge environments are separate upcoming integrations.
