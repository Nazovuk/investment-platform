---
description: Auto-commit and push changes to GitHub after updates
---

# Auto-Commit to GitHub Workflow

After making any code changes, automatically commit and push to GitHub.

// turbo-all

## Steps

1. Stage all changes
```bash
cd /Users/nazov1907/.gemini/antigravity/playground/tachyon-perihelion && git add -A
```

2. Commit with descriptive message
```bash
cd /Users/nazov1907/.gemini/antigravity/playground/tachyon-perihelion && git commit -m "Update: <describe changes>"
```

3. Push to GitHub
```bash
cd /Users/nazov1907/.gemini/antigravity/playground/tachyon-perihelion && git push origin main
```

## Notes
- Replace `<describe changes>` with actual change description
- This workflow runs automatically after code updates
- Remote: https://github.com/Nazovuk/investment-platform.git
