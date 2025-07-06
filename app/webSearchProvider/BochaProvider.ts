import { WebSearchProvider, WebSearchResult, WebSearchResponse } from '@/types/search';
import BaseWebSearchProvider from './BaseWebSearchProvider'

interface WebPageItem {
  id: string;
  name: string;
  url: string;
  displayUrl: string;
  snippet: string;
  summary: string;
  siteName: string;
  siteIcon: string;
  datePublished: string;
  dateLastCrawled: string;
  cachedPageUrl: string;
  language: string;
  isFamilyFriendly: boolean | null;
  isNavigational: boolean | null;
}

export default class BochaProvider extends BaseWebSearchProvider {
  private apiKey: string

  constructor(provider: WebSearchProvider) {
    super(provider)
    if (!provider.apiKey) {
      throw new Error('API key is required for Bocha provider')
    }
    this.apiKey = provider.apiKey;
  }

  public async search(query: string, maxResults: number, excludeDomains: string[]): Promise<WebSearchResponse> {
    try {
      if (!query.trim()) {
        throw new Error('Search query cannot be empty')
      }

      if (maxResults <= 0) {
        throw new Error('maxResults must be a positive number')
      }

      const url = 'https://api.bochaai.com/v1/web-search';
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          query: query,
          count: maxResults,
          summary: true,
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Search failed: ${errorData}`);
      }

      const responseData = await response.json();
      
      if (!responseData?.data?.webPages?.value) {
        return {
          query: query,
          results: []
        };
      }

      const resultDataFormatted = responseData.data.webPages.value.map((item: WebPageItem) => ({
        title: item.name,
        content: item.summary,
        url: item.url,
      }));

      return {
        query: query,
        results: resultDataFormatted
      };
      
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Bocha search failed: ${error.message}`);
      }
      throw new Error('Bocha search failed due to an unknown error');
    }
  }
}