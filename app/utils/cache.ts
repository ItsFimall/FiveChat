// 内存缓存工具类
class MemoryCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // 默认5分钟TTL
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): T | null {
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

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 清理过期条目
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// 创建全局缓存实例
export const messageCache = new MemoryCache(200); // 缓存200个消息列表
export const chatCache = new MemoryCache(50);     // 缓存50个聊天信息
export const userCache = new MemoryCache(20);     // 缓存20个用户信息

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    messageCache.cleanup();
    chatCache.cleanup();
    userCache.cleanup();
  }, 60000); // 每分钟清理一次
}

// 浏览器存储工具
export class BrowserStorage {
  private static isAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  static setItem(key: string, value: any, useSession: boolean = false): boolean {
    const storageType = useSession ? 'sessionStorage' : 'localStorage';
    
    if (!this.isAvailable(storageType)) {
      return false;
    }

    try {
      const storage = window[storageType];
      storage.setItem(key, JSON.stringify({
        data: value,
        timestamp: Date.now()
      }));
      return true;
    } catch {
      return false;
    }
  }

  static getItem<T>(key: string, maxAge: number = 24 * 60 * 60 * 1000, useSession: boolean = false): T | null {
    const storageType = useSession ? 'sessionStorage' : 'localStorage';
    
    if (!this.isAvailable(storageType)) {
      return null;
    }

    try {
      const storage = window[storageType];
      const item = storage.getItem(key);
      
      if (!item) {
        return null;
      }

      const parsed = JSON.parse(item);
      
      // 检查是否过期
      if (Date.now() - parsed.timestamp > maxAge) {
        storage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }

  static removeItem(key: string, useSession: boolean = false): void {
    const storageType = useSession ? 'sessionStorage' : 'localStorage';
    
    if (this.isAvailable(storageType)) {
      window[storageType].removeItem(key);
    }
  }

  static clear(useSession: boolean = false): void {
    const storageType = useSession ? 'sessionStorage' : 'localStorage';
    
    if (this.isAvailable(storageType)) {
      window[storageType].clear();
    }
  }
}

// 缓存键生成工具
export const CacheKeys = {
  chatMessages: (chatId: string, page: number = 0) => `messages:${chatId}:${page}`,
  chatInfo: (chatId: string) => `chat:${chatId}`,
  userInfo: (userId: string) => `user:${userId}`,
  modelList: () => 'models:list',
  providerList: () => 'providers:list',
};

// 缓存装饰器（用于函数结果缓存）
export function cached<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = 5 * 60 * 1000
): T {
  const cache = new MemoryCache<ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);
    
    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result, ttl);
    return result;
  }) as T;
}

// 异步函数缓存装饰器
export function cachedAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = 5 * 60 * 1000
): T {
  const cache = new MemoryCache<Awaited<ReturnType<T>>>();

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    if (cached !== null) {
      return cached;
    }

    const result = await fn(...args);
    cache.set(key, result, ttl);
    return result;
  }) as T;
}
