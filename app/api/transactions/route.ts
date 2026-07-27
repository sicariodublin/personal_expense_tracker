import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { transactions } from "../../../db/schema";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(transactions).orderBy(desc(transactions.date), desc(transactions.id));
    return Response.json({ transactions: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as typeof transactions.$inferInsert;
    if (!body.merchant?.trim() || !body.date || !(Number(body.amount) > 0)) return Response.json({ error: "Merchant, date and a positive amount are required" }, { status: 400 });
    const db = await getDb();
    const [transaction] = await db.insert(transactions).values({
      date: body.date, merchant: body.merchant.trim(), category: body.type === "income" ? "Income" : body.category || "Other",
      amount: Number(body.amount), type: body.type === "income" ? "income" : "expense", note: body.note || "",
    }).returning();
    return Response.json({ transaction }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add transaction" }, { status: 500 });
  }
}
