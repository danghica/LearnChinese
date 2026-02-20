import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chinese vocabulary chat",
  description: "Practice Chinese with vocabulary-based conversations",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
