// @ts-nocheck
"use client";
import { supabase } from "@/lib/supabaseClient";
import React, { useMemo, useState } from "react";

const currencySymbols = { EUR: "€", USD: "$", TRY: "₺" };
const currencies = ["EUR", "USD", "TRY"];
const baseCurrency = "EUR";
const initialRates = { EUR: 1, USD: 0.92, TRY: 0.028 };

const formatters = {
  EUR: new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  TRY: new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }),
};

const today = new Date().toISOString().slice(0, 10);

const initialTransactions = [
  { id: 1, date: "2026-05-08", type: "expense", category: "Market", account: "KBC", amount: 45, currency: "EUR", amountEur: 45, rateToEur: 1, note: "Lidl alışveriş" },
  { id: 2, date: "2026-05-07", type: "income", category: "Maaş", account: "KBC", amount: 2350, currency: "EUR", amountEur: 2350, rateToEur: 1, note: "OPmobility maaş" },
  { id: 3, date: "2026-05-06", type: "expense", category: "Yakıt", account: "KBC", amount: 70, currency: "EUR", amountEur: 70, rateToEur: 1, note: "Benzin" },
  { id: 4, date: "2026-05-05", type: "expense", category: "Kira", account: "KBC", amount: 950, currency: "EUR", amountEur: 950, rateToEur: 1, note: "Ev kirası" },
  { id: 5, date: "2026-05-04", type: "expense", category: "Borç ödemesi", account: "KBC", amount: 300, currency: "EUR", amountEur: 300, rateToEur: 1, note: "Kredi kartı ödeme" },
  { id: 6, date: "2026-05-03", type: "expense", category: "Diğer", account: "Türkiye hesabı", amount: 1500, currency: "TRY", amountEur: 42, rateToEur: 0.028, note: "Türkiye harcaması" },
];

const initialDebts = [
  { id: 1, name: "KBC Kredi", total: 70000, remaining: 68500, currency: "EUR", totalEur: 70000, remainingEur: 68500, monthly: 645, dueDate: "Her ay 15", note: "12 yıl kredi" },
  { id: 2, name: "Kredi Kartı", total: 1200, remaining: 800, currency: "EUR", totalEur: 1200, remainingEur: 800, monthly: 200, dueDate: "15.05.2026", note: "KBC kredi kartı" },
  { id: 3, name: "Aile Borcu", total: 3000, remaining: 2500, currency: "USD", totalEur: 2760, remainingEur: 2300, monthly: 0, dueDate: "Değişken", note: "Esnek ödeme" },
];

const initialAssets = [
  { id: 1, name: "KBC Hesap", type: "Nakit", value: 1200, currency: "EUR", valueEur: 1200 },
  { id: 2, name: "Nakit Para", type: "Nakit", value: 250, currency: "EUR", valueEur: 250 },
  { id: 3, name: "Türkiye Hesabı", type: "Nakit", value: 40000, currency: "TRY", valueEur: 1120 },
  { id: 4, name: "Altın / Fon / Hisse", type: "Yatırım", value: 2500, currency: "EUR", valueEur: 2500 },
  { id: 5, name: "Araç", type: "Varlık", value: 3000, currency: "EUR", valueEur: 3000 },
];

const expenseCategories = ["Kira", "Market", "Fatura", "Çocuk", "Araç", "Yakıt", "Ev tadilat", "Borç ödemesi", "Yatırım", "Sağlık", "Diğer"];
const incomeCategories = ["Maaş", "Ek gelir", "Satış", "Kira geliri", "Diğer"];
const accounts = ["KBC", "Nakit", "Türkiye hesabı", "Dolar hesabı", "Diğer"];
const assetTypes = ["Nakit", "Yatırım", "Varlık", "Diğer"];

const categoryRules = [
  { category: "Market", keywords: ["lidl", "aldi", "carrefour", "colruyt", "delhaize", "migros", "bim", "a101", "market"] },
  { category: "Yakıt", keywords: ["shell", "total", "q8", "esso", "bp", "benzin", "diesel", "fuel", "petrol", "opet"] },
  { category: "Kira", keywords: ["huur", "rent", "kira"] },
  { category: "Fatura", keywords: ["fluvius", "engie", "luminus", "telenet", "proximus", "orange", "water", "elektrik", "gas", "internet", "factuur"] },
  { category: "Çocuk", keywords: ["kinder", "baby", "school", "opvang", "creche", "oyuncak", "toys"] },
  { category: "Araç", keywords: ["garage", "auto", "carwash", "parking", "parkeren", "verzekering"] },
  { category: "Sağlık", keywords: ["apotheek", "pharma", "dokter", "hospital", "ziekenhuis", "eczane", "hastane"] },
  { category: "Borç ödemesi", keywords: ["krediet", "creditcard", "visa", "mastercard", "loan", "afbetaling", "borç", "odeme", "ödeme"] },
  { category: "Yatırım", keywords: ["bitvavo", "bybit", "binance", "broker", "tefas", "hisse", "fon", "crypto", "kripto"] },
  { category: "Maaş", keywords: ["salary", "salaris", "loon", "opmobility", "werkgever", "maaş"] },
  { category: "Satış", keywords: ["verkoop", "sales", "bol.com", "amazon", "etsy", "vinted", "marktplaats", "2dehands", "satis", "satış"] },
];

const sampleImportText = [
  "08.05.2026 LIDL Beringen -45,20 EUR",
  "07.05.2026 OPMOBILITY SALARIS +2350,00 EUR",
  "06.05.2026 Q8 TANKSTATION -70,00 EUR",
  "05.05.2026 KBC CREDITCARD BETALING -300,00 EUR",
  "04.05.2026 MIGROS FETHIYE -1500,00 TRY",
].join("\n");

