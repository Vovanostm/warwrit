# Authored content

This directory will contain validated, versioned authored game content. WP-00 intentionally includes no gameplay content.

Every future JSON document must contain:

```json
{
  "schemaVersion": 1,
  "id": "stable.machine-readable-id"
}
```

Repository validation rejects duplicate IDs, invalid JSON, or missing schema versions. Domain-specific schemas will be introduced by the work package that owns each content type.
