import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Riverside Clone",
  description: "Phase 1 peer-to-peer video conferencing demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

