# Contributing

Thank you for considering a contribution to Task Manager. Start with the
[development setup](docs/development/setup.md) and
[repository tour](docs/repository-tour.md).

## Local Setup

- Use Java 17 or newer and the checked-in Maven Wrapper.
- Use Node.js 22; `.nvmrc` records the supported frontend major version.
- Use `npm ci` from `taskmanager-frontend/`.
- Configure MySQL only when exercising the REST runtime. Frontend and backend
  tests use deterministic local test stores.

## Before Opening A Pull Request

1. Create a focused branch and keep unrelated formatting or refactors out of the
   change.
2. Update tests and canonical documentation when behavior or architecture changes.
3. Run `./scripts/verify-all.sh` from the repository root.
4. Review `git diff --check` and confirm no credentials, local environment files,
   generated archives, or build output are included.

Pull requests should explain the user-visible or architectural effect, the tests
performed, and any known follow-up work. Forward-only database changes must include
an upgrade path and must not rewrite previously released migration history.

## Architecture Changes

Review the [change impact guide](docs/reference/change-impact-guide.md) and the
[architecture decision records](docs/adr/README.md) before changing ownership
boundaries, persistence contracts, recurrence behavior, or native lifecycle.
