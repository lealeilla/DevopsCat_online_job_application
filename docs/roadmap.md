# DevOps Roadmap (Phases & Tools)

Phase 1 — Plan
- Scope: Node.js web app (Express) for tracking job applications.
- Deliverables: requirements, architecture sketch, error budget, branching strategy.

Phase 2 — Code
- Git repo with branching model: `feature/*`, `develop`, `main` (protected).
- PRs for all merges into `develop`/`main` with at least one reviewer.
- Commit message standard: Conventional Commits (feat/fix/docs/chore/etc.).

Phase 3 — Build
- CI: GitHub Actions (or Jenkins if preferred).
- Build steps: install, lint, test, build Docker image.
- Containerization: multi-stage Dockerfile, small base image (alpine) for runtime.

Phase 4 — Test
- Unit tests: Jest for Node.js.
- Integration tests: Supertest for HTTP endpoints.
- CI runs tests and fails pipeline on test failures.
- Notifications: Slack webhook or email notifications on pipeline status.

Observability & Infra (extended)
- Use Prometheus + Grafana or a hosted monitoring provider.
- Use IaC (Terraform) to define env and infra.
