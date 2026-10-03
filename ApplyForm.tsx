ReviewStep"use client";

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
  const [isUpdateMode, setIsUpdateMode] = useState(false); // هذا هو مكانها السليم برمجياً داخل جسم الدالة

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
  employment_status: "",   // ⬅️ السطر الجديد

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
    // الفحص الذكي: هل الإيميل مسجل مسبقاً في قاعدة البيانات؟
    // الفحص المباشر والسريع للإيميل قبل التوجيه لصفحة الشكر
const { data: checkEmail } = await supabase
  .from("candidates")
  .select("email")
  .eq("email", form.email)
  .single();

if (checkEmail) {
  // إذا كان الإيميل مسجلاً مسبقاً، يوجهه لرابط التعديل مباشرة
  router.push("/apply/thank-you?mode=update");
} else {
  // إذا كان مستخدماً جديداً، يوجهه للرابط العادي
  router.push("/apply/thank-you?mode=new");
}


      // توليد معرّف فريد من العميل مسبقاً لتجنب طلب القراءة
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

      // 2) إدخال بيانات المرشح بدون .select() أو .single()
     const { data, error: insertError } = await supabase
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

            // 3) استدعاء تحليل الـAI بشكل متزامن لضمان التحديث الفوري
      await fetch("/api/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: customCandidateId }),
      });

      router.push(`/apply/thank-you?mode=${isUpdateMode ? 'update' : 'new'}`);


    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  }

// 1. العرض الأول: صفحة الترحيب والتعريف بالموقع (تظهر أولاً)
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

// 2. العرض الثاني: اختيار المسار (يظهر بعد الضغط على ابدأ)
// سنعتمد هنا على المتغير الحالي لديكِ في الكود لمعرفة ما إذا كان المستخدم قد اختار المسار أم لا
// إذا لم يكن هناك متغير اختيار في الأعلى، نتحقق من اختيار category
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

