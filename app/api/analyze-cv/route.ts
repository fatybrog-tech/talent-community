export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { analyzeCandidate } from "@/lib/analyze";

export async function POST(req: NextRequest) {
  try {
    const { candidateId } = await req.json();
    if (!candidateId) return NextResponse.json({ error: "معرّف مفقود" }, { status: 400 });

    // هل الطالب هو الأخصائية (مسجلة دخول)؟ فقط هي تستطيع إعادة التحليل
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    let isAdmin = false;
    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      isAdmin = !!data?.user;
    }

    const { data: c } = await supabaseAdmin
      .from("candidates").select("status").eq("id", candidateId).single();
    if (!c) return NextResponse.json({ error: "المرشح غير موجود" }, { status: 404 });
    if (c.status !== "pending" && !isAdmin) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const result = await analyzeCandidate(candidateId);
    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "فشل التحليل" }, { status: 500 });
  }
}
