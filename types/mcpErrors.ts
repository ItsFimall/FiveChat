/**
 * MCP (Model Context Protocol) 错误处理类型定义
 * 提供统一的错误处理机制和错误分类
 */

/**
 * MCP错误代码枚举
 */
export enum MCPErrorCode {
  // 连接相关错误
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_LOST = 'CONNECTION_LOST',
  
  // 服务器相关错误
  SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',
  SERVER_INACTIVE = 'SERVER_INACTIVE',
  SERVER_UNAVAILABLE = 'SERVER_UNAVAILABLE',
  
  // 工具相关错误
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_CALL_TIMEOUT = 'TOOL_CALL_TIMEOUT',
  TOOL_CALL_FAILED = 'TOOL_CALL_FAILED',
  TOOL_INVALID_ARGS = 'TOOL_INVALID_ARGS',
  
  // 协议相关错误
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * MCP错误严重级别
 */
export enum MCPErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * MCP错误上下文信息
 */
export interface MCPErrorContext {
  serverName?: string;
  toolName?: string;
  args?: any;
  timestamp?: Date;
  requestId?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * 统一的MCP错误类
 */
export class MCPError extends Error {
  public readonly code: MCPErrorCode;
  public readonly severity: MCPErrorSeverity;
  public readonly context: MCPErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: Date;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    code: MCPErrorCode,
    options: {
      severity?: MCPErrorSeverity;
      context?: MCPErrorContext;
      originalError?: Error;
      isRetryable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.severity = options.severity || this.getDefaultSeverity(code);
    this.context = {
      timestamp: new Date(),
      ...options.context
    };
    this.originalError = options.originalError;
    this.timestamp = new Date();
    this.isRetryable = options.isRetryable ?? this.getDefaultRetryable(code);

    // 确保错误堆栈正确显示
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError);
    }
  }

  /**
   * 获取默认的错误严重级别
   */
  private getDefaultSeverity(code: MCPErrorCode): MCPErrorSeverity {
    switch (code) {
      case MCPErrorCode.CONNECTION_TIMEOUT:
      case MCPErrorCode.TOOL_CALL_TIMEOUT:
        return MCPErrorSeverity.MEDIUM;
      
      case MCPErrorCode.CONNECTION_FAILED:
      case MCPErrorCode.CONNECTION_LOST:
      case MCPErrorCode.SERVER_UNAVAILABLE:
        return MCPErrorSeverity.HIGH;
      
      case MCPErrorCode.SERVER_NOT_FOUND:
      case MCPErrorCode.TOOL_NOT_FOUND:
        return MCPErrorSeverity.CRITICAL;
      
      case MCPErrorCode.TOOL_INVALID_ARGS:
      case MCPErrorCode.SERIALIZATION_ERROR:
        return MCPErrorSeverity.MEDIUM;
      
      default:
        return MCPErrorSeverity.MEDIUM;
    }
  }

  /**
   * 获取默认的重试策略
   */
  private getDefaultRetryable(code: MCPErrorCode): boolean {
    switch (code) {
      case MCPErrorCode.CONNECTION_TIMEOUT:
      case MCPErrorCode.CONNECTION_LOST:
      case MCPErrorCode.TOOL_CALL_TIMEOUT:
      case MCPErrorCode.SERVER_UNAVAILABLE:
        return true;
      
      case MCPErrorCode.SERVER_NOT_FOUND:
      case MCPErrorCode.TOOL_NOT_FOUND:
      case MCPErrorCode.TOOL_INVALID_ARGS:
      case MCPErrorCode.PROTOCOL_ERROR:
        return false;
      
      default:
        return false;
    }
  }

  /**
   * 转换为用户友好的错误消息
   */
  public toUserMessage(): string {
    switch (this.code) {
      case MCPErrorCode.CONNECTION_TIMEOUT:
        return `连接 ${this.context.serverName || 'MCP服务器'} 超时，请稍后重试`;
      
      case MCPErrorCode.TOOL_CALL_TIMEOUT:
        return `工具 ${this.context.toolName || '调用'} 执行超时，请稍后重试`;
      
      case MCPErrorCode.SERVER_NOT_FOUND:
        return `MCP服务器 ${this.context.serverName || ''} 未找到`;

      case MCPErrorCode.SERVER_INACTIVE:
        return `MCP服务器 ${this.context.serverName || ''} 未激活`;

      case MCPErrorCode.TOOL_NOT_FOUND:
        return `工具 ${this.context.toolName || ''} 不存在`;
      
      case MCPErrorCode.SERVER_UNAVAILABLE:
        return `MCP服务器 ${this.context.serverName || ''} 暂时不可用`;
      
      case MCPErrorCode.TOOL_INVALID_ARGS:
        return `工具参数无效，请检查输入`;
      
      default:
        return `MCP操作失败: ${this.message}`;
    }
  }

