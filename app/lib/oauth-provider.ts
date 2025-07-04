import { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

export interface CustomOAuthProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
  image?: string;
}

export interface CustomOAuthConfig {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope?: string;
}

export function createCustomOAuthProvider(config: CustomOAuthConfig): OAuthConfig<CustomOAuthProfile> {
  return {
    id: config.id,
    name: config.name,
    type: "oauth",
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: {
      url: config.authorizationUrl,
      params: {
        scope: config.scope || "openid email profile",
        response_type: "code",
      },
    },
    token: config.tokenUrl,
    userinfo: config.userInfoUrl,
    profile(profile: CustomOAuthProfile) {
      return {
        id: profile.id,
        name: profile.name || profile.email,
        email: profile.email,
        image: profile.avatar_url || profile.picture || profile.image || null,
      };
    },
  };
}

// 预定义的常见OAuth提供商配置模板
export const oauthProviderTemplates = {
  github: {
    name: "GitHub",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scope: "user:email",
  },
  google: {
    name: "Google",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scope: "openid email profile",
  },
  discord: {
    name: "Discord",
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    scope: "identify email",
  },
  gitlab: {
    name: "GitLab",
    authorizationUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    userInfoUrl: "https://gitlab.com/api/v4/user",
    scope: "read_user",
  },
  microsoft: {
    name: "Microsoft",
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    scope: "openid email profile",
  },
};
