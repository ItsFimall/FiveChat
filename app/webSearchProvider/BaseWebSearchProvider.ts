import { WebSearchProvider, WebSearchResponse } from '@/types/search';

export default abstract class BaseWebSearchProvider {
  private provider: WebSearchProvider
  constructor(provider: WebSearchProvider) {
    this.provider = provider
  }
  abstract search(query: string, maxResult: number, excludeDomains: string[]): Promise<WebSearchResponse>
}