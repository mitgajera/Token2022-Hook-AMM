import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WalletProvider } from '@/components/wallet/WalletProvider';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HookSwap - DeFi with Transfer Hooks',
  description: 'Advanced DeFi trading platform powered by Solana transfer hooks',
  icons: {
    icon: [
      { url: '/waves-icon.svg', type: 'image/svg+xml' }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Force browser to use new favicon by adding a version parameter */}
        <link rel="icon" href="/waves-icon.svg?v=1" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico?v=1" sizes="any" />
      </head>
      <body className={inter.className}>
        <WalletProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}