"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode");
  const isUpdateMode = mode === "update";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center space-y-6 transform transition hover:scale-[1.01]">
        
        {/* أيقونة النجاح الأصلية الخاصة بكِ دون تغيير */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          {/* العنوان المتغير تلقائياً مع الحفاظ على التنسيق */}
          <h2 className="text-2xl font-black text-[#0a6666]">
            {isUpdateMode ? "تم تعديل بياناتك بنجاح!" : "تم تسجيل اهتمامك بنجاح!"}
          </h2>
          {/* الوصف المتغير تلقائياً مع الحفاظ على التنسيق */}
          <p className="text-sm text-gray-500 leading-relaxed">
            {isUpdateMode 
              ? "تم استلام مستنداتك وسيرتك الذاتية المحدثة، وتم تعديل بياناتك المهنية في مجتمع المواهب لدينا بنجاح."
              : "تم استلام بياناتك وسيرتك الذاتية بنجاح. وقد تم إضافتك إلى مجتمع المواهب لدينا."
            }
          </p>
        </div>

        {/* صندوق (ماذا يحدث الآن؟) الأصلي الخاص بكِ بالكامل */}
        <div className="bg-slate-50 rounded-xl p-4 text-right space-y-3 border border-slate-100">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            💡 ماذا يحدث الآن؟
          </h3>
          <ul className="text-xs text-gray-600 space-y-2.5 list-disc list-inside pr-1">
            <li>
              {isUpdateMode 
                ? "سيتم إعادة تحليل سيرتك الذاتية المحدثة من قبل نظامنا الذكي."
                : "سيتم تحليل سيرتك الذاتية من قبل نظامنا الذكي."
              }
            </li>
            <li>سيتم تصنيفك في المجالات المناسبة لخبراتك.</li>
            <li>سنتواصل معك مباشرة عند توفر فرص تتوافق مع مؤهلاتك.</li>
          </ul>
        </div>

        {/* زر العودة للرئيسية الأصلي المفعل برمجياً للتوجيه الفوري */}
        <button 
onClick={() => router.push("/")}
          className="w-full bg-[#0a6666] hover:bg-[#085252] text-white font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-md cursor-pointer"
        >
          العودة للصفحة الرئيسية
        </button>

      </div>
    </div>
  );
}
