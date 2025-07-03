import { WebSearchProvider, WebSearchResponse } from '@/types/search';
import WebSearchEngineProvider from '@/app/webSearchProvider/WebSearchEngineProvider';

class WebSearchService {
  public async search(provider: WebSearchProvider, query: string, maxResultsNumber?: number): Promise<WebSearchResponse> {
    const { searchWithTime, maxResults, excludeDomains } = { searchWithTime: true, maxResults: maxResultsNumber || 5, excludeDomains: [] }
    const webSearchEngine = new WebSearchEngineProvider(provider)

    try {
      return await webSearchEngine.search(query, maxResults, excludeDomains)
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async checkSearch(provider: WebSearchProvider): Promise<{ valid: boolean; error?: any }> {
    try {
      const response = await this.search(provider, 'test query', 1);
      // 优化的判断条件：检查结果是否有效且没有错误
      return { valid: response.results.length > 0, error: undefined }
    } catch (error) {
      return { valid: false, error }
    }
  }
}

const webSearchService = new WebSearchService();
export default webSearchService;