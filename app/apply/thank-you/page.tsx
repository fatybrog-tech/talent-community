import Link from "next/link";

export default function ThankYou({ searchParams }: { searchParams: { mode?: string } }) {
  const updated = searchParams?.mode === "update";
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-10 border border-slate-200 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 text-2xl font-bold">✓</div>
        <h1 className="text-2xl font-bold text-slate-900">
          {updated ? "تم تحديث بياناتك بنجاح" : "تم استلام طلبك بنجاح"}
        </h1>
        <p className="text-slate-600 leading-relaxed">
          {updated
            ? "تم حفظ بياناتك وسيرتك الذاتية المحدّثة، وستُعتمد في أي مراجعة قادمة."
            : "نشكرك على تسجيل اهتمامك بالانضمام إلى مجتمع المواهب. ستتم مراجعة بياناتك وسيرتك الذاتية من قبل الجهة المختصة، وسيتم التواصل معك عند توفر فرصة مناسبة."}
        </p>
        <Link href="/" className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-8 rounded-xl transition">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
