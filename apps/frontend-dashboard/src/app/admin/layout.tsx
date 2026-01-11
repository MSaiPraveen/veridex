"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}
