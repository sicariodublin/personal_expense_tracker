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

const baseCategories = ["Groceries", "Transport", "Utilities", "Health", "Entertainment", "Dining", "Shopping", "Housing", "Carro", "Family", "Self Care", "Gym", "Fee", "Education", "Gift", "Loan/CreditCard", "Holidays", "Investment", "Licenses", "Income", "Other"];
const baseCategoryMeta: Record<string, { icon: string; color: string }> = {
  Groceries: { icon: "G", color: "#7cf5c8" },
  Transport: { icon: "T", color: "#69a8ff" },
  Utilities: { icon: "U", color: "#ffc85c" },
  Health: { icon: "H", color: "#b7a4ff" },
  Entertainment: { icon: "E", color: "#ff8e9a" },
  Dining: { icon: "D", color: "#ffac73" },
  Shopping: { icon: "S", color: "#ef8cff" },
  Housing: { icon: "H", color: "#68d6e8" },
  Carro: { icon: "C", color: "#c9a7ff" },
  Family: { icon: "F", color: "#5ce1c9" },
  "Self Care": { icon: "S", color: "#ffd166" },
  Gym: { icon: "G", color: "#a8e6cf" },
  Fee: { icon: "F", color: "#ff9f9f" },
  Education: { icon: "E", color: "#8ecae6" },
  Gift: { icon: "G", color: "#f7b2ff" },
  "Loan/CreditCard": { icon: "L", color: "#e07a5f" },
  Holidays: { icon: "H", color: "#ffe066" },
  Investment: { icon: "I", color: "#6fcf97" },
  Licenses: { icon: "L", color: "#ff7b86" },
  Income: { icon: "I", color: "#7cf5c8" },
  Other: { icon: "O", color: "#8d9aaf" },
};
const categoryPalette = ["#7cf5c8", "#69a8ff", "#ffc85c", "#b7a4ff", "#ff8e9a", "#ffac73", "#ef8cff", "#68d6e8", "#ff7b86", "#5ce1c9", "#c9a7ff", "#ffd166"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PAGE_SIZE = 50;

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

const defaultBudgets: Record<string, number> = { Groceries: 600, Transport: 400, Utilities: 350, Entertainment: 120 };
const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

function loadSavedBudgets() {
  if (typeof window === "undefined") return defaultBudgets;
  try {
    const saved = localStorage.getItem("ledgerly-budgets");
    return saved ? JSON.parse(saved) as Record<string, number> : defaultBudgets;
  } catch {
    return defaultBudgets;
  }
}

function loadSavedCategories(): Record<string, { icon: string; color: string }> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem("ledgerly-custom-categories");
    return saved ? JSON.parse(saved) as Record<string, { icon: string; color: string }> : {};
  } catch {
    return {};
  }
}

function loadHiddenCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("ledgerly-hidden-categories");
    return saved ? JSON.parse(saved) as string[] : [];
  } catch {
    return [];
  }
}
const emptyDraft = (): Draft => ({ date: new Date().toISOString().slice(0, 10), merchant: "", category: "Groceries", amount: 0, type: "expense", note: "" });

function deriveCategory(merchant: string): string {
  const n = merchant.toUpperCase();
  if (/NETFLIX|SPOTIFY/.test(n)) return "Entertainment";
  if (/LIDL|ALDI|TESCO|SUPERVALU|SPAR|MORE 4|POLSKI/.test(n)) return "Groceries";
  if (/APPLEGREEN|PETROL|PARKING|ONLINE MOTOR|TOLL/.test(n)) return "Carro";
  if (/AIB CARD PYMT|NAPS LOAN|PREMIUM CREDIT/.test(n)) return "Loan/CreditCard";
  if (/IRISH LIFE|BRECAN PHARM|GET HEALTH|THE MEDICAL CE/.test(n)) return "Health";
  if (/BORD GAIS|EIR|RENT|GAS|MORIARTY REAL/.test(n)) return "Utilities";
  if (/APACHE PIZZA|SPAR EAST|EDDIE ROCKETS/.test(n)) return "Dining";
  if (/\bFEE\b|\bTAX\b|STAMP DUTY/.test(n)) return "Fee";
  if (/MICROSOFT|APPLE|GOOGLE|OPENAI|TRAE/.test(n)) return "Licenses";
  if (/LEAP CARD|IRISH RAIL/.test(n)) return "Transport";
  if (/HUMMGROUP|FOOT LOCKER/.test(n)) return "Gift";
  if (/PLATINUM/.test(n)) return "Gym";
  if (/GUSTAVO|HP NUTRITION|SP DISCOUNT|IHERB|VITAMIN SHOP|MOV &/.test(n)) return "Self Care";
  return "Other";
}

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
    const type: Transaction["type"] = credit > 0 || raw > 0 && debitIdx < 0 ? "income" : "expense";
    const amount = Math.abs(raw || debit || credit);
    const rawDate = row[dateIdx];
    const parsed = new Date(rawDate.split("/").reverse().join("-"));
    return {
      id: Date.now() + index,
      date: Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10),
      merchant: row[descIdx] || "Imported transaction",
      category: type === "income" ? "Income" : deriveCategory(row[descIdx] || ""),
      amount,
      type,
    };
  }).filter(t => t.amount > 0);
}

