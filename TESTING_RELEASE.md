# Testing & Release Strategy

## Phase 4: Testing

### Test Types Implemented

#### 1. **Unit Tests**
- Individual function/module testing
- Located in: `test/` directory
- Run with: `npm test`

#### 2. **Integration Tests**
- End-to-end API testing
- Database integration testing
- Located in: `test/applications.test.js`
- Tests all CRUD operations with real MySQL

### Test Automation in CI

The CI pipeline automatically:
- ✅ Runs tests on every push to `main` and `develop`
- ✅ Runs tests on every pull request
- ✅ Generates coverage reports
- ✅ Uploads coverage to Codecov
- ✅ Fails the build if tests fail

### Running Tests Locally

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- test/applications.test.js

# Generate coverage report
npm test -- --coverage
```

### Test Coverage

Current coverage targets:
- **Statements:** > 70%
- **Branches:** > 50%
- **Functions:** > 70%
- **Lines:** > 70%

View coverage report: `coverage/lcov-report/index.html`

---

## Phase 5: Release & Versioning

### Release Process

#### Option 1: Automatic Release (on Tag Push)

1. Create and push a Git tag:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

2. The release workflow automatically:
   - ✅ Builds Docker image
   - ✅ Pushes to Docker Hub as `username/ojat:1.0.0`
   - ✅ Creates GitHub Release with changelog
   - ✅ Notifies Slack

#### Option 2: Manual Release (via Workflow Dispatch)

1. Go to GitHub Actions → "Release & Versioning" workflow
2. Click "Run workflow"
3. Enter version (e.g., `1.0.0`)
4. Select release type (major/minor/patch)
5. Click "Run"

The workflow will:
- ✅ Update `package.json` version
- ✅ Create Git tag
- ✅ Push to Docker Hub
- ✅ Create GitHub Release
- ✅ Notify Slack

### Versioning Strategy

Uses **Semantic Versioning** (MAJOR.MINOR.PATCH):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features, backward compatible
- **PATCH** (1.0.1): Bug fixes

Example:
```
v1.0.0  →  v1.1.0  →  v1.1.1  →  v2.0.0
        (feature)  (hotfix)  (breaking)
```

### Tagging Conventions

- **Stable Release:** `v1.0.0`
- **Beta Release:** `v1.0.0-beta.1`
- **Alpha Release:** `v1.0.0-alpha.1`

### Docker Image Tagging

Images are automatically tagged with:
- `latest` - Most recent release
- `v1.0.0` - Specific version
- `commit-sha` - Commit hash

Access images:
```bash
docker pull username/ojat:latest
docker pull username/ojat:v1.0.0
docker pull username/ojat:abc1234
```

---

## Feedback Mechanism

### Slack Notifications

The pipeline sends Slack notifications for:

#### Test Notifications
- ✅ Test success with coverage %
- ❌ Test failures with error details
- 📊 Coverage metrics

#### Build Notifications
- ✅ Build success
- ❌ Build failures
- 🏗️ Image size and tags

#### Release Notifications
- 🚀 New release announcement
- 📦 Docker image pull command
- 🔗 GitHub release link

**Setup:** Add `SLACK_WEBHOOK` secret to GitHub

### Email Notifications (Optional)

For critical failures, emails can be sent if configured with:
- `EMAIL_SERVER`
- `EMAIL_PORT`
- `EMAIL_USERNAME`
- `EMAIL_PASSWORD`
- `NOTIFICATION_EMAIL`

### GitHub Check Runs

All workflow results show as GitHub Checks:
- Status badges on PRs
- Merge blocking on failures
- Detailed logs and artifacts

---

## Artifacts & Reports

### Test Artifacts
Generated and stored after each test run:
- Coverage reports: `coverage/lcov-report/`
- Test results: `test-results.xml`
- JUnit format for CI integration

Access via: Actions → Workflow → Artifacts

### Release Artifacts
Generated on release:
- Docker image (pushed to registry)
- GitHub Release notes
- Changelog from commits

---

## Best Practices

### 1. **Branching Strategy**
```
main (production)
├── Stable releases only
└── Protected: Requires PR review + tests pass

develop (staging)
├── Integration branch
└── Auto-tested on push
```

### 2. **Commit Messages**
Use conventional commits for automatic changelog:
```
feat: add new feature
fix: resolve bug
docs: update documentation
style: code formatting
chore: maintenance
BREAKING CHANGE: describe breaking changes
```

### 3. **Pull Requests**
- Create PR from feature branch to `develop`
- Tests must pass
- Requires review
- Merge to `develop`
- When ready, create PR from `develop` to `main`
- Tests must pass
- Create release tag

### 4. **Release Checklist**
- [ ] All tests passing
- [ ] Changelog updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Docker image pushed
- [ ] GitHub Release created
- [ ] Slack notification received

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests failing locally | Run `npm install` and ensure MySQL is running |
| Tests pass locally but fail in CI | Check environment variables (JWT_SECRET, DB_HOST) |
| Docker push fails | Verify DOCKER_USERNAME and DOCKER_PASSWORD secrets |
| No Slack notifications | Verify SLACK_WEBHOOK secret is set |
| Release not created | Ensure you pushed the tag with `git push origin v1.0.0` |

---

## Monitoring & Metrics

View in GitHub:
- Actions tab: Workflow status
- Insights → Code frequency: Commit activity
- Releases: All tagged releases
- Actions → workflow name: Detailed logs
