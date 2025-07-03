import { NextRequest } from 'next/server';

// 重试函数
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, timeout = 10000): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      console.warn(`钉钉API请求失败 (尝试 ${i + 1}/${maxRetries}):`, error.message);
      
      // 如果是最后一次重试，抛出错误
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('所有重试都失败了');
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const bodyParams = new URLSearchParams(body);
  const parsedBody = Object.fromEntries(bodyParams.entries());
  const { code } = parsedBody;
  
  try {
    // 获取 URL 参数
    const searchParams = req.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const clientSecret = searchParams.get('clientSecret');
    
    // 验证必要参数
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        errcode: 40001,
        errmsg: '缺少必要参数 clientId 或 clientSecret'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!code) {
      return new Response(JSON.stringify({
        errcode: 40002,
        errmsg: '缺少授权码 code'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const response = await fetchWithRetry(
      `https://api.dingtalk.com/v1.0/oauth2/userAccessToken`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          code,
          grantType: "authorization_code",
        })
      },
      3, // 最多重试3次
      15000 // 15秒超时
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('钉钉API返回错误:', response.status, errorData);
      
      return new Response(JSON.stringify({
        errcode: response.status,
        errmsg: `钉钉API请求失败: ${errorData.errmsg || response.statusText}`,
        details: errorData
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('成功获取钉钉访问令牌');
    
    // 调整为默认的 Auth.js 规范要求
    const enhancedData = {
      access_token: data.accessToken,
      expires_in: data.expireIn,
      refresh_token: data.refreshToken,
      token_type: 'Bearer',
    };
    
    return new Response(JSON.stringify(enhancedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('钉钉代理请求失败:', error);
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = '服务器内部错误';
    let errorCode = 50000;
    
    if (error.name === 'AbortError') {
      errorMessage = '请求超时，请检查网络连接后重试';
      errorCode = 50001;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = '无法连接到钉钉服务器，请稍后重试';
      errorCode = 50002;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '网络连接超时，请检查网络后重试';
      errorCode = 50003;
    }
    
    return new Response(JSON.stringify({
      errcode: errorCode,
      errmsg: errorMessage,
      details: {
        error: error.message,
        code: error.code,
        syscall: error.syscall
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
