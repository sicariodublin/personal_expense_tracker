import { createTransaction, listTransactions } from "../../../db/transaction-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ transactions: await listTransactions() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return Response.json({ transaction: await createTransaction(await request.json()) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add transaction";
    return Response.json({ error: message }, { status: 400 });
  }
}
