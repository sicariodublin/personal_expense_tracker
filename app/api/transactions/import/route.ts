import { getDb } from "../../../../db";
import { transactions } from "../../../../db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { transactions?: (typeof transactions.$inferInsert)[] };
    const valid = (body.transactions ?? []).filter(t => t.merchant?.trim() && t.date && Number(t.amount) > 0).slice(0, 1000);
    if (!valid.length) return Response.json({ error: "No valid transactions found" }, { status: 400 });
    const db = await getDb();
    const created = await db.insert(transactions).values(valid.map(t => ({
      date: t.date, merchant: t.merchant.trim(), category: t.type === "income" ? "Income" : t.category || "Other",
      amount: Number(t.amount), type: t.type === "income" ? "income" as const : "expense" as const, note: t.note || "",
    }))).returning();
    return Response.json({ transactions: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to import transactions" }, { status: 500 });
  }
}
