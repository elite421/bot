"use client";
import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  const hide = pathname === "/" || pathname.startsWith("/admin");
  if (hide) return null;
  return <Footer />;
}
