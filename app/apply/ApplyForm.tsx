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

      // 3) 🌟 خطوة استخراج النص البرمجي الحقيقي من الـ PDF وحفظه في الـ cv_text 🌟
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

      // 4) استدعاء تحليل الـAI المتزامن (الذي قمنا بضبط شروطه الصارمة لمنع التلاعب)
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

  if (!hasAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8" dir="rtl">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden flex flex-col p-8 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center">إقرار الخصوصية وشروط الاستخدام</h2>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-600 text-sm leading-relaxed overflow-y-auto max-h-60 space-y-3">
            <p>1. أتعهد بأن جميع البيانات والملفات المدخلة صحيحة ومحدثة وتتحمل المسؤولية الكاملة عنها.</p>
            <p>2. أوافق على معالجة السيرة الذاتية والملفات بواسطة أنظمة الفرز الذكية لتصنيف التخصصات والكفاءة.</p>
            <p>3. تلتزم المنصة بالحفاظ على سرية معلومات المتقدمين وعدم مشاركتها خارج نطاق لجان التوظيف المختصة.</p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="accept-terms"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="accept-terms" className="text-slate-700 font-medium select-none cursor-pointer">
              قرأت الشروط المذكورة أعلاه وأوافق على تفعيل الفرز الآلي لملفي المهني.
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setCategory("")}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium transition cursor-pointer"
            >
              رجوع
            </button>
            <button
              disabled={!isChecked}
              onClick={() => setHasAccepted(true)}
