import { create } from 'zustand';
import { MCPServer, MCPTool } from '@/types/llm';

interface IGlobalMcpServerStore {
  hasUseMcp: boolean;
  hasMcpSelected: boolean;
  mcpServers: Array<MCPServer & { selected?: boolean }>;
  allTools: MCPTool[];
  selectedTools: MCPTool[];
  setHasMcpSelected: (hasMcpSelected: boolean) => void;
  setHasUseMcp: (hasUseMcp: boolean) => void;
  setMcpServers: (mcpServers: MCPServer[]) => void;
  changeMcpServerSelect: (name: string, selected: boolean) => void;
  setAllTools: (mcpTools: MCPTool[]) => void;
  clearAllSelect: () => void;
}

const useMcpServerStore = create<IGlobalMcpServerStore>((set) => ({
  hasUseMcp: false,
  hasMcpSelected: false,
  mcpServers: [],
  allTools: [],
  selectedTools: [],
  setHasMcpSelected: (hasMcpSelected: boolean) => {
    set({ hasMcpSelected });
  },
  setHasUseMcp: (hasUseMcp: boolean) => {
    set({ hasUseMcp });
  },
  setMcpServers: (mcpServers: MCPServer[]) => {
    set({ mcpServers });
  },
  setAllTools: (mcpTools: MCPTool[]) => {
    set({ allTools: mcpTools });
  },
  changeMcpServerSelect: (name: string, selected: boolean) => {
    set((state) => {
      const updatedServers = state.mcpServers.map((server) =>
        server.name === name ? { ...server, selected } : server
      );
      // 检查是否有任何服务器被选中
      const hasSelectedServer = updatedServers.some((server) => (server as MCPServer & { selected?: boolean }).selected);

      // 从 allTools 中筛选出属于被选中服务器的工具
      const updatedSelectedTools = state.allTools.filter((tool) => {
        return updatedServers.some((server) =>
          server.name === tool.serverName && server.selected
        );
      });

      return {
        mcpServers: updatedServers,
        hasMcpSelected: hasSelectedServer,
        selectedTools: updatedSelectedTools
      };
    });
  },
  clearAllSelect: () => {
    set((state) => ({
      mcpServers: state.mcpServers.map(server => ({ ...server, selected: false })),
      selectedTools: [],
      hasMcpSelected: false
    }));
  },

}))

export default useMcpServerStore
