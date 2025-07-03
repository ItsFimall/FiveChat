import { Switch } from 'antd';
import useMcpServerStore from '@/app/store/mcp';

const McpServerSelect = (props: { chat_id?: string }) => {
  const { mcpServers, changeMcpServerSelect } = useMcpServerStore();

  return (
    <div className='flex flex-col p-2 w-72'>
      <h3 className="font-bold pb-3 border-b">MCP 服务器</h3>
      {
        mcpServers.map((server) => {
          return <div key={server.name} className='flex flex-row justify-between py-2 border-b'>
            <div className='flex flex-col '>
              <span className=''>{server.name}</span>
              <span className='text-gray-500 text-xs'>{server.description}</span>
            </div>
            <div className="flex items-center justify-center">
              <Switch
                size='small'
                checked={server.selected}
                onChange={(checked) => { changeMcpServerSelect(server.name, checked) }} />
            </div>
          </div>
        })
      }
    </div>
  )
}

export default McpServerSelect
