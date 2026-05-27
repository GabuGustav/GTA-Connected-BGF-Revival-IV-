# Security Note for BGF Revival IV Integration

## Current Status: Low Exposure in This Repository

### Reported Upstream Issue
A race condition has been reported in `node-tar` path reservations on case-insensitive / normalization-insensitive filesystems (notably macOS APFS), where Unicode-colliding names such as `ss` and `ß` may bypass reservation locking and be processed in parallel.

This can enable symlink-poisoning style overwrite races during archive extraction when untrusted tar input is processed.

### Relevance to This Project
- `tar` appears in dependency metadata as a transitive package (via `@mapbox/node-pre-gyp` in lockfile data).
- This codebase does **not** currently implement tar extraction flows for user-provided archives.
- No active call sites were found for `tar` extraction APIs in repository source.

### Risk Assessment for This App
- **Direct exploitability here**: low (no archive extraction path in app logic).
- **Potential future risk**: medium-high if tar extraction of untrusted input is introduced without safeguards.

### Required Guardrails (If Extraction Is Added Later)
1. Reject symlink and hardlink entries from untrusted archives.
2. Enforce strict extraction destination checks (no traversal, no link-follow overwrite behavior).
3. Use a patched `tar` release once upstream publishes a fix for this collision class.
4. Add regression tests for Unicode-colliding names (`ss`, `ß`, composed/decomposed forms) on macOS runners.

### Operational Guidance
- Keep dependency updates current and monitor `tar` advisories.
- Treat any future archive extraction feature as security-sensitive and require review.

---

Conclusion: this repository is not currently exposing the vulnerable tar extraction path, but the reported Unicode-collision issue is valid to track and must be treated as a blocker for any future untrusted tar extraction feature.
