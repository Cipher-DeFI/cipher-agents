import axios from 'axios';
import { ethers } from 'ethers';
import { IAgentRuntime } from '@elizaos/core';
import { WalletTransaction, TokenBalance } from '../types';

export class BlockchainDataService {
  private etherscanApiKey: string;
  private moralisApiKey: string;
  private alchemyApiKey: string;
  
  constructor(runtime: IAgentRuntime) {
    this.etherscanApiKey = runtime.getSetting('ETHERSCAN_API_KEY') || '';
    this.moralisApiKey = runtime.getSetting('MORALIS_API_KEY') || '';
    this.alchemyApiKey = runtime.getSetting('ALCHEMY_API_KEY') || '';
  }

  async getWalletTransactions(walletAddress: string, chain: 'ETH' | 'AVAX' = 'ETH'): Promise<WalletTransaction[]> {
    try {
      if (chain === 'ETH' && this.etherscanApiKey) {
        return await this.getEthereumTransactions(walletAddress);
      }
      
      if (chain === 'AVAX') {
        return await this.getAvalancheTransactions(walletAddress);
      }
      
      if (this.moralisApiKey) {
        return await this.getMoralisTransactions(walletAddress, chain);
      }
      
      if (chain === 'ETH' && this.alchemyApiKey) {
        return await this.getAlchemyTransactions(walletAddress);
      }
      
      throw new Error(`No API keys configured for ${chain} chain`);
    } catch (error) {
      console.error(`Error fetching ${chain} transactions:`, error);
      throw error;
    }
  }

  async getAllChainsTransactions(walletAddress: string): Promise<WalletTransaction[]> {
    try {
      const [ethTransactions, avaxTransactions] = await Promise.allSettled([
        this.getWalletTransactions(walletAddress, 'ETH'),
        this.getWalletTransactions(walletAddress, 'AVAX')
      ]);
      
      const allTransactions: WalletTransaction[] = [];
      
      if (ethTransactions.status === 'fulfilled') {
        allTransactions.push(...ethTransactions.value);
      }
      
      if (avaxTransactions.status === 'fulfilled') {
        allTransactions.push(...avaxTransactions.value);
      }
      
      return allTransactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching multi-chain transactions:', error);
      return [];
    }
  }

