import { BotType } from '@/app/db/schema';

const bots: BotType[] = [
  {
    title: "示例助手",
    desc: "这是一个示例机器人模板，您可以参考此格式创建自己的助手",
    prompt: `# Role
您的专业助手

## Profile
- author: 示例作者
- version: 1.0
- description: 这是一个示例机器人，展示如何创建自定义助手

## Background
请根据您的具体需求修改这个模板，创建适合您使用场景的专业助手。

## Goals
- 明确您希望助手完成的主要任务
- 定义助手的专业领域和能力范围
- 设置清晰的交互方式和工作流程

## Skills
- 列出助手需要具备的专业技能
- 定义助手的知识领域
- 描述助手的分析和解决问题的能力

## Constraints
- 设置助手的工作边界和限制
- 确保输出内容的准确性和专业性
- 遵守相关的伦理和法律规范

## Workflow
1. 了解用户的具体需求
2. 分析问题的关键要素
3. 提供专业的建议或解决方案
4. 与用户确认结果是否满足需求

## Initialization
您好！我是您的专业助手，请告诉我您需要什么帮助？`,
    avatarType: 'emoji',
    createdAt: Date.now(),
    creator: "system",
  },
];

export default bots;
