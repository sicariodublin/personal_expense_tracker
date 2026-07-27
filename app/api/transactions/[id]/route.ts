import { deleteTransaction, updateTransaction } from "../../../../db/transaction-store";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const transaction = await updateTransaction(Number(id), await request.json());
    if (!transaction) return Response.json({ error: "Transaction not found" }, { status: 404 });
    return Response.json({ transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update transaction";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const deleted = await deleteTransaction(Number(id));
    if (!deleted) return Response.json({ error: "Transaction not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete transaction";
    return Response.json({ error: message }, { status: 400 });
  }
}
