'use client';

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CONSENT_TITLE, CONSENT_INTRO, CONSENT_CLAUSES, CONSENT_CHECKBOX } from "@/lib/consent";
import { EXPERIENCE_OPTIONS, FIELD_OPTIONS, EMPLOYMENT_STATUS_OPTIONS } from "@/lib/formOptions";

type Category = "توظيف" | "إعارة";

const STEPS = [
  { id: 1, label: "البيانات الأساسية" },
  { id: 2, label: "السيرة الذاتية" },
  { id: 3, label: "المراجعة" },
];

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function ApplyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialType = searchParams.get("type");

  const [category, setCategory] = useState<Category | "">(
    initialType === "توظيف" || initialType === "إعارة" ? initialType : ""
  );
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", linkedin_url: "",
    current_title: "", current_employer: "",
    years_of_experience: "", field: "", employment_status: "",
  });

  const [hasAccepted, setHasAccepted] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1() {
    if (!form.full_name || !form.phone || !form.email ||
        !form.current_title || !form.current_employer || !form.years_of_experience ||
        !form.employment_status || !form.field) {
      setError("من فضلك أكمل كل الحقول الإلزامية (المميزة بـ *)");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("البريد الإلكتروني غير صالح");
      return false;
    }
    if (form.linkedin_url && !/linkedin\.com/i.test(form.linkedin_url)) {
      setError("رابط LinkedIn غير صالح (يجب أن يحتوي على linkedin.com)");
      return false;
    }
    if (!/^05\d{8}$/.test(form.phone)) {
      setError("رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05");
      return false;
    }
    setError("");
    return true;
  }

  function validateStep2() {
    if (!cvFile) { setError("من فضلك ارفع السيرة الذاتية"); return false; }
    if (!cvFile.name.toLowerCase().endsWith(".pdf")) {
      setError("الصيغة المدعومة: PDF فقط"); return false;
    }
    if (cvFile.size > 4 * 1024 * 1024) {
      setError("الحجم الأقصى للملف هو 4 ميجابايت"); return false;
    }
    setError("");
    return true;
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3));
  }
  function goBack() { setError(""); setStep((s) => Math.max(s - 1, 1)); }

  async function handleSubmit() {
    if (!cvFile || !category || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("category", category);
      fd.append("consent", "true");
      fd.append("cv", cvFile);

      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "حدث خطأ، حاول مرة أخرى");

      // تحليل الـ CV يعمل في الخلفية ولا يعطّل المرشح
      fetch("/api/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: json.id }),
        keepalive: true,
      }).catch(() => {});

      router.push(json.updated ? "/apply/thank-you?mode=update" : "/apply/thank-you");
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع، حاول مرة أخرى");
      setSubmitting(false);
    }
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200/60 text-center space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">الرجاء اختيار المسار المناسب</h2>
          <p className="text-slate-500">اختر المسار الذي يتوافق مع رغبتك للمتابعة (لا يمكن تغييره بعد الاختيار)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <button onClick={() => setCategory("توظيف")}
              className="p-6 border-2 border-slate-200 hover:border-indigo-600 rounded-2xl text-xl font-bold text-slate-800 bg-slate-50 hover:bg-indigo-50/30 transition cursor-pointer">
              💼 مسار التوظيف
            </button>
            <button onClick={() => setCategory("إعارة")}
              className="p-6 border-2 border-slate-200 hover:border-indigo-600 rounded-2xl text-xl font-bold text-slate-800 bg-slate-50 hover:bg-indigo-50/30 transition cursor-pointer">
              🔄 مسار الإعارة المهنية
            </button>
          </div>
          <button onClick={() => router.push("/")} className="text-sm text-slate-500 hover:text-slate-700 underline cursor-pointer">العودة إلى الصفحة الرئيسية</button>
        </div>
      </div>
    );
  }

  if (!hasAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8" dir="rtl">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center">{CONSENT_TITLE}</h2>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-600 text-sm leading-relaxed overflow-y-auto max-h-80 space-y-3">
            <p className="whitespace-pre-line">{CONSENT_INTRO}</p>
            {CONSENT_CLAUSES.map((c, i) => (
              <div key={i}>
                <p className="font-bold text-slate-800">{i + 1}. {c.title}</p>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input type="checkbox" id="accept-terms" checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-5 h-5 text-indigo-600 border-slate-300 rounded cursor-pointer" />
            <label htmlFor="accept-terms" className="text-slate-700 font-medium select-none cursor-pointer">
              {CONSENT_CHECKBOX}
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setCategory("")}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium transition cursor-pointer">
              رجوع
            </button>
            <button disabled={!isChecked} onClick={() => setHasAccepted(true)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              أوافق وأتابع
            </button>
          </div>
        </div>
      </div>
    );
  }

  const label = (t: string, req = false) => (
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
      {t} {req && <span className="text-rose-500">*</span>}
    </label>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">التسجيل في مجتمع المواهب</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${category === "إعارة" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
            {category === "إعارة" ? "🔄 مسار الإعارة" : "💼 مسار التوظيف"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1">
              <div className={`h-1.5 rounded-full ${step >= s.id ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`text-xs mt-1 ${step === s.id ? "text-indigo-700 font-bold" : "text-slate-400"}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>{label("الاسم الكامل", true)}
              <input className={inputCls} value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>{label("رقم الجوال", true)}
                <input className={inputCls} dir="ltr" inputMode="numeric" maxLength={10} placeholder="05XXXXXXXX" value={form.phone} onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
              <div>{label("البريد الإلكتروني", true)}
                <input className={inputCls} dir="ltr" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} /></div>
            </div>
            <div>{label("رابط LinkedIn (اختياري)")}
              <input className={inputCls} dir="ltr" value={form.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>{label("المسمى الوظيفي الحالي", true)}
                <input className={inputCls} value={form.current_title} onChange={(e) => updateField("current_title", e.target.value)} /></div>
              <div>{label("جهة العمل الحالية", true)}
                <input className={inputCls} value={form.current_employer} onChange={(e) => updateField("current_employer", e.target.value)} /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>{label("المجال", true)}
                <select className={inputCls} value={form.field} onChange={(e) => updateField("field", e.target.value)}>
                  <option value="">اختر...</option>
                  {FIELD_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select></div>
              <div>{label("سنوات الخبرة", true)}
                <select className={inputCls} value={form.years_of_experience} onChange={(e) => updateField("years_of_experience", e.target.value)}>
                  <option value="">اختر...</option>
                  {EXPERIENCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select></div>
            </div>
            <div>{label("الوضع الوظيفي", true)}
              <select className={inputCls} value={form.employment_status} onChange={(e) => updateField("employment_status", e.target.value)}>
                <option value="">اختر...</option>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {label("السيرة الذاتية (PDF فقط — حتى 4 ميجابايت)", true)}
            <input type="file" accept=".pdf,application/pdf"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer" />
            {cvFile && <p className="text-sm text-emerald-600">📄 {cvFile.name}</p>}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2 text-sm">
            {([
              ["المسار", category], ["الاسم", form.full_name], ["الجوال", form.phone],
              ["البريد", form.email], ["المسمى الحالي", form.current_title || "—"],
              ["جهة العمل", form.current_employer || "—"], ["المجال", form.field],
              ["سنوات الخبرة", form.years_of_experience], ["الوضع الوظيفي", form.employment_status],
              ["السيرة الذاتية", cvFile?.name || "—"],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-900">{v}</span>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</p>}

        <div className="flex justify-between pt-2">
          <button onClick={goBack} disabled={step === 1 || submitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer">السابق</button>
          {step < 3 ? (
            <button onClick={goNext} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer">التالي</button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 cursor-pointer">
              {submitting ? "جاري الإرسال..." : "إرسال الطلب ✅"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
