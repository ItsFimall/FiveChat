import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport, SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport, StreamableHTTPClientTransportOptions } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { MCPServer, MCPTool } from '@/types/llm';
import { MCPErrorFactory, MCPErrorHandler } from '@/types/errorTypes';

class MCPService {
  private clients: Map<string, Client> = new Map()
  private initialized = false

  constructor() {
    if (this.initialized) return;
    this.initialized = true
  }

  public async initClient(server: MCPServer): Promise<Client> {
    const existingClient = this.clients.get(server.name);
    if (existingClient) {
      try {
        // Check if the existing client is still connected
        const pingResult = await existingClient.ping()
        console.info(`[MCP] Ping result for ${server.name}:`, pingResult)
        if (!pingResult) {
          this.clients.delete(server.name)
        } else {
          return existingClient
        }
      } catch (error) {
        console.error(`[MCP] Error pinging server ${server.name}:`, error)
        this.clients.delete(server.name);
      }
    }

    const client = new Client({ name: 'Hivechat', version: '0.1.0' }, { capabilities: {} })
    let transport: SSEClientTransport | StreamableHTTPClientTransport;
    try {
      if (server.type === 'streamableHttp') {
        const options: StreamableHTTPClientTransportOptions = {}
        transport = new StreamableHTTPClientTransport(new URL(server.baseUrl!), options)
      } else {
        const options: SSEClientTransportOptions = {
          requestInit: {}
        }
        transport = new SSEClientTransport(new URL(server.baseUrl!), options)
      }
      await client.connect(transport);
      this.clients.set(server.name, client)

      console.info(`[MCP] Activated server: ${server.name}`)
      return client;
    } catch (error: any) {
      // 使用统一的错误处理
      const mcpError = MCPErrorFactory.connectionFailed(server.name, error);
      MCPErrorHandler.logError(mcpError);
      throw mcpError;
    }
  }

  async closeClient(serverName: string) {
    const client = this.clients.get(serverName)
    if (client) {
      await client.close()
      console.info(`[MCP] Closed server: ${serverName}`)
      this.clients.delete(serverName)
      console.info(`[MCP] Cleared cache for server: ${serverName}`)
    } else {
      console.warn(`[MCP] No client found for server: ${serverName}`)
    }
  }

  async stopServer(server: MCPServer) {
    console.info(`[MCP] Stopping server: ${server.name}`)
    await this.closeClient(server.name)
  }

  async removeServer(server: MCPServer) {
    const existingClient = this.clients.get(server.name)
    if (existingClient) {
      await this.closeClient(server.name)
    }
  }

  async restartServer(server: MCPServer) {
    console.info(`[MCP] Restarting server: ${server.name}`)
    await this.closeClient(server.name)
    await this.initClient(server)
  }

  public deactivate(serverName: string) {
    this.closeClient(serverName)
  }

  public deleteServer(serverName: string) {
    this.closeClient(serverName)
  }

  async listTools(server: MCPServer): Promise<MCPTool[]> {
    console.info(`[MCP] Listing tools for server: ${server.name}`)

    try {
      const client = await this.initClient(server);

      // 使用Promise.race()实现超时控制
      // 由于MCP SDK不支持AbortSignal，这是目前最佳的超时实现方案
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(MCPErrorFactory.connectionTimeout(server.name));
        }, 20000); // 20秒超时
      });

      const listToolsPromise = client.listTools();

      // 竞争执行：工具列表获取 vs 超时
      const { tools } = await Promise.race([
        listToolsPromise,
        timeoutPromise
      ]);

      const serverTools: MCPTool[] = []
      tools.map((tool: any) => {
        const serverTool: MCPTool = {
          ...tool,
          id: tool.name,
          serverName: server.name
        }
        serverTools.push(serverTool)
      })
      return serverTools
    } catch (error) {
      // 使用统一的错误处理
      if (MCPErrorHandler.isMCPError(error)) {
        MCPErrorHandler.logError(error);
        console.log(`[MCP] Failed to list tools for server: ${server.name} - ${error.toUserMessage()}`);
        return [];
      }

      const mcpError = MCPErrorHandler.fromError(error as Error, { serverName: server.name });
      MCPErrorHandler.logError(mcpError);
      console.log(`[MCP] Failed to list tools for server: ${server.name}`, error);
      return [];
    }
  }
  /**
   * Call a tool on an MCP server
   */
  public async callTool({ server, name, args }: { server: MCPServer; name: string; args: any }): Promise<any> {
    try {
      console.info('[MCP] Calling:', server.name, name, args);
      const client = await this.initClient(server);

      // 使用Promise.race()实现真正的超时控制
      // 由于MCP SDK不支持AbortSignal，这是目前最佳的超时实现方案
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(MCPErrorFactory.toolCallTimeout(name, server.name));
        }, 60000); // 60秒超时
      });

      const callToolPromise = client.callTool({ name, arguments: args });

      // 竞争执行：工具调用 vs 超时
      const result = await Promise.race([
        callToolPromise,
        timeoutPromise
      ]);

      return result;
    } catch (error) {
      // 使用统一的错误处理
      if (MCPErrorHandler.isMCPError(error)) {
        MCPErrorHandler.logError(error);
        throw error;
      }

      // 处理其他类型的错误
      const mcpError = MCPErrorHandler.fromError(error as Error, {
        serverName: server.name,
        toolName: name,
        args
      });
      MCPErrorHandler.logError(mcpError);
      throw mcpError;
    }
  }
}
const mcpServiceInstance = new MCPService();
export default mcpServiceInstance;