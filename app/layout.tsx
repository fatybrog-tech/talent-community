import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مجتمع المواهب",
  description: "انضم إلى مجتمع المواهب وابن مستقبلك معنا",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
