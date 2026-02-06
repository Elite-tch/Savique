import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://safevault-app.vercel.app"),
  title: {
    default: "Savique | Secure Crypto Savings on Flare",
    template: "%s | Savique"
  },
  description: "Savique is the smart commitment protocol for your capital. Create purpose-driven, time-locked Savings on the Flare Network. Build financial discipline, earn verifiable proofs, and secure your future.",
  applicationName: "Savique",
  authors: [{ name: "Savique Team", url: "https://savique.finance" }],
  creator: "Savique Team",
  publisher: "Savique",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  keywords: [
    "Savique",
    "Flare Network",
    "Crypto Savings",
    "Time-Locked Savings",
    "DeFi",
    "ProofRails",
    "Web3 Savings",
    "Coston2",
    "Financial Discipline",
    "Smart Vaults",
    "Crypto Banking"
  ],
  openGraph: {
    title: "Savique | Secure Crypto Savings on Flare",
    description: "Automated, purpose-driven savings secured by smart contracts on the Flare Network. Build discipline and verifiable financial reputation.",
    url: "https://safevault-app.vercel.app",
    siteName: "Savique",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo3.png", // Ensure this exists or use a generic one
        width: 1200,
        height: 630,
        alt: "Savique - Smart Commitment Protocol",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Savique | Secure Crypto Savings on Flare",
    description: "Secure your financial future with Savique. Smart Savings for disciplined wealth building.",
    creator: "@SaviqueApp", // Placeholder handle
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico", // Recommended to add
  },
  verification: {
    google: "9kwTXYiVS0JqYGiaeAurG8sAycV-s15TzQ6KOsFa4TA",
  },
  category: "Finance",
  alternates: {
    canonical: "https://safevault-app.vercel.app",
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
