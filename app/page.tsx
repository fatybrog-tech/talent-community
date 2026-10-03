import Link from "next/link";

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-cover bg-center flex items-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(10,20,25,0.55), rgba(10,20,25,0.65)), url('https://images.unsplash.com/photo-1548515653-88f2c485e408?q=80&w=1600')",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-20 text-white">
        <h1 className="text-4xl md:text-5xl font-black text-center leading-relaxed">
          انضم إلى مجتمع المواهب
          <br />
          <span className="text-primary">وابن مستقبلك معنا</span>
        </h1>

        <p className="text-center mt-6 text-lg text-gray-200 max-w-2xl mx-auto">
          نحن نبحث عن الكفاءات المميزة في مختلف المجالات، سجل اهتمامك الآن
          لتكون ضمن قاعدة المواهب لدينا للتواصل معك عند توفر فرص مناسبة.
        </p>

        <div className="mt-4 max-w-2xl mx-auto bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-center">
          ⚠️ تنبيه: التسجيل في المجتمع يعبّر عن إبداء اهتمام وليس تقديماً على
          وظيفة محددة.
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="bg-white text-gray-800 rounded-xl p-6 shadow-lg text-center">
            <div className="text-3xl mb-2">👤</div>
            <h3 className="font-bold text-lg mb-1">مسار التوظيف</h3>
            <p className="text-sm text-gray-500 mb-4">فرص وظيفية دائمة</p>
            <Link
              href="/apply?type=توظيف"
              className="block bg-primary hover:bg-primary-dark text-white rounded-md py-2.5 font-medium transition"
            >
              سجل اهتمامك
            </Link>
          </div>

          <div className="bg-white text-gray-800 rounded-xl p-6 shadow-lg text-center">
            <div className="text-3xl mb-2">🔁</div>
            <h3 className="font-bold text-lg mb-1">مسار الإعارة</h3>
            <p className="text-sm text-gray-500 mb-4">فرص عمل بنظام الإعارة</p>
            <Link
              href="/apply?type=إعارة"
              className="block bg-primary hover:bg-primary-dark text-white rounded-md py-2.5 font-medium transition"
            >
              سجل اهتمامك
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
