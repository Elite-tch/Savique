import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SafeVault | Secure Crypto Savings on Flare",
  description: "Secure your financial future with SafeVault. Create purpose-driven, time-locked savings vaults on the Flare Network. Earn verifiable receipts and build discipline.",
  keywords: ["SafeVault", "Flare Network", "Crypto Savings", "Time-Locked Vault", "DeFi", "ProofRails", "Web3 Savings", "Coston2"],
  authors: [{ name: "SafeVault Team" }],
  openGraph: {
    title: "SafeVault | Secure Crypto Savings on Flare",
    description: "Automated, purpose-driven savings vaults secured by smart contracts on the Flare Network.",
    type: "website",
    siteName: "SafeVault",
  },
  icons: {
    icon: "/favicon.ico",
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
