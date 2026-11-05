"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Discrepancy { item?: string; form_value?: string; cv_value?: string; note?: string }
interface Candidate {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  category: string;
  years_of_experience: string;
  field: string;
  employment_status?: string;
  current_title?: string;
  current_employer?: string;
  linkedin_url?: string;
  cv_file_path: string;
  status?: string;
  ai_score?: number | null;
  ai_match_percentage?: number | null;
  ai_recommendation?: string | null;
  ai_summary?: string | null;
  ai_strengths?: string[] | null;
  ai_concerns?: string[] | null;
  ai_discrepancies?: Discrepancy[] | null;
  ai_error?: string | null;
  created_at: string;
}

const REC_STYLE: Record<string, string> = {
  "مناسب جداً": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "مناسب": "bg-sky-50 text-sky-700 border-sky-200",
  "يحتاج مراجعة": "bg-amber-50 text-amber-700 border-amber-200",
  "يحتاج مراجعة يدوية": "bg-amber-50 text-amber-700 border-amber-200",
  "غير مناسب": "bg-rose-50 text-rose-700 border-rose-200",
};

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("الكل");
  const [fieldF, setFieldF] = useState("الكل");
  const [empF, setEmpF] = useState("الكل");
  const [sortBy, setSortBy] = useState<"date" | "score" | "match">("score");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });
    if (error) console.error(error.message);
    setCandidates((data as Candidate[]) || []);
    setLoading(false);
  }
  useEffect(() => { if (session) load(); }, [session]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("❌ البريد أو كلمة المرور غير صحيحة.");
  }

  async function analyze(id: string) {
    setBusy(id);
    try {
      await fetch("/api/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ candidateId: id }),
      });
    } finally { setBusy(null); load(); }
  }

  async function openCv(path: string) {
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(path, 300);
    if (error || !data) { alert("تعذر فتح الملف"); return; }
    window.open(data.signedUrl, "_blank");
  }

  const fields = useMemo(() => ["الكل", ...Array.from(new Set(candidates.map((c) => c.field).filter(Boolean)))], [candidates]);
  const emps = useMemo(() => ["الكل", ...Array.from(new Set(candidates.map((c) => c.employment_status).filter(Boolean) as string[]))], [candidates]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const r = candidates.filter((c) =>
      (category === "الكل" || c.category === category) &&
      (fieldF === "الكل" || c.field === fieldF) &&
      (empF === "الكل" || c.employment_status === empF) &&
      (!q || c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    );
    const val = (c: Candidate) => sortBy === "match" ? c.ai_match_percentage : c.ai_score;
    if (sortBy === "date") return r;
    return [...r].sort((a, b) => (val(b) ?? -1) - (val(a) ?? -1));
  }, [candidates, category, fieldF, empF, search, sortBy]);

  const chip = (active: boolean, on: string) =>
    `py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer ${active ? on : "text-slate-600 hover:bg-slate-200/50"}`;

  if (checking) return <div className="min-h-screen bg-slate-900" />;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4" dir="rtl">
        <form onSubmit={login} className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center space-y-4 shadow-2xl">
          <div className="text-5xl">🔒</div>
          <h2 className="text-2xl font-bold text-white">لوحة تحكم الأخصائية</h2>
          <input type="email" dir="ltr" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/90 rounded-xl text-slate-900 text-center" required />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/90 rounded-xl text-slate-900 text-center" required />
          {error && <p className="text-red-300 text-xs bg-red-500/10 py-2 rounded-lg">{error}</p>}
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl cursor-pointer">دخول 🔓</button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">📊 مجتمع المواهب - لوحة تحكم الأخصائية</h1>
            <p className="text-xs text-slate-400 mt-0.5">التقييم الآلي مساند فقط — القرار النهائي للأخصائية</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-medium cursor-pointer">تسجيل الخروج 🚪</button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {["الكل", "توظيف", "إعارة"].map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={chip(category === c, "bg-slate-900 text-white")}>
                {c === "الكل" ? `الكل (${candidates.length})` : `${c} (${candidates.filter((x) => x.category === c).length})`}
              </button>
            ))}
            <input placeholder="🔍 بحث بالاسم أو البريد" value={search} onChange={(e) => setSearch(e.target.value)}
              className="mr-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-56" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <option value="score">ترتيب: الأعلى تقييماً</option>
              <option value="match">ترتيب: الأعلى مطابقة</option>
              <option value="date">ترتيب: الأحدث</option>
            </select>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">💼 المجال:</span>
            <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-xl">
              {fields.map((f) => (
                <button key={f} onClick={() => setFieldF(f)} className={chip(fieldF === f, "bg-indigo-600 text-white")}>
                  {f} ({f === "الكل" ? candidates.length : candidates.filter((c) => c.field === f).length})
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">🧾 نوع الوظيفة الحالية:</span>
            <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-xl">
              {emps.map((s) => (
                <button key={s} onClick={() => setEmpF(s)} className={chip(empF === s, "bg-indigo-600 text-white")}>
                  {s} ({s === "الكل" ? candidates.length : candidates.filter((c) => c.employment_status === s).length})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">⏳ جاري التحميل...</div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center text-slate-400">💡 لا يوجد متقدمون ضمن هذا الفلتر.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-slate-600 text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3">المرشح</th>
                    <th className="p-3">المسار</th>
                    <th className="p-3">المجال / الخبرة / نوع الوظيفة</th>
                    <th className="p-3">التواصل</th>
                    <th className="p-3 text-center">التقييم</th>
                    <th className="p-3 text-center">المطابقة</th>
                    <th className="p-3">التوصية</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((c) => (
                    <>
                      <tr key={c.id} className="hover:bg-slate-50/80 align-top">
                        <td className="p-3 font-bold text-slate-900">{c.full_name}
                          <div className="text-[11px] font-normal text-slate-400">{c.current_title || ""}{c.current_employer ? ` — ${c.current_employer}` : ""}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 text-xs rounded-full font-bold border ${c.category === "إعارة" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>{c.category}</span>
                        </td>
                        <td className="p-3 text-xs">
                          <div className="text-slate-900 font-semibold">{c.field}</div>
                          <div className="text-slate-400">{c.years_of_experience}</div>
                          <div className="text-slate-400">{c.employment_status}</div>
                        </td>
                        <td className="p-3 text-xs">
                          <div dir="ltr" className="text-right">📞 {c.phone}</div>
                          <div>✉️ {c.email}</div>
                          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">🔗 LinkedIn</a>}
                        </td>
                        <td className="p-3 text-center">
                          {c.ai_score != null ? <span className="font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700">{c.ai_score}/100</span>
                            : <span className="text-xs text-slate-400">{c.status === "failed" ? "فشل" : c.status === "manual_review" ? "—" : "قيد التحليل..."}</span>}
                        </td>
                        <td className="p-3 text-center">
                          {c.ai_match_percentage != null ? <span className="font-bold text-slate-700">{c.ai_match_percentage}%</span> : "—"}
                        </td>
                        <td className="p-3">
                          {c.ai_recommendation && <span className={`px-2.5 py-1 text-xs rounded-full font-bold border ${REC_STYLE[c.ai_recommendation] || "bg-slate-50 border-slate-200"}`}>{c.ai_recommendation}</span>}
                          {c.status === "failed" && <div className="text-[11px] text-rose-500 mt-1">{c.ai_error}</div>}
                        </td>
                        <td className="p-3 text-center space-y-1">
                          <button onClick={() => openCv(c.cv_file_path)} className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer">📄 السيرة</button>
                          <button onClick={() => setOpen(open === c.id ? null : c.id)} className="block w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer">🔎 التفاصيل</button>
                          <button disabled={busy === c.id} onClick={() => analyze(c.id)} className="block w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50">
                            {busy === c.id ? "جاري..." : c.ai_score != null ? "🔄 إعادة" : "⚡ تحليل"}
                          </button>
                        </td>
                      </tr>
                      {open === c.id && (
                        <tr key={c.id + "d"} className="bg-slate-50">
                          <td colSpan={8} className="p-4 text-xs leading-relaxed space-y-3">
                            <p><b>الملخص:</b> {c.ai_summary || "لا يوجد تحليل بعد"}</p>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div><b className="text-emerald-700">نقاط القوة</b>
                                <ul className="list-disc pr-5">{(c.ai_strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                              <div><b className="text-amber-700">ملاحظات / مخاوف</b>
                                <ul className="list-disc pr-5">{(c.ai_concerns || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                            </div>
                            <div><b className="text-rose-700">فروقات بين النموذج والسيرة الذاتية</b>
                              {(c.ai_discrepancies || []).length === 0 ? <span className="text-slate-400"> لا توجد فروقات</span> : (
                                <ul className="list-disc pr-5">{(c.ai_discrepancies || []).map((d, i) => (
                                  <li key={i}>{d.item}: في النموذج «{d.form_value}» وفي السيرة «{d.cv_value}» — {d.note}</li>))}</ul>)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
