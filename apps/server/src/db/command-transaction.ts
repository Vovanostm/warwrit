import type { Kysely, Transaction } from 'kysely';
import type { DatabaseSchema } from './database.js';

class RejectedTransaction<T> extends Error {
  constructor(readonly result: T) {
    super('Command rejected');
  }
}
/** An intent and its time catch-up either commit together or leave no partial writes. */
export async function executeCommandTransaction<T>(
  database: Kysely<DatabaseSchema>,
  execute: (transaction: Transaction<DatabaseSchema>) => Promise<T>,
  accepted: (result: T) => boolean,
): Promise<T> {
  try {
    return await database.transaction().execute(async (transaction) => {
      const result = await execute(transaction);
      if (!accepted(result)) throw new RejectedTransaction(result);
      return result;
    });
  } catch (error) {
    if (error instanceof RejectedTransaction) return error.result as T;
    throw error;
  }
}
