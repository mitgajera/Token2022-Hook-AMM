'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Token } from '@/types/token';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Expanded token registry with many common SPL tokens
const KNOWN_TOKENS: Record<string, { symbol: string, name: string }> = {
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk' },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade Staked SOL' },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'stSOL', name: 'Lido Staked SOL' },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium' },
  'AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB': { symbol: 'GST', name: 'Green Satoshi Token' },
  // Add any specific token you see in your wallet here
};

export function useTokens() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { symbol: string, name: string }>>({});

  // Fetch token list from token registry only once
  useEffect(() => {
    async function fetchTokenList() {
      try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
        const data = await response.json();
        
        const metadata: Record<string, { symbol: string, name: string }> = {};
        data.tokens.forEach((token: any) => {
          metadata[token.address] = {
            symbol: token.symbol,
            name: token.name
          };
        });
        
        setTokenMetadata({...KNOWN_TOKENS, ...metadata});
      } catch (error) {
        console.error('Failed to fetch token list:', error);
        setTokenMetadata(KNOWN_TOKENS);
      }
    }
    
    fetchTokenList();
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      fetchTokenBalances();
    } else {
      setTokens([]);
    }
  }, [connected, publicKey]);

  const fetchTokenBalances = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    setLoading(true);
    try {
      // 1. Fetch SOL balance
      const balance = await connection.getBalance(publicKey);
      const solToken = {
        address: 'So11111111111111111111111111111111111111112',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
        balance: (balance / LAMPORTS_PER_SOL).toFixed(4),
        usdValue: '0.00'
      };
      
      // 2. Fetch SPL token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      
      // 3. Map to Token objects
      const tokenList = tokenAccounts.value
        .filter(item => {
          const data = item.account.data.parsed.info;
          return parseFloat(data.tokenAmount.uiAmount) > 0;
        })
        .map(item => {
          const data = item.account.data.parsed.info;
          const mintAddress = data.mint;
          
          // First check our expanded metadata, fall back to abbreviated address if not found
          const info = tokenMetadata[mintAddress] || KNOWN_TOKENS[mintAddress] || {
            symbol: mintAddress.substring(0, 4),
            name: `${mintAddress.substring(0, 4)}...${mintAddress.substring(mintAddress.length - 4)}`
          };
          
          return {
            address: mintAddress,
            name: info.name,
            symbol: info.symbol,
            decimals: data.tokenAmount.decimals,
            balance: data.tokenAmount.uiAmount.toFixed(4),
            usdValue: '0.00'
          };
        });
      
      setTokens([solToken, ...tokenList]);
    } catch (error) {
      console.error('Error fetching token balances:', error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, tokenMetadata]);

  const fetchTokenMetadata = async (mintAddress: string) => {
    try {
      // Try to fetch token metadata from on-chain (if available)
      const metaplexConnection = connection;
      const mintPublicKey = new PublicKey(mintAddress);
      
      // Try to get token metadata using Metaplex
      const tokenMetadata = await metaplexConnection.getAccountInfo(mintPublicKey);
      
      // If we can't get metadata from Metaplex, check the known tokens
      if (!tokenMetadata || !tokenMetadata.data) {
        return KNOWN_TOKENS[mintAddress] || {
          symbol: mintAddress.substring(0, 4),
          name: `${mintAddress.substring(0, 4)}...${mintAddress.substring(mintAddress.length - 4)}`
        };
      }
      
      // Return structured metadata
      return {
        symbol: tokenMetadata.data.symbol || mintAddress.substring(0, 4),
        name: tokenMetadata.data.name || mintAddress
      };
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return {
        symbol: mintAddress.substring(0, 4),
        name: mintAddress
      };
    }
  };

  return { tokens, loading, refetch: fetchTokenBalances };
}