  private async getEthereumTransactions(walletAddress: string): Promise<WalletTransaction[]> {
    const [normalTxResponse, erc20Response] = await Promise.all([
      axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'txlist',
          address: walletAddress,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.etherscanApiKey
        }
      }),
      axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'tokentx',
          address: walletAddress,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.etherscanApiKey
        }
      })
    ]);
    
    const transactions: WalletTransaction[] = [];
    
    if (normalTxResponse.data.status === '1') {
      transactions.push(...normalTxResponse.data.result.map((tx: any) => ({
        ...this.parseEtherscanTransaction(tx),
        chain: 'ETH' as const
      })));
    }
    
    if (erc20Response.data.status === '1') {
      transactions.push(...erc20Response.data.result.map((tx: any) => ({
        ...this.parseERC20Transaction(tx),
        chain: 'ETH' as const
      })));
    }
    
    return transactions;
  }

  private async getAvalancheTransactions(walletAddress: string): Promise<WalletTransaction[]> {
    const [normalTxResponse, erc20Response] = await Promise.all([
      axios.get('https://api.snowtrace.io/api', {
        params: {
          module: 'account',
          action: 'txlist',
          address: walletAddress,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
        }
      }),
      axios.get('https://api.snowtrace.io/api', {
        params: {
          module: 'account',
          action: 'tokentx',
          address: walletAddress,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
        }
      })
    ]);
    
    const transactions: WalletTransaction[] = [];
    
    if (normalTxResponse.data.status === '1') {
      transactions.push(...normalTxResponse.data.result.map((tx: any) => ({
        ...this.parseEtherscanTransaction(tx),
        chain: 'AVAX' as const
      })));
    }
    
    if (erc20Response.data.status === '1') {
      transactions.push(...erc20Response.data.result.map((tx: any) => ({
        ...this.parseERC20Transaction(tx),
        chain: 'AVAX' as const
      })));
    }
    
    return transactions;
  }

  private async getMoralisTransactions(walletAddress: string, chain: 'ETH' | 'AVAX'): Promise<WalletTransaction[]> {
    const chainMap = {
      'ETH': 'eth',
      'AVAX': 'avalanche'
    };
    
    const response = await axios.get(`https://deep-index.moralis.io/api/v2/${walletAddress}`, {
      headers: {
        'X-API-Key': this.moralisApiKey
      },
      params: {
        chain: chainMap[chain],
        limit: 100
      }
    });
    
    return response.data.result.map((tx: any) => ({
      ...this.parseMoralisTransaction(tx),
      chain
    }));
  }

  private async getAlchemyTransactions(walletAddress: string): Promise<WalletTransaction[]> {
    const response = await axios.post(
      `https://eth-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromAddress: walletAddress,
          category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
          withMetadata: true,
          excludeZeroValue: false,
          maxCount: '0x3e8'
        }]
      }
    );
    
    return response.data.result.transfers.map((tx: any) => ({
      ...this.parseAlchemyTransaction(tx),
      chain: 'ETH' as const
    }));
  }

  async getTokenBalances(walletAddress: string, chain: 'ETH' | 'AVAX' = 'ETH'): Promise<TokenBalance[]> {
    try {
      if (this.moralisApiKey) {
        const chainMap = {
          'ETH': 'eth',
          'AVAX': 'avalanche'
        };
        
        const response = await axios.get(
          `https://deep-index.moralis.io/api/v2/${walletAddress}/erc20`,
          {
            headers: {
              'X-API-Key': this.moralisApiKey
            },
            params: {
              chain: chainMap[chain]
            }
          }
        );
        
        return response.data.map((token: any) => ({
          tokenAddress: token.token_address,
          tokenSymbol: token.symbol,
          tokenName: token.name,
          tokenDecimals: token.decimals,
          balance: token.balance,
          value: token.usd_value,
          chain
        }));
      }
      
      if (chain === 'ETH' && this.alchemyApiKey) {
        const response = await axios.post(
          `https://eth-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`,
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenBalances',
            params: [walletAddress]
          }
        );
        
        return this.parseAlchemyTokenBalances(response.data.result, chain);
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching ${chain} token balances:`, error);
      return [];
    }
  }

  async getAllChainsTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
    const [ethBalances, avaxBalances] = await Promise.allSettled([
      this.getTokenBalances(walletAddress, 'ETH'),
      this.getTokenBalances(walletAddress, 'AVAX')
    ]);
    
    const allBalances: TokenBalance[] = [];
    
    if (ethBalances.status === 'fulfilled') {
      allBalances.push(...ethBalances.value);
    }
    
    if (avaxBalances.status === 'fulfilled') {
      allBalances.push(...avaxBalances.value);
    }
    
    return allBalances;
  }

  private parseEtherscanTransaction(tx: any): WalletTransaction {
    return {
      hash: tx.hash,
      timestamp: parseInt(tx.timeStamp) * 1000,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      isError: tx.isError === '1',
      methodId: tx.methodId,
      functionName: tx.functionName,
      chain: 'ETH'
    };
  }

  private parseERC20Transaction(tx: any): WalletTransaction {
    return {
      hash: tx.hash,
      timestamp: parseInt(tx.timeStamp) * 1000,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      tokenAddress: tx.contractAddress,
      tokenSymbol: tx.tokenSymbol,
      tokenDecimals: parseInt(tx.tokenDecimal),
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      isError: false,
      chain: 'ETH' // Will be overridden by caller
    };
  }

  private parseMoralisTransaction(tx: any): WalletTransaction {
    return {
      hash: tx.hash,
      timestamp: new Date(tx.block_timestamp).getTime(),
      from: tx.from_address,
      to: tx.to_address,
      value: tx.value,
      gasPrice: tx.gas_price,
      gasUsed: tx.receipt_gas_used,
      isError: false,
      chain: 'ETH' // Will be overridden by caller
    };
  }

  private parseAlchemyTransaction(tx: any): WalletTransaction {
    return {
      hash: tx.hash,
      timestamp: new Date(tx.metadata.blockTimestamp).getTime(),
      from: tx.from,
      to: tx.to,
      value: ethers.parseEther(tx.value || '0').toString(),
      tokenAddress: tx.rawContract?.address,
      tokenSymbol: tx.asset,
      tokenDecimals: tx.rawContract?.decimal,
      gasPrice: '0',
      gasUsed: '0',
      isError: false,
      chain: 'ETH'
    };
  }

  private async parseAlchemyTokenBalances(result: any, chain: 'ETH' | 'AVAX'): Promise<TokenBalance[]> {
    return result.tokenBalances.map((balance: any) => ({
      tokenAddress: balance.contractAddress,
      balance: balance.tokenBalance,
      tokenSymbol: '',
      tokenName: '',
      tokenDecimals: 0,
      chain
    }));
  }
}