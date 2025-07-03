'use server';
import { MCPTool, MCPServer } from '@/types/llm';
import mcpService from '@/app/services/MCPService';
import { mcpServers } from '@/app/db/schema';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { MCPError, MCPErrorFactory, MCPErrorHandler } from '@/types/errorTypes';

export async function callMCPTool(tool: MCPTool): Promise<any> {
  try {
    // 查询服务器信息
    const server = await db.query.mcpServers.findFirst({
      where: eq(mcpServers.name, tool.serverName),
    });

    if (!server) {
      throw MCPErrorFactory.serverNotFound(tool.serverName);
    }

    // 检查服务器是否激活
    if (!server.isActive) {
      throw MCPErrorFactory.serverInactive(tool.serverName);
    }

    // 构建服务器信息
    const serverInfo: MCPServer = {
      name: server.name,
      description: server.description || undefined,
      type: server.type || 'sse',
      baseUrl: server.baseUrl,
      isActive: true,
    };

    // 调用MCP工具
    const toolInfo = {
      name: tool.name,
      args: tool.inputSchema,
    };

    const result = await mcpService.callTool({
      server: serverInfo,
      ...toolInfo
    });

    return result;

  } catch (error) {
    // 统一错误处理
    let mcpError: MCPError;

    if (MCPErrorHandler.isMCPError(error)) {
      mcpError = error;
    } else {
      mcpError = MCPErrorHandler.fromError(error as Error, {
        serverName: tool.serverName,
        toolName: tool.name,
        args: tool.inputSchema
      });
    }

    // 记录错误日志
    MCPErrorHandler.logError(mcpError);

    // 对于某些错误类型，我们仍然返回错误响应而不是抛出异常
    // 这样可以保持与现有UI的兼容性
    if (mcpError.code === 'SERVER_NOT_FOUND' ||
        mcpError.code === 'TOOL_NOT_FOUND' ||
        mcpError.code === 'SERVER_INACTIVE') {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: mcpError.toUserMessage()
          }
        ]
      };
    }

    // 对于其他错误（如超时、连接失败等），抛出异常让上层处理
    throw mcpError;
  }
}
