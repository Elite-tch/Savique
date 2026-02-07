import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://savique-fb5p.vercel.app"),
  title: {
    default: "Savique | Secure Digital Savings & Disciplined Goals",
    template: "%s | Savique"
  },
  description: "Savique is the smart savings protocol for your capital. Create purpose-driven, time-locked savings goals. Build financial discipline, earn verifiable success certificates, and secure your financial future through automated digital vaults.",
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
    "Digital Savings",
    "Time-Locked Savings",
    "Savings Goals",
    "Financial Discipline",
    "Smart Vault technology",
    "Digital asset management",
    "Automated Savings",
    "Wealth building",
    "Secure Digital Assets",
    "Financial Commitment"
  ],
  openGraph: {
    title: "Savique | Secure Digital Savings & Goals",
    description: "Automated, purpose-driven savings secured by smart protocol technology. Build discipline and a verifiable financial reputation.",
    url: "https://savique-fb5p.vercel.app",
    siteName: "Savique",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://res.cloudinary.com/dibwnfwk9/image/upload/v1770464073/ChatGPT_Image_Feb_6__2026__07_08_19_AM-removebg-preview_tvlkzh.png",
        width: 1200,
        height: 630,
        alt: "Savique - Smart Savings Protocol",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Savique | Secure Digital Savings & Goals",
    description: "Secure your financial future with Savique. Smart Savings for disciplined wealth building.",
    creator: "@SaviqueApp",
    images: ["https://res.cloudinary.com/dibwnfwk9/image/upload/v1770464073/ChatGPT_Image_Feb_6__2026__07_08_19_AM-removebg-preview_tvlkzh.png"],
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
    apple: "/favicon.ico",
  },
  verification: {
    google: "9kwTXYiVS0JqYGiaeAurG8sAycV-s15TzQ6KOsFa4TA",
  },
  category: "Finance",
  alternates: {
    canonical: "https://savique-fb5p.vercel.app",
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
