# Release Guide

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Maintainers preparing a build or handoff |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide defines the current release-readiness checks. The repository does not
contain an automated production deployment pipeline or App Store release process.

## Release Boundary

The supported artifact boundaries are a Spring Boot package, React production
build, and synced Xcode project. Environment-specific hosting, TLS, secrets,
database provisioning, signing, TestFlight, and App Store submission remain
operator responsibilities outside this repository.

## Required Checks

1. Review the diff and confirm production code, tests, migrations, and canonical
   documentation agree.
2. Run `./scripts/verify-all.sh` from the repository root.
3. If MySQL changed, test the incremental script against a representative MySQL
   schema and record application order.
4. If SQLite changed, test both fresh initialization and version upgrade.
5. If native runtime or mobile layout changed, complete the iOS checklist on a
   simulator and, for lifecycle/focus work, a physical device.
6. If SQLite lifecycle changed, run and retain the structured native smoke result.

## Build Commands

```bash
./mvnw clean package
cd taskmanager-frontend
npm run build
npm run ios:sync
```

## Versioning

The Maven artifact and private frontend package both report `1.0.0`. There is no
automated coordinated product-version policy or changelog, so do not infer a
published release from those values.

## Review Package

Create a source-review archive in the ignored review-package directory with:

```bash
./scripts/create-review-package.sh
```

The script defaults to `review-packages/` at the repository root; that directory is
ignored by Git. Pass an output directory as its first argument when a specific
handoff location is required. The archive includes `REVIEW_MANIFEST.txt` with the
branch, commit, working-tree state, recent commits, scope, and included file list.
It excludes dependencies, build output, local environments, IDE state, and
generated native web assets.

## Rollback Considerations

- MySQL schema changes are manually applied and require an explicit rollback plan
  before production use.
- SQLite migrations are forward-only; app rollback must remain compatible with the
  upgraded database or be prohibited.
- REST and SQLite datasets cannot restore each other.

## Known Limitations

- CI does not sync or build the Xcode project.
- No deployment, signing, distribution, or rollback automation exists.
- No production security or secret-management guide exists because those systems
  are not implemented.

## Related Documents

- [Testing Guide](testing.md)
- [Known Limitations](../reference/known-limitations.md)
- [Configuration Reference](../reference/configuration.md)
