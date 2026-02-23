import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/web3-provider";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Midpoint Escrow",
  description: "Decentralized escrow dApp for freelancer payments on Polygon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="video" href="/midpoint-bg.mp4" type="video/mp4" />
      </head>
      <body className={`${poppins.variable} ${montserrat.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          Skip to main content
        </a>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
