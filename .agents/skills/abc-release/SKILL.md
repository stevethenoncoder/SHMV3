---
name: shm-release
description: Use this skill when testing, building, verifying, committing, or deploying the SH Meals V3 application to GitHub and Firebase Hosting (shmeals-fc55d).
---

# SH Meals V3 — Release & Verification Workflow

This skill encapsulates the canonical procedure for verifying, compiling, version-controlling, and deploying the SH Meals V3 application. Always execute these steps in order.

## 1. Automated Invariant Testing
Execute the regression test suites to verify that mathematical invariants, calculations, and security sanitization rules hold:

```powershell
Get-ChildItem test/*.test.js | ForEach-Object { node --test $_.FullName }
```

Verify that all assertions pass before proceeding.

## 2. Production Build Verification
Compile the client bundle to verify TypeScript/JSX types, bundling, and asset pipelines:

```powershell
npm run build
```

Verify that the build exits with code 0 and outputs production assets into `dist/` (especially verifying `dist/index.html`).

## 3. Version Control Checkpointing
Stage all verified changes and commit them with clear, structured descriptions before deployment:

```powershell
git status
git add .
git commit -m "<Clear descriptive commit message>"
git push origin main
```

## 4. Live Firebase Deployment
Deploy the built site to live production Firebase Hosting for SH Meals:

```powershell
firebase deploy --only hosting --project shmeals-fc55d
```

Live site URL: https://shmeals-fc55d.web.app

## 5. Post-Release Sanity Checks
- Confirm successful HTTP response on live site: `https://shmeals-fc55d.web.app`
- Verify that live site reflects the latest changes without console errors.
