import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/lib/admin-auth-context";
import { ThemeProvider, themeScript } from "@/components/providers/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Veridex Admin Portal",
  description: "Internal administration portal for Veridex compliance platform",
  robots: "noindex, nofollow", // Never index admin pages
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash - applies theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <AdminAuthProvider>
            {children}
          </AdminAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
