"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import the WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function WalletButton() {
  // Fix hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-[180px] h-[40px] bg-gray-200 rounded"></div>;
  }

  return <WalletMultiButton />;
}