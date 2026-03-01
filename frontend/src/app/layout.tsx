import type { CSSProperties, ReactNode } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import BgmController from "../figma/components/BgmController";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap"
});

export const metadata = {
  title: "沉浸式 IP 定制化教育 Agent",
  description: "面向 Gen Z/Alpha 的沉浸式英语学习体验"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body
        className={`${inter.className} ${playfair.className} min-h-screen bg-[#0B1021] text-[#F0F0F0]`}
        style={
          ({
            "--font-sans":
              "'Inter', 'PingFang SC', -apple-system, system-ui, sans-serif",
            "--font-serif": "'Playfair Display', 'STSong', serif"
          } as CSSProperties)
        }
      >
        {children}
        <BgmController />
      </body>
    </html>
  );
}
