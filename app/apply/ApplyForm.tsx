'use client';

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { EXPERIENCE_OPTIONS, FIELD_OPTIONS, EMPLOYMENT_STATUS_OPTIONS } from "@/lib/formOptions";

export default function ApplyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    years_of_experience: "",
    field: "",
    employment_status: "",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!cvFile || !form.full_name || !form.email) {
      setError("الرجاء إكمال البيانات الأساسية ورفع الملف");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const customCandidateId = crypto.randomUUID();
      const fileExt = cvFile.name.split(".").pop();
      const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

      // 1) رفع السيرة الذاتية إلى السيرفر
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(filePath, cvFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("cvs").getPublicUrl(filePath);

      // 2) حفظ المرشح في الجدول مع إرسال حقل الـ category لإرضاء قيد قاعدة البيانات
      const { error: insertError } = await supabase.from("candidates").upsert({
        id: customCandidateId,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        years_of_experience: form.years_of_experience,
        field: form.field,
        employment_status: form.employment_status,
        cv_file_url: publicUrl,
        cv_file_path: filePath,
        category: "توظيف",
        status: "pending",
      }, { onConflict: 'email' });

      if (insertError) throw insertError;

      // 3) استدعاء كود الفحص الذكي الصارم المدمج مباشرة ليمرر الملف كاملاً لـ Gemini
      await fetch("/api/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: customCandidateId }),
      });

      router.push("/apply/thank-you?mode=new");

    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">بوابة التقديم إلى مجتمع المواهب</h2>
          <p className="text-slate-500 text-sm">سجّلي بيانات المتقدم وارفعي الملف لتفعيل الفرز بالـ AI لايف</p>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">الاسم الكامل *</label>
            <input type="text" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5" placeholder="اسم المتقدم الثلاثي" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">الجوال *</label>
              <input type="text" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5" placeholder="05xxxxxxxx" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">البريد الإلكتروني *</label>
              <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5" placeholder="name@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">المجال المستهدف *</label>
            <select value={form.field} onChange={(e) => updateField("field", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 bg-white">
              <option value="">اختر المجال للوظيفة</option>
              {FIELD_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">سنوات الخبرة *</label>
              <select value={form.years_of_experience} onChange={(e) => updateField("years_of_experience", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 bg-white">
                <option value="">اختر سنوات الخبرة</option>
                {EXPERIENCE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">الوضع الوظيفي *</label>
              <select value={form.employment_status} onChange={(e) => updateField("employment_status", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 bg-white">
                <option value="">اختر الحالة العملية</option>
                {EMPLOYMENT_STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
          <div className="pt-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">ملف السيرة الذاتية (PDF) *</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 relative text-center">
              <input type="file" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.item(0) || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
              <span className="text-sm text-slate-600 block">{cvFile ? cvFile.name : "اضغطي هنا لرفع ملف السيرة الذاتية المتقدم"}</span>
            </div>
          </div>
        </div>

        <button disabled={submitting} onClick={handleSubmit} className={`w-full py-3 rounded-xl text-white font-semibold shadow-md transition ${submitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'}`}>
          {submitting ? "جاري الحفظ والتصفية بالـ AI الحقيقي..." : "تأكيد وإرسال الطلب للمنصة 🚀"}
        </button>
      </div>
    </div>
  );
}
