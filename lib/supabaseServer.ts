import { createClient } from "@supabase/supabase-js";

// هذا العميل يُستخدم فقط داخل مسارات API على السيرفر (لا يصل إليه المتصفح إطلاقًا)
// لأنه يستخدم مفتاح service_role الذي يملك صلاحيات كاملة على قاعدة البيانات
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
