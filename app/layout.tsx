import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Savique | Secure Crypto Savings on Flare",
  description: "Secure your financial future with Savique. Create purpose-driven, time-locked savings on the Flare Network. Earn verifiable receipts and build discipline.",
  keywords: ["Savique", "Flare Network", "Crypto Savings", "Time-Locked Savings", "DeFi", "ProofRails", "Web3 Savings", "Coston2"],
  authors: [{ name: "Savique Team" }],
  openGraph: {
    title: "Savique | Secure Crypto Savings on Flare",
    description: "Automated, purpose-driven savings secured by smart contracts on the Flare Network.",
    type: "website",
    siteName: "Savique",
  },
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: "9kwTXYiVS0JqYGiaeAurG8sAycV-s15TzQ6KOsFa4TA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.className} ${outfit.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
