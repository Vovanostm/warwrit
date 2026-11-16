DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM world_lab_slots) THEN
    RAISE EXCEPTION 'refusing to delete world lab fixture slots';
  END IF;
  IF EXISTS (SELECT 1 FROM world_lab_npc_groups) THEN
    RAISE EXCEPTION 'refusing to delete persisted world lab NPC groups';
  END IF;
END $$;
DROP TABLE world_lab_slots;
DROP INDEX world_lab_npc_groups_due_idx;
DROP TABLE world_lab_npc_groups;
