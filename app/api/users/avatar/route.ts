import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

// 获取用户当前的emoji头像
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResults = await db
      .select({ avatarEmoji: users.avatarEmoji })
      .from(users)
      .where(eq(users.email, session.user.email));

    if (userResults.length === 0) {
      return NextResponse.json({ emoji: null });
    }

    return NextResponse.json({ emoji: userResults[0].avatarEmoji || null });
  } catch (error) {
    console.error('Error fetching user avatar:', error);
    return NextResponse.json({ error: 'Failed to fetch user avatar' }, { status: 500 });
  }
}

// 更新用户的emoji头像
export async function PUT(req: NextRequest) {
  try {
    const { emoji } = await req.json();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db
      .update(users)
      .set({ avatarEmoji: emoji })
      .where(eq(users.email, session.user.email));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user avatar:', error);
    return NextResponse.json({ error: 'Failed to update user avatar' }, { status: 500 });
  }
} 