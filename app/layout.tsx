import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { UserMenu } from "@/components/user-menu";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Garchen Archive Asset Catalog Hub",
  description: "Catalog and prepare Garchen Archive Assets for GA Pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <nav className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <a href="/" className="text-2xl font-bold hover:opacity-80 transition-opacity">
                  Garchen Archive
                </a>
                <div className="flex items-center gap-6">
                  <a href="/events" className="text-sm font-medium hover:underline">
                    Events
                  </a>
                  <a href="/sessions" className="text-sm font-medium text-muted-foreground/50 hover:text-muted-foreground hover:underline">
                    Sessions
                  </a>
                  <a href="/assets" className="text-sm font-medium hover:underline">
                    Assets
                  </a>
                  <a href="/transcripts" className="text-sm font-medium hover:underline">
                    Transcripts
                  </a>
                  <div className="relative group">
                    <a href="/organizations" className="text-sm font-medium hover:underline">
                      Orgs
                    </a>
                    <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
                      <div className="bg-background border rounded-md shadow-lg py-1 min-w-[140px]">
                        <a href="/organizations" className="block px-4 py-2 text-sm hover:bg-muted">
                          All Orgs
                        </a>
                        <a href="/locations" className="block px-4 py-2 text-sm hover:bg-muted">
                          Locations
                        </a>
                      </div>
                    </div>
                  </div>
                  <a href="/taxonomy" className="text-sm font-medium hover:underline">
                    Topics & Categories
                  </a>
                  <div className="relative group">
                    <a href="/pipeline" className="text-sm font-medium hover:underline">
                      Pipeline
                    </a>
                    <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
                      <div className="bg-background border rounded-md shadow-lg py-1 min-w-[140px]">
                        <a href="/pipeline" className="block px-4 py-2 text-sm hover:bg-muted">
                          Overview
                        </a>
                        <a href="/pipeline/import" className="block px-4 py-2 text-sm hover:bg-muted">
                          Import
                        </a>
                        <a href="/pipeline/workflows" className="block px-4 py-2 text-sm hover:bg-muted">
                          Workflows
                        </a>
                        <a href="/pipeline/jobs" className="block px-4 py-2 text-sm hover:bg-muted">
                          Jobs
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 pl-4 border-l">
                    <UserMenu />
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className="container mx-auto px-4 py-8">{children}</main>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
