'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';

export function WalletButton() {
  const { publicKey, disconnect, connected, connecting, disconnecting } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setIsOpen(false);
      toast.success('Address copied to clipboard');
    }
  };
  
  const handleChangeWallet = async () => {
    setIsOpen(false);
    
    try {
      // Disconnect current wallet
      await disconnect();
      
      // Wait a bit for disconnect to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Trigger the built-in wallet modal
      const walletButton = document.querySelector('.wallet-adapter-button-trigger') as HTMLElement;
      if (walletButton) {
        walletButton.click();
      } else {
        // Fallback: manually trigger wallet selection
        toast.success('Please select a new wallet from the browser extension');
      }
      
    } catch (error) {
      console.error('Error changing wallet:', error);
      toast.error('Failed to change wallet');
    }
  };
  
  const handleDisconnect = async () => {
    try {
      await disconnect();
      setIsOpen(false);
      toast.success('Wallet disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const handleConnectWallet = () => {
    // Trigger the built-in wallet modal
    const walletButton = document.querySelector('.wallet-adapter-button-trigger') as HTMLElement;
    if (walletButton) {
      walletButton.click();
    } else {
      // Fallback: show instructions
      toast.success('Please connect your wallet using the browser extension');
    }
  };
  
  // Show loading state while connecting
  if (connecting) {
    return (
      <Button 
        disabled
        className="bg-gradient-to-r from-purple-600 to-purple-500 transition-all duration-300 rounded-lg font-medium"
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }
  
  // Show loading state while disconnecting
  if (disconnecting) {
    return (
      <Button 
        disabled
        className="bg-gradient-to-r from-purple-600 to-purple-500 transition-all duration-300 rounded-lg font-medium"
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Disconnecting...
      </Button>
    );
  }
  
  if (!connected || !publicKey) {
    return (
      <>
        {/* Hidden wallet adapter button for modal functionality */}
        <div className="hidden">
          <WalletMultiButton />
        </div>
        
        <Button 
          onClick={handleConnectWallet}
          className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 transition-all duration-300 rounded-lg font-medium"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
      </>
    );
  }
  
  return (
    <>
      {/* Hidden wallet adapter button for modal functionality */}
      <div className="hidden">
        <WalletMultiButton />
      </div>
      
      <div className="relative" ref={menuRef}>
        <Button 
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 transition-all duration-300 rounded-lg font-medium"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </Button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-1 rounded-lg shadow-lg z-50">
            <div className="py-1">
              <button
                onClick={handleCopyAddress}
                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-md transition-colors"
              >
                Copy address
              </button>
              <button
                onClick={handleChangeWallet}
                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-md transition-colors"
              >
                Change wallet
              </button>
              <button
                onClick={handleDisconnect}
                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-md transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}