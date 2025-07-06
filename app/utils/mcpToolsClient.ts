'use client';
import { MCPTool } from '@/types/llm';
import { Tool, ToolUnion, ToolUseBlock } from '@anthropic-ai/sdk/resources'
import { ChatCompletionTool, ChatCompletionMessageToolCall } from 'openai/resources';
import { FunctionCall, FunctionDeclaration, SchemaType, FunctionDeclarationSchema, Tool as geminiTool } from '@google/generative-ai'
import { ResponseFunctionToolCall, FunctionTool } from 'openai/resources/responses/responses';

const supportedAttributes = [
  'type',
  'nullable',
  'required',
  'description',
  'properties',
  'items',
  'enum',
  'anyOf'
]

function filterPropertieAttributes(tool: MCPTool, filterNestedObj = false) {
  const properties = tool.inputSchema.properties
  if (!properties) {
    return {}
  }
  const getSubMap = (obj: Record<string, any>, keys: string[]): Record<string, any> => {
    const filtered = Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)))

    if (filterNestedObj) {
      return {
        ...filtered,
        ...(obj.type === 'object' && obj.properties
          ? {
            properties: Object.fromEntries(
              Object.entries(obj.properties).map(([k, v]) => [
                k,
                (v as any).type === 'object' ? getSubMap(v as Record<string, any>, keys) : v
              ])
            )
          }
          : {}),
        ...(obj.type === 'array' && obj.items?.type === 'object'
          ? {
            items: getSubMap(obj.items, keys)
          }
          : {})
      }
    }

    return filtered
  }

  for (const [key, val] of Object.entries(properties)) {
    properties[key] = getSubMap(val, supportedAttributes)
  }
  return properties
}

export function mcpToolsToOpenAIResponseTools(mcpTools: MCPTool[]): FunctionTool[] {
  return mcpTools.map((tool) => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    strict: null,
    parameters: {
      type: 'object',
      properties: filterPropertieAttributes(tool)
    }
  }))
}

export function mcpToolsToOpenAITools(mcpTools: MCPTool[]): ChatCompletionTool[] {
  return mcpTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: filterPropertieAttributes(tool)
      }
    }
  }))
}

export function mcpToolsToAnthropicTools(mcpTools: MCPTool[]): Array<ToolUnion> {
  return mcpTools.map((tool) => {
    const t: Tool = {
      name: tool.id,
      description: tool.description,
      // @ts-ignore no check
      input_schema: { ...(tool.inputSchema), type: 'object' }
    }
    return t
  })
}

export function anthropicToolUseToMcpTool(mcpTools: MCPTool[] | undefined, toolUse: ToolUseBlock): MCPTool | undefined {
  if (!mcpTools) return undefined
  const tool = mcpTools.find((tool) => tool.id === toolUse.name)
  if (!tool) {
    return undefined
  }
  // @ts-ignore ignore type as it it unknow
  tool.inputSchema = toolUse.input
  // use this to parse the arguments and avoid parsing errors
  try {
    tool.inputSchema = JSON.parse(toolUse.input as string)
  } catch (e) {
    console.error('Error parsing arguments', e)
  }
  return tool
}

export function openAIResponseToolsToMcpTool(
  mcpTools: MCPTool[] | undefined,
  llmTool: ResponseFunctionToolCall
): MCPTool | undefined {
  if (!mcpTools) return undefined
  const tool = mcpTools.find((tool) => tool.name === llmTool.name)
  if (!tool) {
    return undefined
  }
  // use this to parse the arguments and avoid parsing errors
  let args: any = {}
  try {
    args = JSON.parse(llmTool.arguments)
  } catch (e) {
    console.error('Error parsing arguments', e)
  }

  return {
    id: tool.id,
    serverName: tool.serverName,
    name: tool.name,
    description: tool.description,
    inputSchema: args
  }
}

export function openAIToolsToMcpTool(
  mcpTools: MCPTool[] | undefined,
  llmTool: ChatCompletionMessageToolCall
): MCPTool | undefined {
  if (!mcpTools) return undefined
  const tool = mcpTools.find((tool) => tool.name === llmTool.function.name)
  if (!tool) {
    return undefined
  }
  // use this to parse the arguments and avoid parsing errors
  let args: any = {}
  try {
    args = JSON.parse(llmTool.function.arguments)
  } catch (e) {
    console.error('Error parsing arguments', e)
  }

  return {
    id: tool.id,
    serverName: tool.serverName,
    name: tool.name,
    description: tool.description,
    inputSchema: args
  }
}

export function mcpToolsToGeminiTools(mcpTools: MCPTool[] | undefined): geminiTool[] {
  if (!mcpTools || mcpTools.length === 0) {
    // No tools available
    return []
  }
  const functions: FunctionDeclaration[] = []

  for (const tool of mcpTools) {
    const properties = filterPropertieAttributes(tool, true)
    const functionDeclaration: FunctionDeclaration = {
      name: tool.id,
      description: tool.description,
      ...(Object.keys(properties).length > 0
        ? {
          parameters: {
            type: SchemaType.OBJECT,
            properties
          }
        }
        : {}) as FunctionDeclarationSchema
    }
    functions.push(functionDeclaration)
  }
  const tool: geminiTool = {
    functionDeclarations: functions
  }
  return [tool]
}

export function geminiFunctionCallToMcpTool(
  mcpTools: MCPTool[] | undefined,
  fcall: FunctionCall | undefined
): MCPTool | undefined {
  if (!fcall) return undefined
  if (!mcpTools) return undefined
  const tool = mcpTools.find((tool) => tool.id === fcall.name)
  if (!tool) {
    return undefined
  }
  // @ts-ignore schema is not a valid property
  tool.inputSchema = fcall.args
  return tool
}