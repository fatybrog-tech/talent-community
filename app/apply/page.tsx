import { Suspense } from "react";
import ApplyForm from "./ApplyForm";

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">جاري التحميل...</div>}>
      <ApplyForm />
    </Suspense>
  );
}
