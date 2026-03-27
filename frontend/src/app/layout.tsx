import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTP - Ban's TeaserParser",
  description: "AI-powered real estate opportunity parser",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d1117] text-gray-200 min-h-screen">
        {children}
      </body>
    </html>
  );
}