function transactionSignature(t: { date: string; merchant: string; amount: number; type: string }) {
  return `${t.date}|${t.merchant.trim().toLowerCase()}|${t.amount.toFixed(2)}|${t.type}`;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [active, setActive] = useState("Dashboard");
  const [modal, setModal] = useState<"add" | "import" | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [budgets, setBudgets] = useState<Record<string, number>>(() => loadSavedBudgets());
  const [customCategories, setCustomCategories] = useState<Record<string, { icon: string; color: string }>>(() => loadSavedCategories());
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => loadHiddenCategories());
  const [budgetModal, setBudgetModal] = useState<{ mode: "add" | "edit"; name: string; useNew: boolean; newName: string; amount: string } | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [filterYear, setFilterYear] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [, setApiReady] = useState(false);
  const [chartMode, setChartMode] = useState<"monthly" | "weekly">("monthly");
  const fileRef = useRef<HTMLInputElement>(null);

  const categoryMeta = useMemo(() => ({ ...baseCategoryMeta, ...customCategories }), [customCategories]);
  const categories = useMemo(() => [...baseCategories.filter(c => c !== "Other" && !hiddenCategories.includes(c)), ...Object.keys(customCategories), "Other"], [customCategories, hiddenCategories]);

  useEffect(() => {
    fetch("/api/transactions").then(async r => {
      if (!r.ok) throw new Error();
      const data = await r.json() as { transactions: Transaction[] };
      setApiReady(true);
      setTransactions(data.transactions);
    }).catch((error) => {
      setApiReady(false);
      setTransactions([]);
      setNotice(friendlyError(error, "Could not connect to the local transaction API"));
    });
  }, []);


  const availableYears = useMemo(() => Array.from(new Set(transactions.map(t => t.date.slice(0, 4)))).sort((a, b) => b.localeCompare(a)), [transactions]);
  const periodTransactions = useMemo(() => transactions.filter(t =>
    (filterYear === "All" || t.date.slice(0, 4) === filterYear) &&
    (filterMonth === "All" || t.date.slice(5, 7) === filterMonth)
  ), [transactions, filterYear, filterMonth]);
  const periodLabel = filterYear === "All" && filterMonth === "All"
    ? "all time"
    : [filterMonth !== "All" ? monthNames[Number(filterMonth) - 1] : null, filterYear !== "All" ? filterYear : null].filter(Boolean).join(" ");

  const expense = periodTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const income = periodTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const byCategory = useMemo(() => categories.map(name => ({
    name,
    value: periodTransactions.filter(t => t.type === "expense" && t.category === name).reduce((s, t) => s + t.amount, 0),
  })).filter(x => x.value > 0).sort((a, b) => b.value - a.value), [periodTransactions, categories]);
  const visible = periodTransactions.filter(t => (category === "All" || t.category === category) && `${t.merchant} ${t.note ?? ""}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
  const visibleSpent = visible.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const visibleReceived = visible.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = active === "Dashboard" ? visible.slice(0, 6) : visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const budgetCategoryNames = categories.filter(name => name !== "Income");
  const chartValues = useMemo(() => {
    const expenses = periodTransactions.filter(t => t.type === "expense");
    if (chartMode === "weekly") {
      const latest = expenses.reduce((max, tx) => tx.date > max ? tx.date : max, new Date().toISOString().slice(0, 10));
      const end = new Date(`${latest}T12:00:00`);
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(end);
        date.setDate(end.getDate() - (6 - i));
        const key = date.toISOString().slice(0, 10);
        return expenses.filter(t => t.date === key).reduce((sum, tx) => sum + tx.amount, 0);
      });
    }

    return Array.from({ length: 8 }, (_, i) => expenses
      .filter(t => Number(t.date.slice(-2)) <= (i + 1) * 4)
      .reduce((sum, tx) => sum + tx.amount, 0));
  }, [chartMode, periodTransactions]);
  const chartLabels = chartMode === "weekly" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["1", "5", "9", "13", "17", "21", "25", "29"];
  const maxDaily = Math.max(...chartValues, 1);
  const chartStep = 616 / Math.max(chartValues.length - 1, 1);
  const points = chartValues.map((v, i) => `${i * chartStep + 12},${210 - (v / maxDaily) * 175}`).join(" ");

  async function readApiError(response: Response) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    return data?.error ?? "Request failed";
  }

  function friendlyError(error: unknown, fallback: string) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return "Could not reach the local app server. Restart it with npm run dev.";
    }
    return error instanceof Error ? error.message : fallback;
  }

  function persistBudgets(nextBudgets: Record<string, number>) {
    setBudgets(nextBudgets);
    localStorage.setItem("ledgerly-budgets", JSON.stringify(nextBudgets));
  }

  function persistCustomCategories(next: Record<string, { icon: string; color: string }>) {
    setCustomCategories(next);
    localStorage.setItem("ledgerly-custom-categories", JSON.stringify(next));
  }

  function persistHiddenCategories(next: string[]) {
    setHiddenCategories(next);
    localStorage.setItem("ledgerly-hidden-categories", JSON.stringify(next));
  }

  function openBudgetModal(mode: "add" | "edit", name = "", amount = 0) {
    setBudgetModal({ mode, name, useNew: mode === "add", newName: "", amount: amount ? String(amount) : "" });
  }

  function saveBudgetModal(event: FormEvent) {
    event.preventDefault();
    if (!budgetModal) return;
    const targetName = budgetModal.useNew ? budgetModal.newName.trim() : budgetModal.name;
    if (!targetName) {
      setNotice("Enter a category name");
      return;
    }

    const amount = Number(budgetModal.amount.trim().replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Enter a valid budget amount");
      return;
    }

    if (!categories.includes(targetName)) {
      const usedColors = new Set(Object.values(categoryMeta).map(m => m.color));
      const color = categoryPalette.find(c => !usedColors.has(c)) ?? categoryPalette[Object.keys(customCategories).length % categoryPalette.length];
      persistCustomCategories({ ...customCategories, [targetName]: { icon: targetName.charAt(0).toUpperCase(), color } });
    }

    persistBudgets({ ...budgets, [targetName]: Math.round(amount * 100) / 100 });
    setNotice(`${targetName} budget saved`);
    setTimeout(() => setNotice(""), 2500);
    setBudgetModal(null);
  }

  function deleteBudgetCategory(name: string) {
    if (name === "Other" || name === "Income") {
      setNotice(`${name} can't be removed`);
      return;
    }

    const usageCount = transactions.filter(t => t.category === name).length;
    const warning = usageCount
      ? `Delete the "${name}" category? ${usageCount} existing transaction${usageCount === 1 ? "" : "s"} will keep this label but it won't be selectable anymore.`
      : `Delete the "${name}" category?`;
    if (!window.confirm(warning)) return;

    const nextBudgets = { ...budgets };
    delete nextBudgets[name];
    persistBudgets(nextBudgets);

    if (name in customCategories) {
      const nextCustom = { ...customCategories };
      delete nextCustom[name];
      persistCustomCategories(nextCustom);
    } else {
      persistHiddenCategories([...hiddenCategories, name]);
    }

    setNotice(`${name} category deleted`);
    setTimeout(() => setNotice(""), 2500);
    setBudgetModal(null);
  }

  async function saveTransaction(event: FormEvent) {
    event.preventDefault();
    if (!draft.merchant.trim() || draft.amount <= 0) return;
    const tx = { ...draft, amount: Number(draft.amount), category: draft.type === "income" ? "Income" : draft.category };

    try {
      if (editing) {
        const response = await fetch(`/api/transactions/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tx),
        });
        if (!response.ok) throw new Error(await readApiError(response));
        const data = await response.json() as { transaction: Transaction };
        setTransactions(rows => rows.map(row => row.id === editing ? data.transaction : row));
        setNotice("Transaction updated");
      } else {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tx),
        });
        if (!response.ok) throw new Error(await readApiError(response));
        const data = await response.json() as { transaction: Transaction };
        setTransactions(rows => [data.transaction, ...rows]);
        setNotice("Transaction added");
      }
      setModal(null);
      setEditing(null);
      setDraft(emptyDraft());
      setTimeout(() => setNotice(""), 2500);
    } catch (error) {
      setNotice(friendlyError(error, "Could not save transaction"));
    }
  }
  function startEdit(tx: Transaction) {
    setDraft({ date: tx.date, merchant: tx.merchant, category: tx.category, amount: tx.amount, type: tx.type, note: tx.note ?? "" });
    setEditing(tx.id); setModal("add");
  }

  async function remove(id: number) {
    const transaction = transactions.find(tx => tx.id === id);
    if (!window.confirm(`Delete ${transaction?.merchant ?? "this transaction"}?`)) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response));
      setTransactions(rows => rows.filter(tx => tx.id !== id));
      setNotice("Transaction deleted");
      setTimeout(() => setNotice(""), 2500);
    } catch (error) {
      setNotice(friendlyError(error, "Could not delete transaction"));
    }
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("CSV file must be 10 MB or smaller");
      const imported = parseCsv(await file.text());

      const existingCounts = new Map<string, number>();
      for (const t of transactions) {
        const sig = transactionSignature(t);
        existingCounts.set(sig, (existingCounts.get(sig) ?? 0) + 1);
      }
      const uniqueImports: Transaction[] = [];
      let duplicateCount = 0;
      for (const t of imported) {
        const sig = transactionSignature(t);
        const remaining = existingCounts.get(sig) ?? 0;
        if (remaining > 0) {
          existingCounts.set(sig, remaining - 1);
          duplicateCount++;
        } else {
          uniqueImports.push(t);
        }
      }

      if (!uniqueImports.length) {
        setNotice(`All ${duplicateCount} transaction${duplicateCount === 1 ? "" : "s"} in that file already exist — nothing imported`);
        setModal(null);
        setTimeout(() => setNotice(""), 3500);
        return;
      }

      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: uniqueImports }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const data = await response.json() as { transactions: Transaction[] };
      setTransactions(rows => [...data.transactions, ...rows]);
      setModal(null);
      setNotice(duplicateCount
        ? `${data.transactions.length} imported, ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} skipped`
        : `${data.transactions.length} transactions imported`);
      setTimeout(() => setNotice(""), 3500);
    } catch (error) {
      setNotice(friendlyError(error, "Could not read that CSV file"));
    } finally {
      event.target.value = "";
    }
  }
  async function loadDemoData() {
    try {
      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: seed }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const data = await response.json() as { transactions: Transaction[] };
      setTransactions(rows => [...data.transactions, ...rows]);
      setNotice("Demo data loaded");
      setTimeout(() => setNotice(""), 2500);
    } catch (error) {
      setNotice(friendlyError(error, "Could not load demo data"));
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
          <div><p className="eyebrow">{active === "Dashboard" ? "FINANCIAL OVERVIEW" : active.toUpperCase()}</p><h1>{active === "Dashboard" ? "Good evening, Fabio" : active}</h1><p className="subtle">Here&apos;s your financial overview for {periodLabel}</p></div>
          <div className="header-actions"><button className="secondary" onClick={() => setModal("import")}>⇧ Import CSV</button><button className="primary" onClick={() => { setDraft(emptyDraft()); setEditing(null); setModal("add"); }}>＋ Add transaction</button></div>
        </header>

        {active === "Dashboard" && <>
          <section className="kpis" aria-label="Financial summary">
            {[
              ["Balance", balance, "Available now", "↗"],
              ["Income", income, "This month", "↓"],
              ["Spent", expense, `${periodTransactions.filter(t => t.type === "expense").length} transactions`, "↑"],
              ["Savings", Math.max(balance, 0), income ? `${Math.max((balance / income) * 100, 0).toFixed(0)}% savings rate` : "No income yet", "◇"],
            ].map(([label, value, meta, icon], i) => <article className={`kpi k${i}`} key={String(label)}><div className="kpi-icon">{icon}</div><div><span>{label}</span><strong>{money.format(Number(value))}</strong><small>{meta}</small></div></article>)}
          </section>

          <section className="dashboard-grid">
            <article className="card spending-card">
              <div className="card-head"><div><h2>Spending overview</h2><p>Your cumulative monthly spending</p></div><div className="segmented"><button type="button" className={chartMode === "monthly" ? "selected" : ""} onClick={() => setChartMode("monthly")}>Monthly</button><button type="button" className={chartMode === "weekly" ? "selected" : ""} onClick={() => setChartMode("weekly")}>Weekly</button></div></div>
              <div className="legend"><span><i className="mint" />{chartMode === "monthly" ? "Current month" : "Current week"} <b>{money.format(expense)}</b></span><span><i className="lavender" />Comparison <b>{money.format(expense * .92)}</b></span></div>
              <svg className="chart" viewBox="0 0 640 240" role="img" aria-label="Cumulative spending chart">
                {[35, 78, 122, 166, 210].map(y => <line key={y} x1="12" y1={y} x2="628" y2={y} className="gridline" />)}
                <polyline points={points} className="chart-fill" />
                <polyline points={points} className="chart-line" />
                <polyline points={chartValues.map((v, i) => `${i * chartStep + 12},${210 - ((v * .92) / maxDaily) * 175}`).join(" ")} className="chart-compare" />
                {chartLabels.map((d, i) => <text key={d} x={i * chartStep + 12} y="235">{d}</text>)}
              </svg>
              <div className="category-strip">
                {byCategory.slice(0, 5).map(item => <div key={item.name}><span className="cat-icon" style={{ "--cat": categoryMeta[item.name]?.color } as React.CSSProperties}>{categoryMeta[item.name]?.icon}</span><div><small>{item.name}</small><strong>{money.format(item.value)}</strong></div></div>)}
              </div>
            </article>

            <div className="right-stack">
              <article className="card budget-card"><div className="card-head"><div><h2>Budget progress</h2><p>{periodLabel} category limits</p></div><button className="text-button" onClick={() => setActive("Budgets")}>View all</button></div>
                {Object.entries(budgets).map(([name, limit]) => { const spent = byCategory.find(x => x.name === name)?.value ?? 0; const pct = Math.min(Math.round(spent / limit * 100), 100); return <div className="budget-row" key={name}><div><span className="cat-icon" style={{ "--cat": categoryMeta[name].color } as React.CSSProperties}>{categoryMeta[name].icon}</span><span>{name}</span><small>{money.format(spent)} / {money.format(limit)}</small><b>{pct}%</b><button type="button" className="row-action" onClick={() => openBudgetModal("edit", name, limit)}>Edit</button></div><div className="progress"><i style={{ width: `${pct}%` }} /></div></div> })}
              </article>
              <article className="card insight-card"><span className="insight-icon">↗</span><div><h3>{balance >= 0 ? "You're on track" : "Review your spending"}</h3><p>{balance >= 0 ? `You kept ${money.format(balance)} after expenses this month.` : `Spending is ${money.format(Math.abs(balance))} above income.`}</p></div></article>
            </div>
          </section>
        </>}

        {(active === "Dashboard" || active === "Transactions") && <section className="card transactions-card">
          <div className="card-head"><div><h2>{active === "Dashboard" ? "Recent transactions" : "All transactions"}</h2><p>{visible.length} records{visibleSpent > 0 && <> • Spent <b>{money.format(visibleSpent)}</b></>}{visibleReceived > 0 && <> • Received <b>{money.format(visibleReceived)}</b></>}</p></div><div className="filters"><input aria-label="Search transactions" placeholder="Search merchant…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /><select aria-label="Filter by month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}><option value="All">All months</option>{monthNames.map((name, i) => <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>)}</select><select aria-label="Filter by year" value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}><option value="All">All years</option>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select><select aria-label="Filter by category" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div></div>
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th>Amount</th><th aria-label="Actions"></th></tr></thead><tbody>{pageRows.map(tx => <tr key={tx.id}><td>{new Date(`${tx.date}T12:00:00`).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" })}</td><td><span className="merchant-icon">{tx.merchant.charAt(0)}</span><strong>{tx.merchant}</strong></td><td><span className="tag" style={{ "--cat": categoryMeta[tx.category]?.color } as React.CSSProperties}>{tx.category}</span></td><td className={tx.type}>{tx.type === "expense" ? "−" : "+"}{money.format(tx.amount)}</td><td><button className="row-action" aria-label={`Edit ${tx.merchant}`} onClick={() => startEdit(tx)}>Edit</button><button className="row-action danger" aria-label={`Delete ${tx.merchant}`} onClick={() => remove(tx.id)}>Delete</button></td></tr>)}</tbody></table></div>
          {!visible.length && <div className="empty"><strong>No transactions found</strong><span>Try another search or add a new transaction.</span><button className="secondary" onClick={loadDemoData}>Load demo data</button></div>}
          {active === "Transactions" && totalPages > 1 && <div className="pagination">
            <button type="button" className="secondary" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button type="button" className="secondary" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button>
          </div>}
        </section>}

        {active === "Budgets" && <><div className="card-head budgets-head"><div><h2>Budgets</h2><p>Set a monthly limit per category, or add a new one</p></div><button type="button" className="primary" onClick={() => openBudgetModal("add")}>+ Add budget</button></div>
        <section className="standalone-grid">{budgetCategoryNames.map((name) => { const limit = budgets[name] ?? 0; const spent = byCategory.find(x => x.name === name)?.value ?? 0; const pct = limit ? Math.min(spent / limit * 100, 100) : 0; return <article className="card budget-tile" key={name}><span className="cat-icon" style={{ "--cat": categoryMeta[name].color } as React.CSSProperties}>{categoryMeta[name].icon}</span><h2>{name}</h2><strong>{money.format(spent)}</strong><p>{limit ? `of ${money.format(limit)} monthly limit` : "No monthly limit set"}</p><button type="button" className="secondary budget-edit" onClick={() => openBudgetModal("edit", name, limit)}>{limit ? "Edit budget" : "Set budget"}</button><div className="progress"><i style={{ width: `${pct}%` }} /></div></article> })}</section></>}
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

      {budgetModal && <div className="modal-backdrop" onMouseDown={() => setBudgetModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">BUDGET</span><h2 id="budget-modal-title">{budgetModal.mode === "add" ? "Add budget" : `Edit ${budgetModal.name} budget`}</h2></div><button aria-label="Close" onClick={() => setBudgetModal(null)}>×</button></div>
        <form onSubmit={saveBudgetModal}>
          {budgetModal.mode === "add" && <>
            <div className="type-toggle"><button type="button" className={!budgetModal.useNew ? "selected" : ""} onClick={() => setBudgetModal({ ...budgetModal, useNew: false })}>Existing category</button><button type="button" className={budgetModal.useNew ? "selected" : ""} onClick={() => setBudgetModal({ ...budgetModal, useNew: true })}>New category</button></div>
            {budgetModal.useNew
              ? <label>Category name<input required autoFocus value={budgetModal.newName} onChange={e => setBudgetModal({ ...budgetModal, newName: e.target.value })} placeholder="e.g. Subscriptions" /></label>
              : <label>Category<select required value={budgetModal.name} onChange={e => setBudgetModal({ ...budgetModal, name: e.target.value })}><option value="" disabled>Choose a category…</option>{categories.filter(c => c !== "Income" && !(c in budgets)).map(c => <option key={c}>{c}</option>)}</select></label>}
          </>}
          <label>Monthly limit (€)<input required autoFocus={budgetModal.mode === "edit"} type="number" min="0.01" step="0.01" value={budgetModal.amount} onChange={e => setBudgetModal({ ...budgetModal, amount: e.target.value })} placeholder="0.00" /></label>
          <div className="modal-actions">
            {budgetModal.mode === "edit" && <button type="button" className="secondary danger" onClick={() => deleteBudgetCategory(budgetModal.name)}>Delete category</button>}
            <button type="button" className="secondary" onClick={() => setBudgetModal(null)}>Cancel</button>
            <button className="primary">Save budget</button>
          </div>
        </form>
      </section></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