function formatMoney(value, currency = baseCurrency) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return (formatters[currency] || formatters.EUR).format(safeValue);
}

function convertToEur(amount, currency, rates) {
  const numericAmount = Number(amount);
  const rate = Number(rates[currency]);
  if (!Number.isFinite(numericAmount) || !Number.isFinite(rate)) return 0;
  return numericAmount * rate;
}

function getEurValue(item, originalField, eurField, rates) {
  if (Number.isFinite(Number(item[eurField]))) return Number(item[eurField]);
  return convertToEur(item[originalField], item.currency || baseCurrency, rates);
}

function normalizeText(value) {
  return String(value || "").toLocaleLowerCase("tr-TR");
}

function guessCategory(description, type) {
  const text = normalizeText(description);
  const matchedRule = categoryRules.find((rule) => rule.keywords.some((keyword) => text.includes(normalizeText(keyword))));

  if (!matchedRule) return "Diğer";
  if (type === "income" && !incomeCategories.includes(matchedRule.category)) return "Diğer";
  if (type === "expense" && !expenseCategories.includes(matchedRule.category)) return "Diğer";
  return matchedRule.category;
}

function guessAccount(description, currency) {
  const text = normalizeText(description);
  if (text.includes("kbc")) return "KBC";
  if (currency === "TRY") return "Türkiye hesabı";
  if (currency === "USD") return "Dolar hesabı";
  return "KBC";
}

function detectCurrency(text) {
  const value = String(text || "").toUpperCase();
  if (value.includes("TRY") || value.includes(" TL") || value.includes("₺")) return "TRY";
  if (value.includes("USD") || value.includes("$")) return "USD";
  return "EUR";
}

function parseAmountToken(token) {
  const cleanToken = String(token || "")
    .replaceAll("EUR", "")
    .replaceAll("USD", "")
    .replaceAll("TRY", "")
    .replaceAll("TL", "")
    .replaceAll("€", "")
    .replaceAll("$", "")
    .replaceAll("₺", "")
    .replaceAll(" ", "");
  const normalized = cleanToken.includes(",") ? cleanToken.replaceAll(".", "").replace(",", ".") : cleanToken;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function looksLikeDate(token) {
  const parts = String(token || "").replaceAll("/", ".").replaceAll("-", ".").split(".").filter(Boolean);
  return parts.length === 3 && parts.every((part) => /^\d+$/.test(part));
}

function normalizeDate(value) {
  const cleaned = String(value || "").replaceAll("/", ".").replaceAll("-", ".");
  const parts = cleaned.split(".").filter(Boolean);
  if (parts.length !== 3) return today;
  if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
  return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
}

function looksLikeAmountToken(token) {
  const value = String(token || "").trim();
  if (!value) return false;
  if (value.startsWith("+") || value.startsWith("-")) return true;
  return /\d/.test(value) && (value.includes(",") || value.includes("€") || value.includes("$") || value.includes("₺"));
}

function parseImportText(text, rates) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const tokens = line.split(/\s+/).filter(Boolean);
      const dateToken = tokens.find((token) => looksLikeDate(token)) || today;
      const amountToken = [...tokens].reverse().find((token) => looksLikeAmountToken(token) && !looksLikeDate(token)) || "0";
      const currency = detectCurrency(line);
      const signedAmount = parseAmountToken(amountToken);
      const amount = Math.abs(signedAmount);
      const type = signedAmount > 0 ? "income" : "expense";
      const note = tokens
        .filter((token) => token !== dateToken && token !== amountToken && !currencies.includes(token.toUpperCase()) && token.toUpperCase() !== "TL")
        .join(" ") || "İçe aktarılan kayıt";

      return {
        importId: `${Date.now()}-${index}`,
        selected: true,
        date: normalizeDate(dateToken),
        type,
        category: guessCategory(note, type),
        account: guessAccount(note, currency),
        amount,
        currency,
        amountEur: convertToEur(amount, currency, rates),
        rateToEur: rates[currency],
        note,
        raw: line,
      };
    })
    .filter((item) => item.amount > 0);
}

function calculateTotals(transactions, debts, assets, rates) {
  const income = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + getEurValue(transaction, "amount", "amountEur", rates), 0);
  const expense = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + getEurValue(transaction, "amount", "amountEur", rates), 0);
  const debtTotal = debts.reduce((sum, debt) => sum + getEurValue(debt, "remaining", "remainingEur", rates), 0);
  const assetTotal = assets.reduce((sum, asset) => sum + getEurValue(asset, "value", "valueEur", rates), 0);
  const cashTotal = assets.filter((asset) => asset.type === "Nakit").reduce((sum, asset) => sum + getEurValue(asset, "value", "valueEur", rates), 0);
  return { income, expense, debtTotal, assetTotal, cashTotal, remaining: income - expense, netWorth: assetTotal - debtTotal };
}

