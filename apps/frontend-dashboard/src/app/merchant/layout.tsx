"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["MERCHANT", "ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}