  /**
   * 转换为JSON格式，用于日志记录
   */
  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * MCP错误工厂函数，用于快速创建常见错误
 */
export class MCPErrorFactory {
  static connectionTimeout(serverName: string, originalError?: Error): MCPError {
    return new MCPError(
      `Connection to MCP server '${serverName}' timed out`,
      MCPErrorCode.CONNECTION_TIMEOUT,
      {
        context: { serverName },
        originalError,
        isRetryable: true
      }
    );
  }

  static toolCallTimeout(toolName: string, serverName: string, originalError?: Error): MCPError {
    return new MCPError(
      `Tool call '${toolName}' on server '${serverName}' timed out`,
      MCPErrorCode.TOOL_CALL_TIMEOUT,
      {
        context: { toolName, serverName },
        originalError,
        isRetryable: true
      }
    );
  }

  static serverNotFound(serverName: string): MCPError {
    return new MCPError(
      `MCP server '${serverName}' not found`,
      MCPErrorCode.SERVER_NOT_FOUND,
      {
        context: { serverName },
        severity: MCPErrorSeverity.CRITICAL,
        isRetryable: false
      }
    );
  }

  static serverInactive(serverName: string): MCPError {
    return new MCPError(
      `MCP server '${serverName}' is not active`,
      MCPErrorCode.SERVER_INACTIVE,
      {
        context: { serverName },
        severity: MCPErrorSeverity.HIGH,
        isRetryable: false
      }
    );
  }

  static toolNotFound(toolName: string, serverName: string): MCPError {
    return new MCPError(
      `Tool '${toolName}' not found on server '${serverName}'`,
      MCPErrorCode.TOOL_NOT_FOUND,
      {
        context: { toolName, serverName },
        severity: MCPErrorSeverity.CRITICAL,
        isRetryable: false
      }
    );
  }

  static connectionFailed(serverName: string, originalError?: Error): MCPError {
    return new MCPError(
      `Failed to connect to MCP server '${serverName}'`,
      MCPErrorCode.CONNECTION_FAILED,
      {
        context: { serverName },
        originalError,
        severity: MCPErrorSeverity.HIGH,
        isRetryable: true
      }
    );
  }

  static toolCallFailed(toolName: string, serverName: string, originalError?: Error): MCPError {
    return new MCPError(
      `Tool call '${toolName}' failed on server '${serverName}'`,
      MCPErrorCode.TOOL_CALL_FAILED,
      {
        context: { toolName, serverName },
        originalError,
        isRetryable: false
      }
    );
  }

  static invalidArguments(toolName: string, args: any, originalError?: Error): MCPError {
    return new MCPError(
      `Invalid arguments for tool '${toolName}'`,
      MCPErrorCode.TOOL_INVALID_ARGS,
      {
        context: { toolName, args },
        originalError,
        isRetryable: false
      }
    );
  }

  static protocolError(message: string, context?: MCPErrorContext, originalError?: Error): MCPError {
    return new MCPError(
      `MCP protocol error: ${message}`,
      MCPErrorCode.PROTOCOL_ERROR,
      {
        context,
        originalError,
        severity: MCPErrorSeverity.HIGH,
        isRetryable: false
      }
    );
  }
}

/**
 * 错误处理工具函数
 */
export class MCPErrorHandler {
  /**
   * 判断错误是否为MCP错误
   */
  static isMCPError(error: any): error is MCPError {
    return error instanceof MCPError;
  }

  /**
   * 将普通错误转换为MCP错误
   */
  static fromError(error: Error, context?: MCPErrorContext): MCPError {
    if (MCPErrorHandler.isMCPError(error)) {
      return error;
    }

    // 根据错误消息判断错误类型
    if (error.message.includes('timeout') || error.name === 'AbortError') {
      return new MCPError(
        error.message,
        MCPErrorCode.CONNECTION_TIMEOUT,
        { originalError: error, context }
      );
    }

    if (error.message.includes('not found')) {
      return new MCPError(
        error.message,
        MCPErrorCode.SERVER_NOT_FOUND,
        { originalError: error, context }
      );
    }

    // 默认为未知错误
    return new MCPError(
      error.message,
      MCPErrorCode.UNKNOWN_ERROR,
      { originalError: error, context }
    );
  }

  /**
   * 记录MCP错误
   */
  static logError(error: MCPError, logger: Console = console): void {
    const logData = {
      timestamp: error.timestamp,
      code: error.code,
      severity: error.severity,
      message: error.message,
      context: error.context,
      isRetryable: error.isRetryable
    };

    switch (error.severity) {
      case MCPErrorSeverity.CRITICAL:
        logger.error('[MCP] CRITICAL ERROR:', logData);
        break;
      case MCPErrorSeverity.HIGH:
        logger.error('[MCP] HIGH ERROR:', logData);
        break;
      case MCPErrorSeverity.MEDIUM:
        logger.warn('[MCP] MEDIUM ERROR:', logData);
        break;
      case MCPErrorSeverity.LOW:
        logger.info('[MCP] LOW ERROR:', logData);
        break;
    }
  }
}
