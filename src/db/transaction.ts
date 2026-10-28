import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

type TxDb = ReturnType<typeof createTxDb>;

let transactionDb: TxDb | undefined;

function createTxDb() {
  return drizzle(
    new Pool({ connectionString: process.env.DATABASE_URL! }),
    { schema },
  );
}

export function getTxDb() {
  if (!transactionDb) {
    transactionDb = createTxDb();
  }

  return transactionDb;
}