function Icon({ name, className = "h-5 w-5" }) {
  const commonProps = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const icons = {
    plus: <svg {...commonProps}><path d="M12 5v14" /><path d="M5 12h14" /></svg>,
    wallet: <svg {...commonProps}><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M16 12h5" /><path d="M17 12.01v.01" /></svg>,
    creditCard: <svg {...commonProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h2" /></svg>,
    trendingUp: <svg {...commonProps}><path d="M3 17 9 11l4 4 8-8" /><path d="M14 7h7v7" /></svg>,
    home: <svg {...commonProps}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>,
    list: <svg {...commonProps}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>,
    piggy: <svg {...commonProps}><path d="M7 10h10a4 4 0 0 1 4 4v1h-2l-1 3h-3l-1-2H9l-1 2H5l-1-3H3v-2a3 3 0 0 1 3-3" /><path d="M7 10V7h4" /><path d="M16 13h.01" /></svg>,
    landmark: <svg {...commonProps}><path d="M3 21h18" /><path d="M4 10h16" /><path d="M6 10v8" /><path d="M10 10v8" /><path d="M14 10v8" /><path d="M18 10v8" /><path d="M12 3 4 8h16l-8-5Z" /></svg>,
    trash: <svg {...commonProps}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></svg>,
  };
  return icons[name] || icons.wallet;
}

function StatCard({ title, value, icon }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></div><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Icon name={icon} /></div></div></div>;
}

function SectionTitle({ children, subtitle }) {
  return <div className="mb-4"><h2 className="text-xl font-semibold text-slate-950">{children}</h2>{subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}</div>;
}

function TextInput({ label, value, onChange, placeholder, type = "text", min, step }) {
  return <label className="grid gap-1 text-sm">{label}<input className="rounded-2xl border border-slate-200 p-3" type={type} min={min} step={step} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectInput({ label, value, onChange, options, labels }) {
  return <label className="grid gap-1 text-sm">{label}<select className="rounded-2xl border border-slate-200 p-3" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{labels?.[option] || option}</option>)}</select></label>;
}

function CurrencyBadge({ amount, currency, eurAmount }) {
  return <div><p className="font-semibold">{formatMoney(amount, currency)}</p>{currency !== baseCurrency ? <p className="text-xs text-slate-500">≈ {formatMoney(eurAmount, baseCurrency)}</p> : null}</div>;
}

export default function BasitFinansPaneli() {
  const [activePage, setActivePage] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [rates, setRates] = useState(initialRates);
  const [rateStatus, setRateStatus] = useState("Manuel kurlar kullanılıyor");
  const [form, setForm] = useState({ date: today, type: "expense", category: expenseCategories[1], account: accounts[0], amount: "", currency: "EUR", note: "" });
  const [debtForm, setDebtForm] = useState({ name: "", total: "", remaining: "", monthly: "", currency: "EUR", dueDate: "", note: "" });
  const [assetForm, setAssetForm] = useState({ name: "", type: assetTypes[0], value: "", currency: "EUR" });
  const [importText, setImportText] = useState(sampleImportText);
  const [importRows, setImportRows] = useState([]);
  const [importStatus, setImportStatus] = useState("Dosya yükleyebilir veya banka hareketlerini metin olarak yapıştırabilirsin.");
  
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  
React.useEffect(() => {
  checkUser();

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const currentUser = session?.user || null;
    setUser(currentUser);

    if (currentUser) {
      loadTransactions(currentUser.id);
      loadDebts(currentUser.id);
      loadAssets(currentUser.id);
    } else {
      setTransactions([]);
      setDebts([]);
      setAssets([]);
    }
  });

    return () => {
    data?.subscription?.unsubscribe();
  };
}, []);

  const totals = useMemo(() => calculateTotals(transactions, debts, assets, rates), [transactions, debts, assets, rates]);
  const categories = form.type === "income" ? incomeCategories : expenseCategories;

