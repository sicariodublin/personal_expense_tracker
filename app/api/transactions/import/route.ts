import { importTransactions, TransactionInput } from "../../../../db/transaction-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { transactions?: TransactionInput[] };
    return Response.json({ transactions: await importTransactions(body.transactions ?? []) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import transactions";
    return Response.json({ error: message }, { status: 400 });
  }
}
