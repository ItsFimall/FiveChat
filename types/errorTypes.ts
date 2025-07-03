export class InvalidAPIKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAPIKeyError';
  }
}

export class OverQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverQuotaError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// 导出MCP相关错误类型
export * from './mcpErrors';