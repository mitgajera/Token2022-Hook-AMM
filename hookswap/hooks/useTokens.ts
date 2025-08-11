'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Token } from '@/types/token';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Enhanced token registry with real Solana tokens
const KNOWN_TOKENS: Record<string, { symbol: string, name: string, decimals: number, logoURI?: string }> = {
  'So11111111111111111111111111111111111111112': { 
    symbol: 'SOL', 
    name: 'Solana', 
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { 
    symbol: 'USDT', 
    name: 'Tether USD', 
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
  },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { 
    symbol: 'BONK', 
    name: 'Bonk', 
    decimals: 5,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png'
  },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { 
    symbol: 'mSOL', 
    name: 'Marinade Staked SOL', 
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png'
  },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { 
    symbol: 'stSOL', 
    name: 'Lido Staked SOL', 
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png'
  },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { 
    symbol: 'RAY', 
    name: 'Raydium', 
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png'
  },
  'AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB': { 
    symbol: 'GST', 
    name: 'Green Satoshi Token', 
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB/logo.png'
  },
  // Devnet tokens
  'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBkSqJ2K6Xp4KkcqrU': { 
    symbol: 'USDC-Dev', 
    name: 'USD Coin (Devnet)', 
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  },
  '7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs': { 
    symbol: 'USDT-Dev', 
    name: 'Tether USD (Devnet)', 
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
  }
};

export function useTokens() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { symbol: string, name: string, decimals: number, logoURI?: string }>>({});

  // Fetch token list from multiple sources for better coverage
  useEffect(() => {
    async function fetchTokenList() {
      try {
        // Try to fetch from Solana token list
        const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
        const data = await response.json();
        
        const metadata: Record<string, { symbol: string, name: string, decimals: number, logoURI?: string }> = {};
        data.tokens.forEach((token: any) => {
          metadata[token.address] = {
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals || 6,
            logoURI: token.logoURI
          };
        });
        
        // Add locally stored hooked tokens metadata
        try {
          const hookedTokens = JSON.parse(localStorage.getItem('hookedTokens') || '[]');
          hookedTokens.forEach((token: any) => {
            metadata[token.mint] = {
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals || 6,
              logoURI: token.logoURI
            };
          });
        } catch (error) {
          console.error('Error parsing hooked tokens from localStorage:', error);
        }
        
        setTokenMetadata({...KNOWN_TOKENS, ...metadata});
      } catch (error) {
        console.error('Failed to fetch token list:', error);
        
        // Fallback to known tokens + local hooked tokens
        try {
          const hookedTokens = JSON.parse(localStorage.getItem('hookedTokens') || '[]');
          const localMetadata: Record<string, { symbol: string, name: string, decimals: number, logoURI?: string }> = {};
          hookedTokens.forEach((token: any) => {
            localMetadata[token.mint] = {
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals || 6,
              logoURI: token.logoURI
            };
          });
          setTokenMetadata({...KNOWN_TOKENS, ...localMetadata});
        } catch (localError) {
          console.error('Error parsing hooked tokens from localStorage:', localError);
          setTokenMetadata(KNOWN_TOKENS);
        }
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
      const solToken: Token = {
        address: 'So11111111111111111111111111111111111111112',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
        balance: (balance / LAMPORTS_PER_SOL).toFixed(4),
        usdValue: '0.00',
        logoURI: KNOWN_TOKENS['So11111111111111111111111111111111111111112']?.logoURI
      };
      
      // 2. Fetch SPL token accounts (both Token and Token-2022)
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID })
      ]);
      
      // 3. Combine and map to Token objects
      const allTokenAccounts = [...tokenAccounts.value, ...token2022Accounts.value];
      
      const tokenList: Token[] = allTokenAccounts
        .filter(item => {
          // uiAmount is number | null in web3 types; guard against null
          const data = item.account.data.parsed.info as {
            tokenAmount: { uiAmount: number | null };
          };
          const uiAmount = data.tokenAmount.uiAmount ?? 0;
          return uiAmount > 0;
        })
        .map(item => {
          const data = item.account.data.parsed.info as {
            mint: string;
            tokenAmount: { decimals: number; uiAmount: number | null };
          };
          const mintAddress = data.mint;

          // Get token info from our metadata
          const info = tokenMetadata[mintAddress] || KNOWN_TOKENS[mintAddress];

          // If we have metadata, use it; otherwise create a readable fallback
          const tokenInfo = info || {
            symbol: mintAddress.substring(0, 6) + '...',
            name: `Token ${mintAddress.substring(0, 6)}...`,
            decimals: data.tokenAmount.decimals || 6
          };

          const uiAmount = data.tokenAmount.uiAmount ?? 0;

          return {
            address: mintAddress,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            balance: uiAmount.toFixed(4),
            usdValue: '0.00',
            logoURI: info?.logoURI
          };
        });

      // Add hooked tokens from localStorage (ensure Token shape)
      try {
        const hookedTokensStr = localStorage.getItem('hookedTokens') || '[]';
        const hookedTokens: Array<{ mint: string; name: string; symbol: string; decimals?: number; logoURI?: string }> =
          JSON.parse(hookedTokensStr);

        const hookedTokenList: Token[] = hookedTokens.map(token => {
          const existingToken = tokenList.find(t => t.address === token.mint);
          if (existingToken) return existingToken;

          return {
            address: token.mint,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals ?? 9,
            balance: '0',
            usdValue: '0.00',
            logoURI: token.logoURI
          };
        });

        // Combine SOL token, regular tokens, and hooked tokens, removing duplicates by address
        const allTokens: Token[] = [
          solToken,
          ...tokenList,
          ...hookedTokenList.filter((ht: Token) => !tokenList.some(t => t.address === ht.address))
        ];

        setTokens(allTokens);
      } catch (e) {
        console.error('Error loading hooked tokens:', e);
        setTokens([solToken, ...tokenList]);
      }
    } catch (error) {
      console.error('Error fetching token balances:', error);
      // Set at least SOL token as fallback
      const fallbackSolToken: Token = {
        address: 'So11111111111111111111111111111111111111112',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
        balance: '0.00',
        usdValue: '0.00',
        logoURI: KNOWN_TOKENS['So11111111111111111111111111111111111111112']?.logoURI
      };
      setTokens([fallbackSolToken]);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, tokenMetadata]);

  const fetchTokenMetadata = async (mintAddress: string) => {
    try {
      const mintPublicKey = new PublicKey(mintAddress);

      if (KNOWN_TOKENS[mintAddress]) {
        return KNOWN_TOKENS[mintAddress];
      }

      try {
        const onChainMetadata = await connection.getAccountInfo(mintPublicKey);
        if (onChainMetadata && onChainMetadata.data) {
          return {
            symbol: mintAddress.substring(0, 6) + '...',
            name: `Token ${mintAddress.substring(0, 6)}...`,
            decimals: 6
          };
        }
      } catch (error) {
        console.log('Could not fetch on-chain metadata for:', mintAddress);
      }
      
      // Return fallback
      return {
        symbol: mintAddress.substring(0, 6) + '...',
        name: `Token ${mintAddress.substring(0, 6)}...`,
        decimals: 6
      };
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return {
        symbol: mintAddress.substring(0, 6) + '...',
        name: `Token ${mintAddress.substring(0, 6)}...`,
        decimals: 6
      };
    }
  };

  return { tokens, loading, refetch: fetchTokenBalances };
}