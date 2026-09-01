# Contributing

## Branches and pull requests

Use a focused branch such as `feat/wp-01-deterministic-combat-kernel`. One work package may span more than one PR only when the split preserves independently verifiable value.

Every pull request must reference its work package or issue and include verification evidence. Squash merge is preferred until release history requires otherwise.

## Local setup

```bash
./scripts/bootstrap.sh
```

For an already bootstrapped checkout:

```bash
pnpm verify
pnpm db:up
pnpm test:migrations
pnpm db:down
```

## Commit messages

Use conventional, imperative subjects:

```text
feat(core): add deterministic command envelope
fix(server): reject stale encounter revisions
test(core): cover replay digest stability
docs(adr): record persistence boundary
chore(repo): update toolchain
```

## Definition of done

A contribution is complete only when:

- formatting, linting, architecture, content validation, type checking, build, and unit tests pass;
- migration up/down smoke passes when persistence is touched;
- package boundaries remain valid;
- documentation and schemas describe the implemented behavior;
- the pull request contains reproducible evidence.
