"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams.get("name") || "المتقدم";

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 dir-rtl" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">شكرًا لك، {name}!</h1>
        <p className="text-slate-600 mb-8 text-sm leading-relaxed">
          تم استلام طلب الانضمام إلى مجتمع الكفاءات بنجاح. سيقوم فريق التطوير والأخصائية بمراجعة ملفك والتقييم قريباً.
        </p>
        <button
          onClick={() => router.push("/apply")}
          className="w-full bg-[#0a6666] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#085555] transition duration-200 cursor-pointer"
        >
          العودة للاستمارة
        </button>
      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500 text-sm">
        جاري التحميل...
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
