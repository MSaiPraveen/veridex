"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["CONSUMER", "ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}
