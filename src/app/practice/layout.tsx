import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Figtree, Fraunces } from "next/font/google";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-practice-display",
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-practice-body",
});

export const metadata: Metadata = {
  title: "Arhatic Yoga Practice",
  description:
    "Record daily Arhatic Yoga practices and send the group a weekly summary email.",
};

export default function PracticeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`${display.variable} ${body.variable} flex-1 bg-[#f4efe6] text-[#1c2430] font-[family-name:var(--font-practice-body)]`}
    >
      {children}
    </div>
  );
}
