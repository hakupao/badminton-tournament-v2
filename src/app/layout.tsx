import type { Metadata } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { MainNav } from "@/components/layout/main-nav";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/lib/auth-context";
import { TournamentProvider } from "@/lib/tournament-context";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ShuttleArena | 羽球竞技场",
  description: "羽毛球团体循环赛管理系统",
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    shortcut: "/icon",
    apple: "/icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${nunitoSans.variable} antialiased min-h-screen flex flex-col bg-background text-foreground court-bg`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <TournamentProvider>
            <MainNav />
            <main className="container mx-auto px-4 py-6 max-w-7xl flex-1">
              {children}
            </main>
            <Footer />
            <Toaster richColors position="top-center" />
          </TournamentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
