export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const { candidateId } = await req.json();

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client is not initialized.");
    }

    // 1) جلب بيانات المرشح والسيرة الذاتية المرفوعة
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error || !candidate) {
      return NextResponse.json({ error: "المرشح غير موجود" }, { status: 404 });
    }

    // النص الأساسي للـ CV المخزن أو المهارات المرفوعة
    const cvContentText = candidate.cv_text || `الاسم: ${candidate.full_name}. المجال المهني: ${candidate.field}. سنوات الخبرة: ${candidate.years_of_experience}.`;
    const targetedJob = candidate.field || "الوظيفة المتقدم لها";

    // 2) الاتصال الفعلي والمباشر بـ Google Gemini AI للمطابقة والتحليل الحقيقي
    const geminiResponse = await fetch(
      `https://googleapis.com{process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `أنت مسؤول توظيف وأخصائي موارد بشرية خبير. قم بمطابقة السيرة الذاتية التالية بدقة عالية مع المجال الوظيفي المستهدف (${targetedJob}). 
              يجب أن تعيد لي النتيجة حصراً بصيغة كائن JSON نظيف جداً ومقروء برمجياً، ويحتوي على العناصر التالية باللغة العربية ودون أي نصوص خارج الكائن:
              {
                "score": (ضع هنا تقييم رقمي حقيقي ومطابق من 100 بناءً على ملاءمة المهارات)،
                "summary": "(ضع هنا ملخص ذكي جداً مخصص لهذا المرشح في سطر واحد يوضح توافق خبراته الحقيقية بالملي مع متطلبات العمل وترك التكرار)"،
                "strengths": ["نقطة قوة حقيقية 1"، "نقطة قوة حقيقية 2"],
                "concerns": ["نقطة ضعف أو توصية حقيقية لتحسين ملفه"]
              }

              نص السيرة الذاتية للمرشح:
              ${cvContentText}`
            }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error("فشل الاتصال بخادم الذكاء الاصطناعي لجوجل.");
    }

    const aiData = await geminiResponse.json();
    const rawAiText = aiData.candidates[0].content.parts[0].text.trim();
    
    // تنظيف النص المستلم لضمان فكه كـ JSON صافي دون أخطاء
    const cleanJsonText = rawAiText.replace(/```json/g, "").replace(/```/g, "").trim();
    const aiParsedResult = JSON.parse(cleanJsonText);

    const analysis = {
      score: Number(aiParsedResult.score) || 75,
      summary: aiParsedResult.summary || "مرشح مهتم بالانضمام لمجتمع الكفاءات.",
      strengths: aiParsedResult.strengths || ["مؤهلات مناسبة للمجال"],
      concerns: aiParsedResult.concerns || ["يفضل مراجعة الملف التفصيلي"]
    };

    // 3) تحديث بيانات المرشح بنتيجة الـ AI الحقيقية والمطابقة في قاعدة البيانات السحابية
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
      { error: err.message || "حدث خطأ أثناء المطابقة الذكية" },
      { status: 500 }
    );
  }
}
