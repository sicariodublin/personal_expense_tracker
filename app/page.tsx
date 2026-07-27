"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Transaction = {
  id: number;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  type: "expense" | "income";
  note?: string;
};

type Draft = Omit<Transaction, "id">;

const categories = ["Groceries", "Transport", "Utilities", "Health", "Entertainment", "Dining", "Shopping", "Housing", "Income", "Other"];
const categoryMeta: Record<string, { icon: string; color: string }> = {
  Groceries: { icon: "G", color: "#7cf5c8" },
  Transport: { icon: "T", color: "#69a8ff" },
  Utilities: { icon: "U", color: "#ffc85c" },
  Health: { icon: "H", color: "#b7a4ff" },
  Entertainment: { icon: "E", color: "#ff8e9a" },
  Dining: { icon: "D", color: "#ffac73" },
  Shopping: { icon: "S", color: "#ef8cff" },
  Housing: { icon: "H", color: "#68d6e8" },
  Income: { icon: "I", color: "#7cf5c8" },
  Other: { icon: "O", color: "#8d9aaf" },
};

const seed: Transaction[] = [
  { id: 1, date: "2026-07-25", merchant: "Tesco Balbriggan", category: "Groceries", amount: 68.42, type: "expense" },
  { id: 2, date: "2026-07-24", merchant: "Irish Rail", category: "Transport", amount: 12.5, type: "expense" },
  { id: 3, date: "2026-07-23", merchant: "Electric Ireland", category: "Utilities", amount: 124.7, type: "expense" },
  { id: 4, date: "2026-07-22", merchant: "Revolution Gym", category: "Health", amount: 39.99, type: "expense" },
  { id: 5, date: "2026-07-21", merchant: "Spotify", category: "Entertainment", amount: 11.99, type: "expense" },
  { id: 6, date: "2026-07-19", merchant: "Salary", category: "Income", amount: 3820, type: "income" },
  { id: 7, date: "2026-07-18", merchant: "Lidl", category: "Groceries", amount: 54.2, type: "expense" },
  { id: 8, date: "2026-07-16", merchant: "Circle K", category: "Transport", amount: 63.1, type: "expense" },
  { id: 9, date: "2026-07-14", merchant: "Rent", category: "Housing", amount: 1050, type: "expense" },
  { id: 10, date: "2026-07-12", merchant: "The Brick Room", category: "Dining", amount: 46.8, type: "expense" },
];

const budgets: Record<string, number> = { Groceries: 600, Transport: 400, Utilities: 350, Entertainment: 120 };
const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const emptyDraft = (): Draft => ({ date: new Date().toISOString().slice(0, 10), merchant: "", category: "Groceries", amount: 0, type: "expense", note: "" });

