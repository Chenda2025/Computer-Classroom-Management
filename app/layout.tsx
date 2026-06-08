import type { Metadata } from "next";
import { Moul, Battambang } from "next/font/google";
import "./globals.css";

const moul = Moul({ 
  weight: "400",
  subsets: ["khmer"], 
  variable: "--font-moul",
  display: "swap" 
});

const battambang = Battambang({
  weight: ["100", "300", "400", "700", "900"],
  subsets: ["khmer"],
  variable: "--font-battambang",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ប្រព័ន្ធគ្រប់គ្រងថ្នាក់រៀន",
  description: "Premium classroom management for teachers and monitors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body className={`${moul.variable} ${battambang.variable}`}>
        <main className="animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  );
}
