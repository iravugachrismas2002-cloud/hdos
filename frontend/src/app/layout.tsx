// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "HDOS Rwanda - Human Development Intelligence Operating System",
  description: "Turn your goals and Rwanda's public data into an explainable, trackable development pathway.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