function parseCsv(text: string): Transaction[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) throw new Error("The CSV file does not contain any transactions.");
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const split = (row: string) => row.split(new RegExp(`${delimiter}(?=(?:[^"]*"[^"]*")*[^"]*$)`)).map(v => v.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0]).map(h => h.toLowerCase());
  const find = (...names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
  const dateIdx = find("date", "data");
  const descIdx = find("description", "merchant", "details", "narrative", "payee");
  const amountIdx = find("amount", "value", "valor");
  const debitIdx = find("debit", "money out");
  const creditIdx = find("credit", "money in");
  if (dateIdx < 0 || descIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) {
    throw new Error("I could not identify the Date, Description and Amount columns.");
  }
  return lines.slice(1).map((line, index) => {
    const row = split(line);
    const debit = debitIdx >= 0 ? Number((row[debitIdx] || "0").replace(/[€£,\s]/g, "")) : 0;
    const credit = creditIdx >= 0 ? Number((row[creditIdx] || "0").replace(/[€£,\s]/g, "")) : 0;
    const raw = amountIdx >= 0 ? Number((row[amountIdx] || "0").replace(/[€£,\s]/g, "")) : credit - debit;
    const type = credit > 0 || raw > 0 && debitIdx < 0 ? "income" : "expense";
    const amount = Math.abs(raw || debit || credit);
    const rawDate = row[dateIdx];
    const parsed = new Date(rawDate.split("/").reverse().join("-"));
    return {
      id: Date.now() + index,
      date: Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10),
      merchant: row[descIdx] || "Imported transaction",
      category: type === "income" ? "Income" : "Other",
      amount,
      type,
    };
  }).filter(t => t.amount > 0);
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>(seed);
  const [active, setActive] = useState("Dashboard");
  const [modal, setModal] = useState<"add" | "import" | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");
  const [apiReady, setApiReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/transactions").then(async r => {
      if (!r.ok) throw new Error();
      const data = await r.json() as { transactions: Transaction[] };
      setApiReady(true);
      if (data.transactions.length) setTransactions(data.transactions);
      else await Promise.all(seed.map(t => fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) })));
    }).catch(() => setTransactions(seed));
  }, []);

  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const byCategory = useMemo(() => categories.map(name => ({
    name,
    value: transactions.filter(t => t.type === "expense" && t.category === name).reduce((s, t) => s + t.amount, 0),
  })).filter(x => x.value > 0).sort((a, b) => b.value - a.value), [transactions]);
  const visible = transactions.filter(t => (category === "All" || t.category === category) && `${t.merchant} ${t.note ?? ""}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
  const daily = Array.from({ length: 8 }, (_, i) => transactions.filter(t => t.type === "expense" && Number(t.date.slice(-2)) <= (i + 1) * 4).reduce((s, t) => s + t.amount, 0));
  const maxDaily = Math.max(...daily, 1);
  const points = daily.map((v, i) => `${i * 88 + 12},${210 - (v / maxDaily) * 175}`).join(" ");

  async function saveTransaction(event: FormEvent) {
    event.preventDefault();
    if (!draft.merchant.trim() || draft.amount <= 0) return;
    const tx = { ...draft, amount: Number(draft.amount), category: draft.type === "income" ? "Income" : draft.category };
    if (editing) {
      setTransactions(x => x.map(t => t.id === editing ? { ...tx, id: editing } : t));
      if (apiReady) await fetch(`/api/transactions/${editing}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tx) });
      setNotice("Transaction updated");
    } else {
      let created = { ...tx, id: Date.now() };
      if (apiReady) {
        const response = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tx) });
        if (response.ok) created = (await response.json() as { transaction: Transaction }).transaction;
      }
      setTransactions(x => [created, ...x]);
      setNotice("Transaction added");
    }
    setModal(null); setEditing(null); setDraft(emptyDraft());
    setTimeout(() => setNotice(""), 2500);
  }

  function startEdit(tx: Transaction) {
    setDraft({ date: tx.date, merchant: tx.merchant, category: tx.category, amount: tx.amount, type: tx.type, note: tx.note ?? "" });
    setEditing(tx.id); setModal("add");
  }

  async function remove(id: number) {
    setTransactions(x => x.filter(t => t.id !== id));
    if (apiReady) await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setNotice("Transaction deleted");
    setTimeout(() => setNotice(""), 2500);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseCsv(await file.text());
      if (apiReady) {
        const response = await fetch("/api/transactions/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: imported }) });
        if (response.ok) {
          const data = await response.json() as { transactions: Transaction[] };
          setTransactions(x => [...data.transactions, ...x]);
        }
      } else setTransactions(x => [...imported, ...x]);
      setModal(null); setNotice(`${imported.length} transactions imported`);
      setTimeout(() => setNotice(""), 3000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read that CSV file");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span><span>Ledgerly</span></div>
        <nav aria-label="Primary navigation">
          {["Dashboard", "Transactions", "Budgets", "Insights"].map((item, i) => (
            <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>
              <span>{["▦", "⇄", "◔", "⌁"][i]}</span>{item}
            </button>
          ))}
        </nav>
        <div className="privacy-note"><span>◆</span><div><strong>Private by design</strong><small>Your statements are processed securely.</small></div></div>
        <div className="profile"><span>F</span><div><strong>Fabio</strong><small>Personal account</small></div></div>
      </aside>

      <section className="content">
        <header>
          <div><p className="eyebrow">{active === "Dashboard" ? "FINANCIAL OVERVIEW" : active.toUpperCase()}</p><h1>{active === "Dashboard" ? "Good evening, Fabio" : active}</h1><p className="subtle">Here&apos;s your financial overview for July 2026</p></div>
          <div className="header-actions"><button className="secondary" onClick={() => setModal("import")}>⇧ Import CSV</button><button className="primary" onClick={() => { setDraft(emptyDraft()); setEditing(null); setModal("add"); }}>＋ Add transaction</button></div>
        </header>

        {active === "Dashboard" && <>
          <section className="kpis" aria-label="Financial summary">
            {[
              ["Balance", balance, "Available now", "↗"],
              ["Income", income, "This month", "↓"],
              ["Spent", expense, `${transactions.filter(t => t.type === "expense").length} transactions`, "↑"],
              ["Savings", Math.max(balance, 0), income ? `${Math.max((balance / income) * 100, 0).toFixed(0)}% savings rate` : "No income yet", "◇"],
            ].map(([label, value, meta, icon], i) => <article className={`kpi k${i}`} key={String(label)}><div className="kpi-icon">{icon}</div><div><span>{label}</span><strong>{money.format(Number(value))}</strong><small>{meta}</small></div></article>)}
          </section>

          <section className="dashboard-grid">
            <article className="card spending-card">
              <div className="card-head"><div><h2>Spending overview</h2><p>Your cumulative monthly spending</p></div><div className="segmented"><button className="selected">Monthly</button><button>Weekly</button></div></div>
              <div className="legend"><span><i className="mint" />July 2026 <b>{money.format(expense)}</b></span><span><i className="lavender" />June 2026 <b>{money.format(expense * .92)}</b></span></div>
              <svg className="chart" viewBox="0 0 640 240" role="img" aria-label="Cumulative spending chart">
                {[35, 78, 122, 166, 210].map(y => <line key={y} x1="12" y1={y} x2="628" y2={y} className="gridline" />)}
                <polyline points={points} className="chart-fill" />
                <polyline points={points} className="chart-line" />
                <polyline points={daily.map((v, i) => `${i * 88 + 12},${210 - ((v * .92) / maxDaily) * 175}`).join(" ")} className="chart-compare" />
                {["1 Jul", "5 Jul", "9 Jul", "13 Jul", "17 Jul", "21 Jul", "25 Jul", "29 Jul"].map((d, i) => <text key={d} x={i * 88 + 12} y="235">{d}</text>)}
              </svg>
              <div className="category-strip">
                {byCategory.slice(0, 5).map(item => <div key={item.name}><span className="cat-icon" style={{ "--cat": categoryMeta[item.name]?.color } as React.CSSProperties}>{categoryMeta[item.name]?.icon}</span><div><small>{item.name}</small><strong>{money.format(item.value)}</strong></div></div>)}
              </div>
            </article>

            <div className="right-stack">
              <article className="card budget-card"><div className="card-head"><div><h2>Budget progress</h2><p>July category limits</p></div><button className="text-button" onClick={() => setActive("Budgets")}>View all</button></div>
                {Object.entries(budgets).map(([name, limit]) => { const spent = byCategory.find(x => x.name === name)?.value ?? 0; const pct = Math.min(Math.round(spent / limit * 100), 100); return <div className="budget-row" key={name}><div><span className="cat-icon" style={{ "--cat": categoryMeta[name].color } as React.CSSProperties}>{categoryMeta[name].icon}</span><span>{name}</span><small>{money.format(spent)} / {money.format(limit)}</small><b>{pct}%</b></div><div className="progress"><i style={{ width: `${pct}%` }} /></div></div> })}
              </article>
              <article className="card insight-card"><span className="insight-icon">↗</span><div><h3>{balance >= 0 ? "You're on track" : "Review your spending"}</h3><p>{balance >= 0 ? `You kept ${money.format(balance)} after expenses this month.` : `Spending is ${money.format(Math.abs(balance))} above income.`}</p></div></article>
            </div>
          </section>
        </>}

        {(active === "Dashboard" || active === "Transactions") && <section className="card transactions-card">
          <div className="card-head"><div><h2>{active === "Dashboard" ? "Recent transactions" : "All transactions"}</h2><p>{visible.length} records</p></div><div className="filters"><input aria-label="Search transactions" placeholder="Search merchant…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div></div>
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th>Amount</th><th aria-label="Actions"></th></tr></thead><tbody>{visible.slice(0, active === "Dashboard" ? 6 : 100).map(tx => <tr key={tx.id}><td>{new Date(`${tx.date}T12:00:00`).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" })}</td><td><span className="merchant-icon">{tx.merchant.charAt(0)}</span><strong>{tx.merchant}</strong></td><td><span className="tag" style={{ "--cat": categoryMeta[tx.category]?.color } as React.CSSProperties}>{tx.category}</span></td><td className={tx.type}>{tx.type === "expense" ? "−" : "+"}{money.format(tx.amount)}</td><td><button className="row-action" aria-label={`Edit ${tx.merchant}`} onClick={() => startEdit(tx)}>Edit</button><button className="row-action danger" aria-label={`Delete ${tx.merchant}`} onClick={() => remove(tx.id)}>Delete</button></td></tr>)}</tbody></table></div>
          {!visible.length && <div className="empty"><strong>No transactions found</strong><span>Try another search or add a new transaction.</span></div>}
        </section>}

        {active === "Budgets" && <section className="standalone-grid">{Object.entries(budgets).map(([name, limit]) => { const spent = byCategory.find(x => x.name === name)?.value ?? 0; return <article className="card budget-tile" key={name}><span className="cat-icon" style={{ "--cat": categoryMeta[name].color } as React.CSSProperties}>{categoryMeta[name].icon}</span><h2>{name}</h2><strong>{money.format(spent)}</strong><p>of {money.format(limit)} monthly limit</p><div className="progress"><i style={{ width: `${Math.min(spent / limit * 100, 100)}%` }} /></div></article> })}</section>}
        {active === "Insights" && <section className="standalone-grid insights">{byCategory.map(item => <article className="card budget-tile" key={item.name}><span className="cat-icon" style={{ "--cat": categoryMeta[item.name]?.color } as React.CSSProperties}>{categoryMeta[item.name]?.icon}</span><h2>{item.name}</h2><strong>{money.format(item.value)}</strong><p>{expense ? (item.value / expense * 100).toFixed(1) : 0}% of total spending</p></article>)}</section>}
      </section>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">{modal === "add" ? "TRANSACTION" : "BANK STATEMENT"}</span><h2 id="modal-title">{modal === "add" ? (editing ? "Edit transaction" : "Add transaction") : "Import CSV"}</h2></div><button aria-label="Close" onClick={() => setModal(null)}>×</button></div>
        {modal === "add" ? <form onSubmit={saveTransaction}>
          <div className="type-toggle"><button type="button" className={draft.type === "expense" ? "selected" : ""} onClick={() => setDraft({ ...draft, type: "expense" })}>Expense</button><button type="button" className={draft.type === "income" ? "selected" : ""} onClick={() => setDraft({ ...draft, type: "income" })}>Income</button></div>
          <label>Merchant or description<input required autoFocus value={draft.merchant} onChange={e => setDraft({ ...draft, merchant: e.target.value })} placeholder="e.g. Tesco Balbriggan" /></label>
          <div className="form-row"><label>Amount (€)<input required type="number" min="0.01" step="0.01" value={draft.amount || ""} onChange={e => setDraft({ ...draft, amount: Number(e.target.value) })} placeholder="0.00" /></label><label>Date<input required type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label></div>
          {draft.type === "expense" && <label>Category<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{categories.filter(c => c !== "Income").map(c => <option key={c}>{c}</option>)}</select></label>}
          <label>Note <span>(optional)</span><textarea value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="Add a short note…" /></label>
          <div className="modal-actions"><button type="button" className="secondary" onClick={() => setModal(null)}>Cancel</button><button className="primary">{editing ? "Save changes" : "Add transaction"}</button></div>
        </form> : <div className="import-panel" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={importFile} />
          <span className="upload-icon">⇧</span><h3>Choose your bank statement</h3><p>Upload a CSV from your bank. We&apos;ll detect common Date, Description, Debit, Credit and Amount columns.</p><button className="primary">Choose CSV file</button><small>CSV only • Maximum 10 MB</small>
        </div>}
      </section></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
