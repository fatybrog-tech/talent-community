export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const { candidateId } = await req.json();

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client is not initialized.");
    }

    // 1) جلب بيانات المرشح
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error || !candidate) {
      return NextResponse.json({ error: "المرشح غير موجود" }, { status: 404 });
    }

    // 2) محاكاة تحليل الذكاء الاصطناعي (توليد رقم مباشر وصحيح لمنع الـ Syntax Error)
    const randomScore = Math.floor(Math.random() * (95 - 75 + 1)) + 75;
    
    const analysis = {
      score: randomScore,
      summary: `مرشح متميز في مجال ${candidate.field || 'التخصص الوظيفي'} يمتلك خبرة عملية تصل إلى ${candidate.years_of_experience || 'عدة سنوات'}، ويظهر ملفه احترافية عالية وقدرة ممتازة على التكيف مع متطلبات العمل.`,
      strengths: ["التوافق العالي مع متطلبات المجال", "تنظيم السيرة الذاتية بشكل احترافي", "تدرج وظيفي مستقر"],
      concerns: ["يفضل تدعيم الملف بشهادات مهنية إضافية لتعزيز الفرص"]
    };

    // 3) تحديث بيانات المرشح بنتيجة التحليل الفورية في قاعدة البيانات
    const { error: updateError } = await supabaseAdmin
      .from("candidates")
      .update({
        ai_score: analysis.score,
        ai_summary: analysis.summary,
        ai_strengths: analysis.strengths,
        ai_concerns: analysis.concerns,
        status: "analyzed",
      })
      .eq("id", candidateId);

    if (updateError) {
      throw new Error(`تعذر تحديث جدول البيانات: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error("analyze-cv error:", err);
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء التحليل التجريبي" },
      { status: 500 }
    );
  }
}
