# OPTIONAL SHARED CONTRACT — epic #{{EPIC}}

Issues: {{ISSUES}}
Ownership: {{OWNERSHIP}}

Use only for a concrete shared dependency assigned by the parent; it is not a
prerequisite for every epic. Read issues, current owner decisions and owning docs.
Record the player outcome, needed interfaces/compatibility, producer/consumers,
path/resource ownership and dependency order in the existing owning contract.

Implement a preparatory interface/seam only when a named current consumer or
migration needs it and its behavior can be verified. Do not add empty functionality,
stubs or tests solely to create callers. Prefer sequencing overlapping work when
that is simpler. No automatic task splitting by line count and no automatic worker
launch. A merged preparatory contract does not satisfy gameplay acceptance.

Follow the assigned editor/branch-owner mode and validation owner. Report exact
checks, limitations and remaining criteria in `.orca/epic-{{EPIC}}-contract/report.md`;
set report_path accordingly. Shared doc writes need explicit assignment.
