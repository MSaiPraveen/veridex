"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to products page with action=new to open the create modal
    router.replace("/merchant/products?action=new");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );
}
