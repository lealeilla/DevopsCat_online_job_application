# Contributing & Git Workflow

Branching strategy
- `main`: protected, deployable.
- `develop`: integration branch for ongoing work.
- `feature/<ticket>-short-desc`: feature branches created from `develop`.

Pull requests
- Open PRs from `feature/*` into `develop` (or `develop` -> `main` for releases).
- Require at least one reviewer and passing CI checks before merge.

Code review
- Keep PRs focused and small.
- Include tests for new logic.

Commit message standards
- Use Conventional Commits style:
  - `feat: add new search filter`
  - `fix: correct date parsing bug`
  - `docs: update README`

Release process
- Create release branches from `develop` when ready.
- Merge release branch to `main` and tag; merge `main` back into `develop`.
