import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { transactions } from "../../../../db/schema";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as typeof transactions.$inferInsert;
    const db = await getDb();
    const [transaction] = await db.update(transactions).set({
      date: body.date, merchant: body.merchant.trim(), category: body.type === "income" ? "Income" : body.category || "Other",
      amount: Number(body.amount), type: body.type === "income" ? "income" : "expense", note: body.note || "",
    }).where(eq(transactions.id, Number(id))).returning();
    return Response.json({ transaction });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update transaction" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await getDb();
    await db.delete(transactions).where(eq(transactions.id, Number(id)));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete transaction" }, { status: 500 });
  }
}
