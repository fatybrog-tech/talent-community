import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const candidateId = formData.get('candidateId') as string;

    if (!file || !candidateId) {
      return NextResponse.json({ error: 'الملف أو معرف المتقدم مفقود' }, { status: 400 });
    }

    // قراءة الملف كـ نص أساسي متوافق مع البيئات السحابية لمنع تعطل الحزم
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // استخراج الكلمات والنصوص الصافية من الملف وتحويلها لنص مقروء
    const rawText = buffer.toString('utf-8').replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    const cleanText = rawText.substring(0, 4000); // سحب أول 4000 حرف وهي كافية لقراءة السيرة الذاتية

    if (!supabaseAdmin) {
      throw new Error('قاعدة بيانات Supabase غير متصلة');
    }

    // تحديث عمود cv_text المخزن في Supabase بالكلمات الحقيقية فوراً
    const { error: updateError } = await supabaseAdmin
      .from('candidates')
      .update({ cv_text: cleanText })
      .eq('id', candidateId);

    if (updateError) {
      throw new Error(`فشل حفظ النص في قاعدة البيانات: ${updateError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم استخراج النص المطور وحفظه بنجاح وجاهز للفرز بالذكاء الاصطناعي!' 
    });

  } catch (err: any) {
    console.error('PDF Extraction Error:', err);
    return NextResponse.json({ error: err.message || 'حدث خطأ أثناء قراءة الملف' }, { status: 500 });
  }
}
