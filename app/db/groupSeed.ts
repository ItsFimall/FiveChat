import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';
import { db } from './index';
import { groups, users } from './schema';
// 在数据库初始化时检查并创建默认分组
export async function createDefaultGroups() {
  const defaultGroup = await db.query.groups.findFirst({
    where: eq(groups.isDefault, true)
  });
  if (!defaultGroup) {
    await db.insert(groups).values({
      name: '默认分组',
      modelType: 'all',
      isDefault: true
    });
  };
}

async function setUserDefaultGroups() {
  const defaultGroup = await db.query.groups.findFirst({
    where: eq(groups.isDefault, true)
  });
  if (defaultGroup) {
    await db.update(users).set({
      groupId: defaultGroup.id,
    }).where(isNull(users.groupId));
  }
}

// 添加详细的错误处理
createDefaultGroups()
  .then(async () => {
    await setUserDefaultGroups();
  })
  .then(() => {
    console.log("Groups initialized successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Initialization failed:");
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  });