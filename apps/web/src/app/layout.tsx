import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/components/web3-provider";

export const metadata: Metadata = {
  title: "ARC JumpCoin",
  description: "Pay-to-play blockchain game MVP on Arc"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
