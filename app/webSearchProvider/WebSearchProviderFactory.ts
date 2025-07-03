import { WebSearchProvider } from '@/types/search';

import BaseWebSearchProvider from './BaseWebSearchProvider';
import DefaultProvider from './DefaultProvider';
import TavilyProvider from './TavilyProvider';
import JinaProvider from './JinaProvider';
import BochaProvider from './BochaProvider';

export default class WebSearchProviderFactory {
  static create(provider: WebSearchProvider): BaseWebSearchProvider {
    switch (provider.id) {
      case 'tavily':
        return new TavilyProvider(provider);
      case 'bocha':
        return new BochaProvider(provider);
      case 'jina':
        return new JinaProvider(provider);
      default:
        return new DefaultProvider(provider);
    }
  }
}