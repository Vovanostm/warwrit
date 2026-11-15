import { Client } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

import { runMigrations } from './migrator.js';

const connectionString = process.env['DATABASE_URL'];
const client = connectionString ? new Client({ connectionString }) : undefined;

afterAll(async () => {
  await client?.end();
});

describe('mill descent kit stock migration rollback', () => {
  it.skipIf(client === undefined)(
    'allows an empty rollback and preserves changed stock and cash on refusal',
    async () => {
      if (!client) throw new Error('migration test database missing');
      await client.connect();

      expect((await runMigrations(client, 'down')).applied).toEqual(['0031_mill_descent_kits']);
      expect(
        (await client.query("select to_regclass('public.mill_descent_kit_stock') as name")).rows,
      ).toEqual([{ name: null }]);
      expect((await runMigrations(client, 'up')).applied).toEqual(['0031_mill_descent_kits']);

      await client.query(
        `insert into mill_descent_kit_stock (world_id, revision, quantity, price_q, cash_q)
         values ('migration-test-purchased-kit', 1, 1, 15000000, 15000000)`,
      );
      await expect(runMigrations(client, 'down')).rejects.toThrow(
        'refusing to delete retained mill descent kit stock or cash',
      );
      expect(
        (
          await client.query(
            `select revision::text, quantity, price_q::text, cash_q::text
             from mill_descent_kit_stock where world_id = 'migration-test-purchased-kit'`,
          )
        ).rows,
      ).toEqual([{ revision: '1', quantity: 1, price_q: '15000000', cash_q: '15000000' }]);
      expect(
        (
          await client.query(
            `select name from schema_migrations where name = '0031_mill_descent_kits'`,
          )
        ).rows,
      ).toEqual([{ name: '0031_mill_descent_kits' }]);

      await client.query(
        `delete from mill_descent_kit_stock where world_id = 'migration-test-purchased-kit'`,
      );
      expect((await runMigrations(client, 'down')).applied).toEqual(['0031_mill_descent_kits']);
    },
  );
});
