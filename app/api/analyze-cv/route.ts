export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // 2) الذكاء الاصطناعي الفعلي الموثوق بدلاً من العشوائي
    const cvText = candidate.cv_text || "نص السيرة الذاتية غير متوفر";
    const targetField = candidate.field || "غير محدد";

    const prompt = `
    أنت خبير محترف في الموارد البشرية والـ ATS، مهمتك مطابقة السيرة الذاتية للمتقدم مع القسم المستهدف بدقة.
    القسم المستهدف: ${targetField}
    نص السيرة الذاتية المستخرج: ${cvText}

    شروط الفرز والتحليل الصارمة:
    1. احسب نسبة مطابقة حقيقية (score) من 100. شرط إلزامي: إذا كان تخصص السيرة الذاتية لا يعود للقسم المستهدف نهائياً (مثل تخصص نظم معلومات مقدم على قسم مالي)، يجب ألا تتجاوز النسبة 30% مهما تطابقت الكلمات المفتاحية العشوائية.
    2. اكتب ملخصاً ذكياً وموجزاً جداً (summary) في سطر واحد يصف المرشح وخلفيته الحقيقية بدقة تامة دون تكرار عبارات جاهزة.
    3. استخرج أبرز نقاط القوة (strengths) والمخاوف أو النقص (concerns) كقائمة نصوص.

    يجب أن تكون الإجابة بصيغة JSON حصراً بهذا الهيكل تماماً:
    {
      "score": 85,
      "summary": "الملخص الفعلي باللغة العربية",
      "strengths": ["نقطة 1", "نقطة 2"],
      "concerns": ["تخوف 1"]
    }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const analysis = JSON.parse(response.text);

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
      { error: err.message || "حدث خطأ أثناء التحليل الحقيقي" },
      { status: 500 }
    );
  }
}