// 3. العرض الثالث: صفحة الإقرار والخصوصية (تظهر بعد اختيار المسار بنجاح)
if (!hasAccepted) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden flex flex-col my-6">
        
        <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800">
          <div className="text-3xl mb-2">⚖️</div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide">إقرار التسجيل والخصوصية واستخدام البيانات</h2>
          <span className="text-xs bg-indigo-600/80 text-white font-medium px-3 py-1 rounded-full mt-2 inline-block">
            مسار محدد: {category}
          </span>
        </div>
        
        <div className="p-6 md:p-8 space-y-6 text-slate-700 text-sm md:text-base leading-relaxed overflow-y-auto max-h-[50vh] border-b border-slate-100">
          <p className="font-medium text-slate-900 bg-slate-50 p-4 rounded-xl border-r-4 border-slate-500">
            تهدف هذه المنصة إلى بناء مجتمع للمواهب والكفاءات المهنية، بما يتيح التعرف على الخبرات والمهارات والاستفادة منها عند توفر احتياجات أو فرص مستقبلية تتناسب مع الملفات المهنية المسجلة.
          </p>
          <p className="font-semibold text-slate-800">ويُعد استكمال التسجيل في المنصة إقرارًا من المستخدم بما يلي:</p>
          
          <div className="space-y-4 pr-2 text-sm text-slate-600">
            <p><strong>1. طبيعة التسجيل:</strong> أقر بأن تسجيلي في المنصة يُعد تسجيلًا للاهتمام بالفرص المهنية المستقبلية، ولا يمثل تقديمًا على وظيفة محددة...</p>
            <p><strong>2. صحة البيانات:</strong> أقر بأن البيانات والمعلومات والمستندات التي أقدمها، بما في ذلك السيرة الذاتية صحيحة...</p>
            <p><strong>3. استخدام البيانات:</strong> أوافق على جمع ومعالجة البيانات والمعلومات التي أقدمها للأغراض المرتبطة ببناء وإدارة مجتمع المواهب...</p>
            <p><strong>4. استخدام تقنيات الذكاء الاصطناعي:</strong> أقر بعلمي بإمكانية استخدام تقنيات الذكاء الاصطناعي للمساعدة في قراءة وتحليل السيرة الذاتية...</p>
            <p><strong>5. التواصل:</strong> أوافق على استخدام بيانات التواصل المسجلة، للتواصل معي عند وجود احتياج...</p>
            <p><strong>6. السرية وحماية البيانات:</strong> تُعالج البيانات والمستندات المقدمة وفق الضوابط والسياسات المعتمدة لحماية البيانات والخصوصية...</p>
            <p><strong>7. تحديث البيانات:</strong> أتحمل مسؤولية المحافظة على تحديث بياناتي وملفي المهني بما يعكس وضعي وخبراتي الحالية.</p>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">الإقرار</h3>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-5 h-5 accent-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-slate-700 text-sm font-medium leading-relaxed">
                أقر بأنني قرأت وفهمت ما ورد أعلاه، وأوافق على تسجيل بياناتي ومعالجتها واستخدامها للأغراض الموضحة، بما في ذلك تحليل ملفي المهني باستخدام تقنيات الذكاء الاصطناعي والتواصل معي بشأن الفرص المهنية المستقبلية المحتملة.
              </span>
            </label>
          </div>
          <button
            onClick={() => isChecked && setHasAccepted(true)}
            disabled={!isChecked}
            className={`w-full font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-base shadow-sm ${
              isChecked ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            أوافق وأتابع التقديم ⬅️
          </button>
        </div>
      </div>
    </div>
  );
}

// 4. العرض الرابع والأخير: استمارة تعبئة البيانات الكبيرة القديمة وسحب الـ CV (تفتح تلقائياً هنا)


  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* المسار مثبّت بعد الاختيار الأول، ولا يمكن تغييره في هذه المرحلة */}
      <div className="mb-8 flex items-center justify-center">
        <span className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full py-2 px-5 font-bold text-sm">
          المسار المحدد: {category}
        </span>
      </div>

           {/* شريط المراحل المطور (Stepper) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8" dir="rtl">
        <div className="flex items-center justify-between relative max-w-xl mx-auto">
          
          {/* خط الخلفية الواصل بين الدوائر */}
          
          {/* خط التقدم الملون النشط */}
<div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>

<div
  className="absolute top-1/2 right-4 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500 ease-in-out"
  style={{ 
    width: step === 1 ? "0%" : step === 2 ? "50%" : "calc(100% - 2rem)"
  }}
></div>

         
          {STEPS.map((s) => {
            const isCompleted = step > s.id;
            const isActive = step === s.id;
            
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 relative z-10 select-none">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-500 shadow-sm ${
                    isCompleted
                      ? "bg-primary border-primary text-white scale-105"
                      : isActive
                      ? "bg-white border-primary text-primary ring-4 ring-primary/10 scale-110"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>
                <span className={`text-xs font-bold transition-colors duration-300 ${
                  isActive ? "text-primary" : isCompleted ? "text-gray-700" : "text-gray-400"
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}

        </div>
      </div>


      <div className="bg-white rounded-xl shadow-md p-8">
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-primary text-center mb-6">
              البيانات الأساسية
            </h2>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="الاسم الكامل" required>
                <input
                  className="input"
                  placeholder="أدخل اسمك الكامل"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                />
              </Field>
              <Field label="المسمى الوظيفي الحالي">
                <input
                  className="input"
                  placeholder="أدخل المسمى الوظيفي الحالي"
                  value={form.current_title}
                  onChange={(e) =>
                    updateField("current_title", e.target.value)
                  }
                />
              </Field>
              <Field label="رقم الجوال" required>
                <input
                  className="input"
                  placeholder="05xxxxxxxx"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </Field>
              <Field label="جهة العمل الحالية">
                <input
                  className="input"
                  placeholder="أدخل جهة العمل الحالية"
                  value={form.current_employer}
                  onChange={(e) =>
                    updateField("current_employer", e.target.value)
                  }
                />
              </Field>
              <Field label="البريد الإلكتروني" required>
                <input
                  className="input"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </Field>
              <Field label="سنوات الخبرة" required>
                <select
                  className="input"
                  value={form.years_of_experience}
                  onChange={(e) =>
                    updateField("years_of_experience", e.target.value)
                  }
                >
                  <option value="">اختر عدد سنوات الخبرة</option>
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="رابط LinkedIn (اختياري)">
                <input
                  className="input"
                  placeholder="أدخل رابط حسابك هنا"
                  value={form.linkedin_url}
                  onChange={(e) =>
                    updateField("linkedin_url", e.target.value)
                  }
                />
              </Field>
              <Field label="المجال المهني" required>
                <select
                  className="input"
                  value={form.field}
                  onChange={(e) => updateField("field", e.target.value)}
                >
                  <option value="">اختر المجال المهني</option>
                  {FIELD_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
<Field label="الوضع الوظيفي الحالي" required>
  <select
    className="input"
    value={form.employment_status}
    onChange={(e) => updateField("employment_status", e.target.value)}
  >
    <option value="">اختر الوضع الوظيفي</option>
    {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
</Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-primary text-center mb-6">
              رفع السيرة الذاتية
            </h2>
            <label className="block border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-primary transition">
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
              <div className="text-4xl mb-3">⬆️</div>
              <p className="font-medium mb-1">
                {cvFile ? cvFile.name : "اسحب ملف السيرة الذاتية وألقه هنا، أو اضغط للتصفح"}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                الصيغ المدعومة: PDF فقط، الحجم الأقصى: 5 ميجابايت.
                <br />
                يفضل صيغة PDF أو DOCX. تأكد من تحديث بيانات التواصل داخل الملف.
              </p>
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-primary text-center mb-6">
              مراجعة البيانات
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
              <Review label="المسار" value={category} />
              <Review label="الاسم الكامل" value={form.full_name} />
              <Review label="رقم الجوال" value={form.phone} />
              <Review label="البريد الإلكتروني" value={form.email} />
              <Review label="المجال المهني" value={form.field} />
              <Review label="سنوات الخبرة" value={form.years_of_experience} />
              <Review label="ملف السيرة الذاتية" value={cvFile?.name || "-"} />
            </div>
          </>
        )}

        {error && (
          <p className="text-red-600 text-sm mt-5 text-center">{error}</p>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={goBack}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-md bg-gray-300 text-gray-700 disabled:opacity-40"
          >
            السابق
          </button>

          {step < 3 ? (
            <button
              onClick={goNext}
              className="px-6 py-2.5 rounded-md bg-primary text-white hover:bg-primary-dark"
            >
              التالي
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-md bg-primary text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? "جاري الإرسال..." : "تأكيد التسجيل"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {required && <span className="text-red-500">*</span>} {label}
      </label>
      {children}
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
