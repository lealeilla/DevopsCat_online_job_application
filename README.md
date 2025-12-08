# Online Job Application Tracker

Simple Node.js starter for an online job application tracker. This repository contains a Phase-based DevOps and implementation plan (Plan, Code, Build, Test) plus CI and containerization examples.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run app:

```bash
npm start
```

3. Run tests:

```bash
npm test
```

Project structure

- `index.js` - existing entry point (keeps current workspace file)
- `src/` - app source (Express app)
- `test/` - unit and integration tests
- `.github/workflows/ci.yml` - GitHub Actions CI pipeline example
- `Dockerfile` - multi-stage Dockerfile
- `docs/` - DevOps roadmap and error budget

Phases

- Phase 1 (Plan): scope = Node.js app. See `docs/roadmap.md`.
- Phase 2 (Code): Git branching strategy, PRs, code review, commit standards in `CONTRIBUTING.md`.
- Phase 3 (Build): GitHub Actions CI + Docker multi-stage example in `Dockerfile`.
- Phase 4 (Test): Jest unit/integration tests; CI runs tests and notifies.

If you want, I can initialize a local Git repo, make the first commit, and push a branch (I will need Git credentials/permission).
