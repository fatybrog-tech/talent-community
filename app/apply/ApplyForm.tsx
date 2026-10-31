'use client';

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { EXPERIENCE_OPTIONS, FIELD_OPTIONS, EMPLOYMENT_STATUS_OPTIONS } from "@/lib/formOptions";

type Category = "توظيف" | "إعارة";

const STEPS = [
  { id: 1, label: "البيانات الأساسية" },
  { id: 2, label: "السيرة الذاتية" },
  { id: 3, label: "المراجعة" },
];

export default function ApplyForm() {
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialType = (searchParams.get("type") as Category) || "";

  const [category, setCategory] = useState<Category | "">(
    initialType === "توظيف" || initialType === "إعارة" ? initialType : ""
  );
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    linkedin_url: "",
    current_title: "",
    current_employer: "",
    years_of_experience: "",
    field: "",
    employment_status: "",
  });

  const [hasAccepted, setHasAccepted] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [started, setStarted] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1() {
    if (
      !form.full_name ||
      !form.phone ||
      !form.email ||
      !form.years_of_experience ||
      !form.employment_status ||
      !form.field
    ) {
      setError("من فضلك أكمل كل الحقول الإلزامية (المميزة بـ *)");
      return false;
    }
    setError("");
    return true;
  }

  function validateStep2() {
    if (!cvFile) {
      setError("من فضلك ارفع السيرة الذاتية");
      return false;
    }
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(cvFile.type)) {
      setError("الصيغة المدعومة: PDF أو DOCX فقط");
      return false;
    }
    if (cvFile.size > 5 * 1024 * 1024) {
      setError("الحجم الأقصى للملف هو 5 ميجابايت");
      return false;
    }
    setError("");
    return true;
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!cvFile) return;
    setSubmitting(true);
    setError("");

    try {
      const { data: checkEmail } = await supabase
        .from("candidates")
        .select("email")
        .eq("email", form.email)
        .single();

      const currentMode = checkEmail ? 'update' : 'new';

      const customCandidateId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      // 1) رفع ملف السيرة الذاتية إلى Supabase Storage
      const fileExt = cvFile.name.split(".").pop();
      const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(filePath, cvFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("cvs").getPublicUrl(filePath);

      // 2) إدخال بيانات المرشح الأساسية في قاعدة البيانات أولاً
      const { error: insertError } = await supabase
        .from("candidates")
        .upsert({
          id: customCandidateId,
          full_name: form.full_name,
          phone: form.phone,
          email: form.email,
          linkedin_url: form.linkedin_url || null,
          current_title: form.current_title || null,
          current_employer: form.current_employer || null,
          years_of_experience: form.years_of_experience,
          field: form.field,
          employment_status: form.employment_status,
          category,
          cv_file_url: publicUrl,
          cv_file_path: filePath,
          status: "pending",
        }, { onConflict: 'email' });

      if (insertError) throw insertError;

      // 3) استخراج النص البرمجي الحقيقي من الـ PDF وحفظه في الـ cv_text
      const uploadFormData = new FormData();
      uploadFormData.append("file", cvFile);
      uploadFormData.append("candidateId", customCandidateId);

      const textExtractResponse = await fetch("/api/upload-cv", {
        method: "POST",
        body: uploadFormData,
      });

      if (!textExtractResponse.ok) {
        console.warn("استخراج النص واجه مشكلة، سيتم الاعتماد على الفحص البديل");
      }

      // 4) استدعاء تحليل الـAI المتزامن المطور
      await fetch("/api/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: customCandidateId }),
      });

      router.push(`/apply/thank-you?mode=${currentMode}`);

    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  }

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6" dir="rtl">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center space-y-6">
          <div className="text-5xl">✨</div>
          <h1 className="text-3xl font-bold text-slate-900">مرحباً بك في منصة مجتمع المواهب</h1>
          <p className="text-slate-600 leading-relaxed max-w-lg mx-auto">
            منصتنا تهدف إلى بناء مجتمع حيوي للمواهب والكفاءات المهنية المهتمة بالفرص المستقبلية الشاغرة. سجل معلوماتك الآن لتكون ضمن خياراتنا الأولى.
          </p>
          <div className="pt-4">
            <button
              onClick={() => setStarted(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-8 rounded-xl transition duration-200 shadow-lg shadow-indigo-100 text-lg cursor-pointer animate-bounce"
            >
              ابدأ تسجيل اهتمامك الآن 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200/60 text-center space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">الرجاء اختيار المسار المهني المناسب</h2>
          <p className="text-slate-500">اختر المسار الذي يتوافق مع رغبتك وخبراتك الحالية للمتابعة</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <button
              onClick={() => setCategory("توظيف")}
              className="p-6 border-2 border-slate-200 hover:border-indigo-600 rounded-2xl text-xl font-bold text-slate-800 bg-slate-50 hover:bg-indigo-50/30 transition duration-200 text-center cursor-pointer"
            >
              💼 مسار وظيفة مستقبلية
            </button>
            <button
              onClick={() => setCategory("إعارة")}
              className="p-6 border-2 border-slate-200 hover:border-indigo-600 rounded-2xl text-xl font-bold text-slate-800 bg-slate-50 hover:bg-indigo-50/30 transition duration-200 text-center cursor-pointer"
            >
              🔄 مسار الإعارة المهنية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="bg-slate-900 px-6 py-8 text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">تقديم طلب الانضمام إلى مجتمع المواهب ({category})</h2>
          <p className="text-slate-400 text-sm">أكمل الخطوات الثلاث التالية لتسجيل ملفك المهني بنجاح</p>
        </div>

        <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center space-y-1 flex-col sm:flex-row sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {s.id}
                </div>
                <span className={`text-xs font-semibold ${step === s.id ? 'text-indigo-600' : 'text-slate-500'}`}>{s.label}</span>
                {idx < STEPS.length - 1 && <div className="hidden sm:block w-12 h-0.5 bg-slate-200 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 space-y-6">
          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الاسم الكامل الموثق *</label>
                <input type="text" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition" placeholder="اكتب اسمك الثلاثي أو الرباعي كما هو ببطاقة الهوية" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
