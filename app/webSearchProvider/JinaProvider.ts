import { WebSearchProvider, WebSearchResult, WebSearchResponse } from '@/types/search';

import BaseWebSearchProvider from './BaseWebSearchProvider'

export default class JinaProvider extends BaseWebSearchProvider {
  private apiKey: string

  constructor(provider: WebSearchProvider) {
    super(provider)
    if (!provider.apiKey) {
      throw new Error('API key is required for Tavily provider')
    }
    this.apiKey = provider.apiKey;
  }

  public async search(query: string, maxResults: number, excludeDomains: string[]): Promise<WebSearchResponse> {
    try {
      if (!query.trim()) {
        throw new Error('Search query cannot be empty')
      }

      const url = `https://s.jina.ai/?gl=CN&hl=zh-cn&num=${maxResults}&q=${query}`;
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Engine': 'direct',
      };

      const response = await fetch(url, { method: 'GET', headers: headers });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Search failed: ${errorData}`);
      }
      const responseData = await response.json();
      const result = {
        query: query,
        results: responseData.data as WebSearchResult[]
      }
      
      return result;
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}