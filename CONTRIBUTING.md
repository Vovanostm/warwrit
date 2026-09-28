# Contributing

## Branches and pull requests

Use a focused branch such as `feat/wp-01-deterministic-combat-kernel`. One work package may span more than one PR only when the split preserves independently verifiable value.

Every pull request must reference its work package or issue and include verification evidence. Squash merge is preferred until release history requires otherwise.

## Local setup

```bash
./scripts/bootstrap.sh
```

`scripts/bootstrap.sh` owns the full verification sequence (`pnpm verify`,
`pnpm test:combat:stress`, `pnpm test:migrations` against a disposable database).
Focused commands for editing are in
[LOCAL_DEVELOPMENT.md](docs/engineering/LOCAL_DEVELOPMENT.md#focused-checks).

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

- the full gate owned by `scripts/bootstrap.sh` passes on the final tree;
- no released migration is edited (`pnpm check:migrations`);
- package boundaries remain valid;
- documentation and schemas describe the implemented behavior;
- the pull request contains reproducible evidence.
