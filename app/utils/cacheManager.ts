import React from 'react';

/**
 * 缓存管理工具
 * 用于优化数据获取和减少重复请求
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize = 100; // 最大缓存项数

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 创建全局缓存实例
export const globalCache = new CacheManager();

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup();
  }, 60000); // 每分钟清理一次
}

/**
 * 缓存装饰器函数
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = 5 * 60 * 1000
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    
    // 尝试从缓存获取
    const cached = globalCache.get(key);
    if (cached !== null) {
      return cached;
    }

    // 执行原函数
    const result = await fn(...args);
    
    // 缓存结果
    globalCache.set(key, result, ttl);
    
    return result;
  }) as T;
}

/**
 * React Hook 用于缓存数据
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    // 先检查缓存
    const cached = globalCache.get<T>(key);
    if (cached !== null) {
      setData(cached);
      return;
    }

    // 从网络获取
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      globalCache.set(key, result, ttl);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, ttl, fetcher]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}

export default CacheManager;
