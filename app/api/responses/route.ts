import { NextRequest } from 'next/server';
import { auth } from "@/auth";
import { getLlmConfigByProvider, completeEndpoint } from '@/app/utils/llms';
import { isUserWithinQuota } from '../completions/actions';
import proxyStream from './proxyStream';
import proxyNonStream from './proxyNonStream';
// Vercel Hobby 默认 10s，最大 60
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const userId = session.user.id;
  try {
    // 获取原始请求的 headers
    const userRequestHeaders = req.headers;
    const xProvider = userRequestHeaders.get('X-Provider') || ''; //必填
    const xModel = decodeURIComponent(userRequestHeaders.get('X-Model') || '');       //必填
    const xChatId = userRequestHeaders.get('X-Chat-Id');           //对话时必填，测试时不需要
    const xEndpoint = userRequestHeaders.get('X-Endpoint');        //选填，测试 URL 时需要

    const isUserWithinQuotaResult = await isUserWithinQuota(userId, xProvider, xModel);
    if (!isUserWithinQuotaResult.tokenPassFlag) {
      return new Response(JSON.stringify({ error: 'Out of quota' }), {
        status: 459,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isUserWithinQuotaResult.modelPassFlag) {
      return new Response(JSON.stringify({ error: 'Model not allowed' }), {
        status: 428,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { endpoint, apikey, apiStyle } = await getLlmConfigByProvider(xProvider || 'openai');
    // 测试连接下，会传 X-apikey，优先使用
    
    const realApikey = userRequestHeaders.get('X-Apikey') || apikey;
    let realEndpoint = '';
    if (xEndpoint) {
      // 如有有自定义，优先用传过来的自定义，用户测试
      realEndpoint = await completeEndpoint(xProvider as string, apiStyle, xEndpoint);
    } else {
      realEndpoint = await completeEndpoint(xProvider as string, apiStyle, endpoint);
    }
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
    });
    headers.set('Authorization', `Bearer ${realApikey}`);

    // 获取请求体
    const body = await req.text();
    const parsedBody = JSON.parse(body);

    // 检查是否需要流式响应
    const isStreamMode = parsedBody?.stream === true;
    const response = await fetch(realEndpoint, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    // 检查响应是否成功
    if (!response.ok) {
      const errorData = await response.text();
      return new Response(errorData, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const messageInfo = {
      chatId: xChatId || undefined,
      model: parsedBody?.model || xModel,
      userId: userId,
      providerId: xProvider!
    };

    // 根据 stream 字段决定响应模式
    if (isStreamMode) {
      // 流式响应模式
      return proxyStream(response, messageInfo);
    } else {
      // 非流式响应模式
      return proxyNonStream(response, messageInfo);
    }


  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

