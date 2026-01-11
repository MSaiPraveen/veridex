import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ApiHealthPanel } from "@/components/debug/api-health-panel";
import { ToastProvider } from "@/components/ui/portal";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Veridex - Compliance Platform",
  description: "Enterprise compliance and verification platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <ErrorBoundary>
            <ToastProvider>
              <AuthProvider>
                {children}
                <ApiHealthPanel />
              </AuthProvider>
            </ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
