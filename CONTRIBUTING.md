# Pre-Commit Checklist — Veridex

Use this checklist before every commit to ensure code quality and security.

---

## ✅ Security Checks

- [ ] No `.env` files staged (run `git status`)
- [ ] No hardcoded secrets in code
- [ ] No MongoDB connection strings in code
- [ ] No JWT/API secrets in code
- [ ] docker-compose.yml uses `${ENV_VAR}` syntax only

```bash
# Scan for potential secrets
git diff --cached | grep -E "(password|secret|key|token|mongodb)" -i
```

---

## ✅ Code Quality

- [ ] No unused imports
- [ ] No commented-out code blocks (unless explaining why)
- [ ] No `// TODO` without issue reference
- [ ] TypeScript compiles without errors

```bash
npm run typecheck
```

---

## ✅ File Hygiene

- [ ] No debug files at repo root (*.txt, *.json dumps)
- [ ] No test output files
- [ ] No log files staged
- [ ] `.gitignore` covers all build artifacts

---

## ✅ Build Verification

- [ ] Frontend builds successfully
- [ ] Backend services start without error
- [ ] Docker compose starts all services

```bash
# Build check
cd apps/frontend-dashboard && npm run build

# Docker check
docker-compose config  # Validates compose file
```

---

## ✅ Git Hygiene

- [ ] Commit message follows convention: `type(scope): description`
- [ ] No WIP commits in final PR
- [ ] No merge commits (use rebase)

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `chore`: Maintenance
- `refactor`: Code restructure
- `test`: Test changes
- `style`: Formatting

---

## 🚨 Before Public Push

Additional checks for public GitHub visibility:

- [ ] README is up to date
- [ ] All mentioned files exist
- [ ] Test accounts use fake emails
- [ ] No real company names in seed data
- [ ] No personal data anywhere

---

## Quick Commands

```bash
# Run all pre-commit checks
npm run typecheck
npm run lint
npm run build

# Check what's staged
git diff --cached --name-only

# Verify .gitignore working
git status --ignored
```