if (!user) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Basit Finans
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Giriş linki email adresine gönderilir.
        </p>

        <form
          onSubmit={signInWithEmail}
          className="mt-6 grid gap-3"
        >
          <input
            type="email"
            required
            placeholder="Email adresin"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-slate-200 p-3"
          />

          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white hover:bg-slate-800"
          >
            Giriş linki gönder
          </button>
        </form>

        {authStatus ? (
          <p className="mt-4 text-sm text-slate-500">
            {authStatus}
          </p>
        ) : null}
      </div>
    </div>
  );
}

  async function checkUser() {
  const { data } = await supabase.auth.getUser();
  setUser(data.user);

  if (data.user) {
    loadTransactions(data.user.id);
    loadDebts(data.user.id);
    loadAssets(data.user.id);
  }
  }

  async function signInWithEmail(event) {
  event.preventDefault();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    setAuthStatus("Giriş linki gönderilemedi.");
    console.error(error);
    return;
  }

  setAuthStatus("Giriş linki email adresine gönderildi.");
}

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setTransactions([]);
    setDebts([]);
    setAssets([]);
  }

  async function loadTransactions(userId) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });

    if (error) {
      console.error("Supabase load error:", error);
      return;
    }

    const formatted = (data || []).map((item) => ({
      id: item.id,
      date: item.date,
      type: item.type,
      category: item.category,
      account: item.account,
      amount: Number(item.amount),
      currency: item.currency,
      amountEur: Number(item.amount_eur),
      rateToEur: Number(item.rate_to_eur),
      note: item.note,
    }));

    setTransactions(formatted);
  }

  async function loadDebts(userId) {
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (error) {
    console.error("Supabase debts load error:", error);
    return;
  }

  const formatted = (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    total: Number(item.total),
    remaining: Number(item.remaining),
    currency: item.currency,
    totalEur: Number(item.total_eur),
    remainingEur: Number(item.remaining_eur),
    monthly: Number(item.monthly),
    dueDate: item.due_date,
    note: item.note,
  }));

  setDebts(formatted);
}

  async function loadAssets(userId) {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });

    if (error) {
      console.error("Supabase assets load error:", error);
      return;
    }

    const formatted = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      value: Number(item.value),
      currency: item.currency,
      valueEur: Number(item.value_eur),
    }));

    setAssets(formatted);
  }


  async function updateRates() {
    setRateStatus("Kurlar güncelleniyor...");
    try {
      const response = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,TRY");
      if (!response.ok) throw new Error("Kur servisi cevap vermedi");
      const data = await response.json();
      const eurToUsd = Number(data.rates?.USD);
      const eurToTry = Number(data.rates?.TRY);
      if (!Number.isFinite(eurToUsd) || !Number.isFinite(eurToTry)) throw new Error("Kur verisi eksik");
      setRates({ EUR: 1, USD: 1 / eurToUsd, TRY: 1 / eurToTry });
      setRateStatus(`Kurlar güncellendi: ${data.date}`);
    } catch {
      setRateStatus("Kur çekilemedi. Manuel/son kayıtlı kurlar kullanılıyor.");
    }
  }

  function handleTypeChange(type) {
    setForm((currentForm) => ({ ...currentForm, type, category: type === "income" ? incomeCategories[0] : expenseCategories[1] }));
  }

  async function addTransaction(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.date || !Number.isFinite(amount) || amount <= 0) return;
    const newTransaction = { id: Date.now(), date: form.date, type: form.type, category: form.category, account: form.account, amount, currency: form.currency, amountEur: convertToEur(amount, form.currency, rates), rateToEur: rates[form.currency], note: form.note.trim() || "Not yok" };
    
  await supabase.from("transactions").insert({
    user_id: user.id,
    date: newTransaction.date,
    type: newTransaction.type,
    category: newTransaction.category,
    account: newTransaction.account,
    amount: newTransaction.amount,
    currency: newTransaction.currency,
    amount_eur: newTransaction.amountEur,
    rate_to_eur: newTransaction.rateToEur,
    note: newTransaction.note,
  });

    setTransactions((currentTransactions) => [newTransaction, ...currentTransactions]);
    setForm((currentForm) => ({ ...currentForm, amount: "", note: "" }));
  }

  async function addDebt(event) {
    event.preventDefault();
    const total = Number(debtForm.total);
    const remaining = Number(debtForm.remaining || debtForm.total);
    const monthly = Number(debtForm.monthly || 0);
    if (!debtForm.name.trim() || !Number.isFinite(total) || total <= 0 || !Number.isFinite(remaining) || remaining < 0 || !Number.isFinite(monthly) || monthly < 0) return;
    const newDebt = { id: Date.now(), name: debtForm.name.trim(), total, remaining, currency: debtForm.currency, totalEur: convertToEur(total, debtForm.currency, rates), remainingEur: convertToEur(remaining, debtForm.currency, rates), monthly, dueDate: debtForm.dueDate.trim() || "Belirtilmedi", note: debtForm.note.trim() || "Not yok" };
    
    const { data, error } = await supabase
      .from("debts")
      .insert({
        user_id: user.id,
        name: newDebt.name,
        total: newDebt.total,
        remaining: newDebt.remaining,
        currency: newDebt.currency,
        total_eur: newDebt.totalEur,
        remaining_eur: newDebt.remainingEur,
        monthly: newDebt.monthly,
        due_date: newDebt.dueDate,
        note: newDebt.note,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase debt insert error:", error);
      return;
    }

    newDebt.id = data.id;

    setDebts((currentDebts) => [newDebt, ...currentDebts]);
    setDebtForm({ name: "", total: "", remaining: "", monthly: "", currency: "EUR", dueDate: "", note: "" });
  }

  async function addAsset(event) {
    event.preventDefault();
    const value = Number(assetForm.value);
    if (!assetForm.name.trim() || !Number.isFinite(value) || value < 0) return;
    const newAsset = { id: Date.now(), name: assetForm.name.trim(), type: assetForm.type, value, currency: assetForm.currency, valueEur: convertToEur(value, assetForm.currency, rates) };
    
    const { data, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        name: newAsset.name,
        type: newAsset.type,
        value: newAsset.value,
        currency: newAsset.currency,
        value_eur: newAsset.valueEur,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase asset insert error:", error);
      return;
    }

    newAsset.id = data.id;

    setAssets((currentAssets) => [newAsset, ...currentAssets]);
    setAssetForm({ name: "", type: assetTypes[0], value: "", currency: "EUR" });
  }

  async function deleteTransaction(id) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase transaction delete error:", error);
      return;
    }

    setTransactions((currentTransactions) =>
      currentTransactions.filter((transaction) => transaction.id !== id)
    );
  }

  async function deleteDebt(id) {
    const { error } = await supabase
      .from("debts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase debt delete error:", error);
      return;
    }

    setDebts((currentDebts) =>
      currentDebts.filter((debt) => debt.id !== id)
    );
  }

  async function deleteAsset(id) {
    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase asset delete error:", error);
      return;
    }

    setAssets((currentAssets) =>
      currentAssets.filter((asset) => asset.id !== id)
    );
  }

  async function payDebt(debtId, paymentAmount) {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const debt = debts.find((item) => item.id === debtId);
    if (!debt) return;
    const currency = debt.currency || baseCurrency;
    const amountEur = convertToEur(amount, currency, rates);

    const updatedRemaining = Math.max(0, Number(debt.remaining) - amount);
    const updatedRemainingEur = convertToEur(updatedRemaining, currency, rates);

    await supabase
      .from("debts")
      .update({
        remaining: updatedRemaining,
        remaining_eur: updatedRemainingEur,
      })
      .eq("id", debtId);

    setDebts((currentDebts) => currentDebts.map((currentDebt) => {
      if (currentDebt.id !== debtId) return currentDebt;
      const updatedRemaining = Math.max(0, Number(currentDebt.remaining) - amount);
      return { ...currentDebt, remaining: updatedRemaining, remainingEur: convertToEur(updatedRemaining, currency, rates) };
    }));

    const paymentTransaction = { id: Date.now(), date: today, type: "expense", category: "Borç ödemesi", account: "KBC", amount, currency, amountEur, rateToEur: rates[currency], note: `${debt.name} ödeme` };
    setTransactions((currentTransactions) => [paymentTransaction, ...currentTransactions]);
  }

  function updateManualRate(currency, value) {
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate <= 0) return;
    setRates((currentRates) => ({ ...currentRates, [currency]: rate }));
    setRateStatus("Manuel kur güncellendi");
  }

  function analyzeImportText() {
    const parsedRows = parseImportText(importText, rates);
    setImportRows(parsedRows);
    setImportStatus(`${parsedRows.length} hareket bulundu. Kategorileri kontrol edip içe aktarabilirsin.`);
  }

  function toggleImportRow(importId) {
    setImportRows((currentRows) => currentRows.map((row) => row.importId === importId ? { ...row, selected: !row.selected } : row));
  }

  function updateImportRow(importId, field, value) {
    setImportRows((currentRows) => currentRows.map((row) => {
      if (row.importId !== importId) return row;
      const updatedRow = { ...row, [field]: value };
      if (field === "amount" || field === "currency") {
        updatedRow.amountEur = convertToEur(updatedRow.amount, updatedRow.currency, rates);
        updatedRow.rateToEur = rates[updatedRow.currency];
      }
      return updatedRow;
    }));
  }

  function importSelectedRows() {
    const selectedRows = importRows.filter((row) => row.selected);
    if (selectedRows.length === 0) return;
    const newTransactions = selectedRows.map((row, index) => ({ id: Date.now() + index, date: row.date, type: row.type, category: row.category, account: row.account, amount: Number(row.amount), currency: row.currency, amountEur: convertToEur(row.amount, row.currency, rates), rateToEur: rates[row.currency], note: row.note }));
    setTransactions((currentTransactions) => [...newTransactions, ...currentTransactions]);
    setImportRows([]);
    setImportStatus(`${selectedRows.length} hareket muhasebeye aktarıldı.`);
  }

  async function handleImportFile(file) {
    if (!file) return;
    setImportStatus("Dosya AI ile okunuyor...");

    try {
      if (file.type === "text/plain" || file.name.endsWith(".csv")) {
        const text = await file.text();
        setImportText(text);
        setImportStatus("Metin dosyası okundu. Şimdi analiz edebilirsin.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import-file", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Dosya okunamadı");

      const parsed = JSON.parse(data.result);
      const rows = Array.isArray(parsed) ? parsed : parsed.transactions || parsed.items || [];

      const mappedRows = rows.map((row, index) => {
        const detectedText = `${row.description || ""} ${row.note || ""} ${row.raw || ""}`;
        const currency = currencies.includes(row.currency)
          ? row.currency
          : detectCurrency(detectedText);
        const amount = Math.abs(Number(row.amount || 0));
        const type = row.type === "income" ? "income" : "expense";
        return {
          importId: `${Date.now()}-${index}`,
          selected: true,
          date: row.date || today,
          type,
          category: row.category || "Diğer",
          account: row.account || guessAccount(detectedText, currency),          amount,
          currency,
          amountEur: convertToEur(amount, currency, rates),
          rateToEur: rates[currency],
          note: row.note || row.description || "AI ile içe aktarılan kayıt",
          raw: row.raw || row.description || row.note || "AI sonucu",
        };
      }).filter((row) => row.amount > 0);

      setImportRows(mappedRows);
      setImportStatus(`${mappedRows.length} hareket AI ile bulundu. Kontrol edip içe aktarabilirsin.`);
    } catch (error) {
      console.error(error);
      setImportStatus("AI dosya okuma başarısız oldu. Terminal hatasını kontrol et.");
    }
  }

  const menuItems = [
    { id: "dashboard", label: "Ana Sayfa", icon: "home" },
    { id: "transactions", label: "Gelir & Gider", icon: "list" },
    { id: "debts", label: "Borçlar", icon: "creditCard" },
    { id: "assets", label: "Varlıklar", icon: "piggy" },
    { id: "import", label: "Akıllı İçe Aktar", icon: "plus" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:flex-row md:p-6">
        <aside className="rounded-3xl bg-slate-950 p-4 text-white md:min-h-[calc(100vh-48px)] md:w-72">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3"><Icon name="wallet" className="h-6 w-6" /></div>
            <div>
              <h1 className="text-lg font-semibold">Basit Finans</h1>
              <p className="text-sm text-slate-300">Ana para birimi: EUR</p>
              <p className="mt-1 truncate text-xs text-slate-400">{user?.email}</p>
              <button
                type="button"
                onClick={signOut}
                className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20"
              >
                Çıkış yap
              </button>
            </div>
          </div>
          <nav className="grid gap-2">
            {menuItems.map((item) => {
              const isActive = activePage === item.id;
              return <button key={item.id} type="button" onClick={() => setActivePage(item.id)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon name={item.icon} className="h-4 w-4" />{item.label}</button>;
            })}
          </nav>
          <div className="mt-8 rounded-3xl bg-white/10 p-4"><p className="text-sm text-slate-300">Bu ay kalan</p><p className="mt-1 text-3xl font-semibold">{formatMoney(totals.remaining)}</p><p className="mt-2 text-xs text-slate-400">Tüm para birimleri EUR’a çevrilir</p></div>
        </aside>

        <main className="flex-1">
          {activePage === "dashboard" ? <DashboardPage totals={totals} transactions={transactions} rates={rates} rateStatus={rateStatus} updateRates={updateRates} updateManualRate={updateManualRate} deleteTransaction={deleteTransaction} /> : null}
          {activePage === "transactions" ? <TransactionsPage form={form} setForm={setForm} categories={categories} handleTypeChange={handleTypeChange} addTransaction={addTransaction} transactions={transactions} deleteTransaction={deleteTransaction} rates={rates} /> : null}
          {activePage === "debts" ? <DebtsPage debtForm={debtForm} setDebtForm={setDebtForm} addDebt={addDebt} debts={debts} deleteDebt={deleteDebt} payDebt={payDebt} rates={rates} /> : null}
          {activePage === "assets" ? <AssetsPage assetForm={assetForm} setAssetForm={setAssetForm} addAsset={addAsset} assets={assets} deleteAsset={deleteAsset} rates={rates} totals={totals} /> : null}
          {activePage === "import" ? <ImportPage importText={importText} setImportText={setImportText} importStatus={importStatus} importRows={importRows} analyzeImportText={analyzeImportText} handleImportFile={handleImportFile} toggleImportRow={toggleImportRow} updateImportRow={updateImportRow} importSelectedRows={importSelectedRows} rates={rates} /> : null}
        </main>
      </div>
    </div>
  );
}

function DashboardPage({ totals, transactions, rates, rateStatus, updateRates, updateManualRate, deleteTransaction }) {
  return <div><SectionTitle subtitle="TL, USD ve EUR kayıtların ana para birimi EUR olarak özetlenir.">Ana Sayfa</SectionTitle><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard title="Toplam Nakit" value={formatMoney(totals.cashTotal)} icon="wallet" /><StatCard title="Toplam Borç" value={formatMoney(totals.debtTotal)} icon="creditCard" /><StatCard title="Net Durum" value={formatMoney(totals.netWorth)} icon="landmark" /><StatCard title="Bu Ay Gelir" value={formatMoney(totals.income)} icon="trendingUp" /><StatCard title="Bu Ay Gider" value={formatMoney(totals.expense)} icon="list" /><StatCard title="Bu Ay Kalan" value={formatMoney(totals.remaining)} icon="piggy" /></div><div className="mt-6 grid gap-4 lg:grid-cols-5"><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3"><SectionTitle subtitle="En son eklediğin kayıtlar.">Son Hareketler</SectionTitle><TransactionList transactions={transactions.slice(0, 6)} onDelete={deleteTransaction} rates={rates} /></div><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2"><SectionTitle subtitle="Kur çekilemezse manuel kurlar kullanılır.">Kur Ayarları</SectionTitle><div className="grid gap-3 text-sm"><div className="rounded-2xl bg-slate-50 p-3 text-slate-600">{rateStatus}</div><button type="button" onClick={updateRates} className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white hover:bg-slate-800">Kurları internetten güncelle</button><TextInput label="1 USD kaç EUR?" type="number" min="0" step="0.0001" value={rates.USD} onChange={(value) => updateManualRate("USD", value)} /><TextInput label="1 TL kaç EUR?" type="number" min="0" step="0.0001" value={rates.TRY} onChange={(value) => updateManualRate("TRY", value)} /><div className="rounded-2xl bg-slate-950 p-3 text-white"><span>Net durum: </span><strong>{formatMoney(totals.netWorth)}</strong></div></div></div></div></div>;
}

function TransactionsPage({ form, setForm, categories, handleTypeChange, addTransaction, transactions, deleteTransaction, rates }) {
  return <div className="grid gap-4 lg:grid-cols-5"><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2"><SectionTitle subtitle="Tutarı hangi para biriminde harcadıysan öyle gir.">Gelir & Gider Ekle</SectionTitle><form onSubmit={addTransaction} className="grid gap-3"><TextInput label="Tarih" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} /><SelectInput label="Tür" value={form.type} onChange={handleTypeChange} options={["income", "expense"]} labels={{ income: "Gelir", expense: "Gider" }} /><SelectInput label="Kategori" value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={categories} /><SelectInput label="Hesap" value={form.account} onChange={(value) => setForm({ ...form, account: value })} options={accounts} /><TextInput label="Tutar" type="number" min="0" step="0.01" placeholder="Örn: 1500" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} /><SelectInput label="Para birimi" value={form.currency} onChange={(value) => setForm({ ...form, currency: value })} options={currencies} />{form.amount ? <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">EUR karşılığı: <strong>{formatMoney(convertToEur(form.amount, form.currency, rates))}</strong></div> : null}<TextInput label="Not" placeholder="Örn: Türkiye harcaması" value={form.note} onChange={(value) => setForm({ ...form, note: value })} /><button type="submit" className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white hover:bg-slate-800"><Icon name="plus" className="h-4 w-4" />Kaydet</button></form></div><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3"><SectionTitle subtitle="Eklediğin tüm gelir ve giderler.">Hareket Listesi</SectionTitle><TransactionList transactions={transactions} onDelete={deleteTransaction} rates={rates} /></div></div>;
}

function DebtsPage({ debtForm, setDebtForm, addDebt, debts, deleteDebt, payDebt, rates }) {
  return <div className="grid gap-4 lg:grid-cols-5"><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2"><SectionTitle subtitle="Borç hangi para birimindeyse o şekilde gir.">Borç Ekle</SectionTitle><form onSubmit={addDebt} className="grid gap-3"><TextInput label="Borç adı" placeholder="Örn: KBC kredi" value={debtForm.name} onChange={(value) => setDebtForm({ ...debtForm, name: value })} /><TextInput label="Toplam borç" type="number" min="0" step="0.01" placeholder="Örn: 70000" value={debtForm.total} onChange={(value) => setDebtForm({ ...debtForm, total: value })} /><TextInput label="Kalan borç" type="number" min="0" step="0.01" placeholder="Boşsa toplam borç alınır" value={debtForm.remaining} onChange={(value) => setDebtForm({ ...debtForm, remaining: value })} /><SelectInput label="Para birimi" value={debtForm.currency} onChange={(value) => setDebtForm({ ...debtForm, currency: value })} options={currencies} /><TextInput label="Aylık ödeme" type="number" min="0" step="0.01" placeholder="Örn: 645" value={debtForm.monthly} onChange={(value) => setDebtForm({ ...debtForm, monthly: value })} /><TextInput label="Son ödeme" placeholder="Örn: Her ay 15" value={debtForm.dueDate} onChange={(value) => setDebtForm({ ...debtForm, dueDate: value })} /><TextInput label="Not" placeholder="Örn: 12 yıl kredi" value={debtForm.note} onChange={(value) => setDebtForm({ ...debtForm, note: value })} /><button type="submit" className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white hover:bg-slate-800"><Icon name="plus" className="h-4 w-4" />Borç ekle</button></form></div><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3"><SectionTitle subtitle="Kalan borçlar EUR karşılığıyla beraber görünür.">Borçlar</SectionTitle><DebtList debts={debts} onDelete={deleteDebt} onPayDebt={payDebt} rates={rates} /></div></div>;
}

function AssetsPage({ assetForm, setAssetForm, addAsset, assets, deleteAsset, rates, totals }) {
  return <div className="grid gap-4 lg:grid-cols-5"><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2"><SectionTitle subtitle="Varlık hangi para birimindeyse o şekilde gir.">Varlık Ekle</SectionTitle><form onSubmit={addAsset} className="grid gap-3"><TextInput label="Varlık adı" placeholder="Örn: Türkiye hesabı" value={assetForm.name} onChange={(value) => setAssetForm({ ...assetForm, name: value })} /><SelectInput label="Tür" value={assetForm.type} onChange={(value) => setAssetForm({ ...assetForm, type: value })} options={assetTypes} /><TextInput label="Değer" type="number" min="0" step="0.01" placeholder="Örn: 40000" value={assetForm.value} onChange={(value) => setAssetForm({ ...assetForm, value: value })} /><SelectInput label="Para birimi" value={assetForm.currency} onChange={(value) => setAssetForm({ ...assetForm, currency: value })} options={currencies} />{assetForm.value ? <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">EUR karşılığı: <strong>{formatMoney(convertToEur(assetForm.value, assetForm.currency, rates))}</strong></div> : null}<button type="submit" className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white hover:bg-slate-800"><Icon name="plus" className="h-4 w-4" />Varlık ekle</button></form></div><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3"><SectionTitle subtitle="Tüm varlıklar EUR toplamına çevrilir.">Varlıklar</SectionTitle><AssetList assets={assets} onDelete={deleteAsset} rates={rates} /><div className="mt-4 rounded-3xl bg-slate-950 p-5 text-white"><p className="text-sm text-slate-300">Toplam Varlık</p><p className="mt-1 text-3xl font-semibold">{formatMoney(totals.assetTotal)}</p></div></div></div>;
}

function ImportPage({ importText, setImportText, importStatus, importRows, analyzeImportText, handleImportFile, toggleImportRow, updateImportRow, importSelectedRows, rates }) {
  return <div className="grid gap-4 lg:grid-cols-5"><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2"><SectionTitle subtitle="Ekran görüntüsü, PDF, CSV veya metin için hazırlık alanı.">Akıllı İçe Aktar</SectionTitle><div className="grid gap-3"><label className="grid gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600"><span className="font-medium text-slate-900">Dosya seç</span><span>TXT/CSV direkt okunur. Görsel/PDF AI ile okunur.</span><input type="file" accept=".txt,.csv,.pdf,image/*" className="hidden" onChange={(event) => handleImportFile(event.target.files?.[0])} /></label><textarea className="min-h-56 rounded-2xl border border-slate-200 p-3 text-sm" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Banka hareketlerini buraya yapıştır..." /><div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{importStatus}</div><button type="button" onClick={analyzeImportText} className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white hover:bg-slate-800">Metni analiz et</button></div></div><div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3"><SectionTitle subtitle="İçe aktarmadan önce kategori, hesap ve para birimini kontrol et.">Önizleme</SectionTitle><ImportPreview rows={importRows} onToggle={toggleImportRow} onUpdate={updateImportRow} onImport={importSelectedRows} rates={rates} /></div></div>;
}

function TransactionList({ transactions, onDelete, rates }) {
  if (transactions.length === 0) return <EmptyState text="Henüz kayıt eklenmedi." />;
  return <div className="space-y-2">{transactions.map((transaction) => { const isIncome = transaction.type === "income"; const eurAmount = getEurValue(transaction, "amount", "amountEur", rates); return <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{transaction.category}</p><span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{transaction.account}</span></div><p className="mt-1 truncate text-sm text-slate-500">{transaction.date} • {transaction.note}</p></div><div className="flex shrink-0 items-center gap-2 text-right"><div className={isIncome ? "text-emerald-600" : "text-rose-600"}><p className="whitespace-nowrap text-lg font-semibold">{isIncome ? "+" : "-"}{formatMoney(transaction.amount, transaction.currency || baseCurrency)}</p>{(transaction.currency || baseCurrency) !== baseCurrency ? <p className="text-xs">≈ {formatMoney(eurAmount)}</p> : null}</div><DeleteButton onClick={() => onDelete(transaction.id)} /></div></div>; })}</div>;
}

function DebtList({ debts, onDelete, onPayDebt, rates }) {
  if (debts.length === 0) return <EmptyState text="Henüz borç eklenmedi." />;
  return <div className="space-y-2">{debts.map((debt) => { const currency = debt.currency || baseCurrency; const remainingEur = getEurValue(debt, "remaining", "remainingEur", rates); const totalEur = getEurValue(debt, "total", "totalEur", rates); return <div key={debt.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><h3 className="font-semibold">{debt.name}</h3><p className="mt-1 text-sm text-slate-500">{debt.note}</p></div><div className="flex flex-wrap items-center gap-2"><DebtPaymentForm debt={debt} onPayDebt={onPayDebt} /><DeleteButton onClick={() => onDelete(debt.id)} /></div></div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4"><InfoBox label="Toplam" value={<CurrencyBadge amount={debt.total} currency={currency} eurAmount={totalEur} />} /><InfoBox label="Kalan" value={<CurrencyBadge amount={debt.remaining} currency={currency} eurAmount={remainingEur} />} /><InfoBox label="Aylık ödeme" value={debt.monthly > 0 ? formatMoney(debt.monthly, currency) : "Değişken"} /><InfoBox label="Son ödeme" value={debt.dueDate} /></div></div>; })}</div>;
}

function AssetList({ assets, onDelete, rates }) {
  if (assets.length === 0) return <EmptyState text="Henüz varlık eklenmedi." />;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => { const currency = asset.currency || baseCurrency; const eurAmount = getEurValue(asset, "value", "valueEur", rates); return <div key={asset.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{asset.type}</p><h3 className="mt-1 font-semibold">{asset.name}</h3><div className="mt-3 text-2xl"><CurrencyBadge amount={asset.value} currency={currency} eurAmount={eurAmount} /></div></div><DeleteButton onClick={() => onDelete(asset.id)} /></div></div>; })}</div>;
}

function ImportPreview({ rows, onToggle, onUpdate, onImport, rates }) {
  if (rows.length === 0) return <EmptyState text="Henüz analiz edilmiş hareket yok." />;
  const selectedCount = rows.filter((row) => row.selected).length;
  return <div className="space-y-3"><div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{selectedCount} hareket seçili</span><button type="button" onClick={onImport} className="rounded-2xl bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800">Seçilenleri içe aktar</button></div><div className="space-y-2">{rows.map((row) => { const rowCategories = row.type === "income" ? incomeCategories : expenseCategories; const eurAmount = convertToEur(row.amount, row.currency, rates); return <div key={row.importId} className="rounded-2xl bg-slate-50 p-4"><div className="mb-3 flex items-start justify-between gap-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={row.selected} onChange={() => onToggle(row.importId)} />Aktar</label><div className={row.type === "income" ? "text-right text-emerald-600" : "text-right text-rose-600"}><p className="font-semibold">{row.type === "income" ? "+" : "-"}{formatMoney(row.amount, row.currency)}</p>{row.currency !== baseCurrency ? <p className="text-xs">≈ {formatMoney(eurAmount)}</p> : null}</div></div><div className="grid gap-2 md:grid-cols-2"><TextInput label="Tarih" type="date" value={row.date} onChange={(value) => onUpdate(row.importId, "date", value)} /><SelectInput label="Tür" value={row.type} onChange={(value) => onUpdate(row.importId, "type", value)} options={["income", "expense"]} labels={{ income: "Gelir", expense: "Gider" }} /><SelectInput label="Kategori" value={row.category} onChange={(value) => onUpdate(row.importId, "category", value)} options={rowCategories} /><SelectInput label="Hesap" value={row.account} onChange={(value) => onUpdate(row.importId, "account", value)} options={accounts} /><TextInput label="Tutar" type="number" min="0" step="0.01" value={row.amount} onChange={(value) => onUpdate(row.importId, "amount", value)} /><SelectInput label="Para birimi" value={row.currency} onChange={(value) => onUpdate(row.importId, "currency", value)} options={currencies} /></div><div className="mt-2"><TextInput label="Not" value={row.note} onChange={(value) => onUpdate(row.importId, "note", value)} /></div><p className="mt-2 text-xs text-slate-400">Ham satır: {row.raw}</p></div>; })}</div></div>;
}

function DeleteButton({ onClick }) {
  return <button type="button" onClick={onClick} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-900" title="Sil"><Icon name="trash" className="h-4 w-4" /></button>;
}

function InfoBox({ label, value }) {
  return <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">{label}</p><div className="mt-1 font-semibold">{value}</div></div>;
}

function DebtPaymentForm({ debt, onPayDebt }) {
  const [payment, setPayment] = useState("");
  const currency = debt.currency || baseCurrency;
  function handleSubmit(event) {
    event.preventDefault();
    const amount = Number(payment);
    if (!Number.isFinite(amount) || amount <= 0) return;
    onPayDebt(debt.id, amount);
    setPayment("");
  }
  return <form onSubmit={handleSubmit} className="flex items-center gap-2"><input type="number" min="0" step="0.01" placeholder={`Ödeme ${currencySymbols[currency] || ""}`} value={payment} onChange={(event) => setPayment(event.target.value)} className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><button type="submit" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">Öde</button></form>;
}

function EmptyState({ text }) {
  return <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{text}</div>;
}
