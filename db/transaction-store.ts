import { desc, eq } from "drizzle-orm";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getDb } from ".";
import { transactions } from "./schema";

export type Transaction = typeof transactions.$inferSelect;

export type TransactionInput = {
  date?: unknown;
  merchant?: unknown;
  category?: unknown;
  amount?: unknown;
  type?: unknown;
  note?: unknown;
};

const localDataPath = process.env.LEDGERLY_LOCAL_DATA_PATH ?? "data/transactions.json";

type NormalizedTransaction = Omit<Transaction, "id">;

function shouldUseLocalStore() {
  return process.env.LEDGERLY_STORE !== "d1";
}

async function getOptionalDb() {
  if (shouldUseLocalStore()) return null;
  return getDb();
}

function normalizeInput(input: TransactionInput): NormalizedTransaction {
  const merchant = typeof input.merchant === "string" ? input.merchant.trim() : "";
  const date = typeof input.date === "string" ? input.date.trim() : "";
  const amount = Number(input.amount);
  const type = input.type === "income" ? "income" : "expense";
  const rawCategory = typeof input.category === "string" ? input.category.trim() : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";

  if (!merchant) throw new Error("Merchant is required");
  if (!isValidIsoDate(date)) throw new Error("A valid date is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("A positive amount is required");

  return {
    date,
    merchant,
    category: type === "income" ? "Income" : rawCategory || "Other",
    amount: Math.round(amount * 100) / 100,
    type,
    note,
  };
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function sortTransactions(rows: Transaction[]) {
  return [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

async function readLocalTransactions(): Promise<Transaction[]> {
  try {
    const content = await readFile(localDataPath, "utf8");
    const parsed = JSON.parse(content) as Transaction[];
    if (!Array.isArray(parsed)) return [];
    return sortTransactions(parsed.filter(isTransaction));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalTransactions(rows: Transaction[]) {
  await mkdir(dirname(localDataPath), { recursive: true });
  await writeFile(localDataPath, `${JSON.stringify(sortTransactions(rows), null, 2)}\n`, "utf8");
}

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Transaction>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.date === "string" &&
    typeof candidate.merchant === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.amount === "number" &&
    (candidate.type === "expense" || candidate.type === "income") &&
    typeof candidate.note === "string"
  );
}

export async function listTransactions() {
  const db = await getOptionalDb();
  if (!db) return readLocalTransactions();

  return db.select().from(transactions).orderBy(desc(transactions.date), desc(transactions.id));
}

export async function createTransaction(input: TransactionInput) {
  const normalized = normalizeInput(input);
  const db = await getOptionalDb();

  if (db) {
    const [transaction] = await db.insert(transactions).values(normalized).returning();
    return transaction;
  }

  const rows = await readLocalTransactions();
  const nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  const transaction = { id: nextId, ...normalized };
  await writeLocalTransactions([transaction, ...rows]);
  return transaction;
}

export async function updateTransaction(id: number, input: TransactionInput) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("A valid transaction ID is required");
  const normalized = normalizeInput(input);
  const db = await getOptionalDb();

  if (db) {
    const [transaction] = await db
      .update(transactions)
      .set(normalized)
      .where(eq(transactions.id, id))
      .returning();
    return transaction ?? null;
  }

  const rows = await readLocalTransactions();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;

  const transaction = { id, ...normalized };
  rows[index] = transaction;
  await writeLocalTransactions(rows);
  return transaction;
}

export async function deleteTransaction(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("A valid transaction ID is required");
  const db = await getOptionalDb();

  if (db) {
    const [deleted] = await db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning({ id: transactions.id });
    return Boolean(deleted);
  }

  const rows = await readLocalTransactions();
  const nextRows = rows.filter((row) => row.id !== id);
  if (nextRows.length === rows.length) return false;

  await writeLocalTransactions(nextRows);
  return true;
}

export async function importTransactions(inputs: TransactionInput[]) {
  if (!Array.isArray(inputs)) throw new Error("Transactions must be an array");
  if (inputs.length > 1000) throw new Error("You can import up to 1,000 transactions at a time");

  const normalized = inputs.map(normalizeInput);
  if (!normalized.length) throw new Error("No valid transactions found");
  const db = await getOptionalDb();

  if (db) {
    return db.insert(transactions).values(normalized).returning();
  }

  const rows = await readLocalTransactions();
  let nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  const created = normalized.map((transaction) => ({ id: nextId++, ...transaction }));
  await writeLocalTransactions([...created, ...rows]);
  return sortTransactions(created);
}




