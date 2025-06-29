import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/app/db';
import { messages, chats } from '@/app/db/schema';
import { eq, and, desc, count, lt } from 'drizzle-orm';

// Force this route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 items per page
    const offset = page * limit;

    const chatId = params.chatId;

    // Verify chat ownership
    const chat = await db.query.chats.findFirst({
      where: and(
        eq(chats.id, chatId),
        eq(chats.userId, session.user.id)
      ),
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get total count for pagination
    const [totalCountResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.chatId, chatId));

    const totalCount = totalCountResult?.count || 0;

    // Fetch messages with pagination and optimized query
    const messageList = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: [desc(messages.createdAt)],
      limit: limit,
      offset: offset,
      columns: {
        id: true,
        role: true,
        content: true,
        reasoninContent: true,
        model: true,
        providerId: true,
        type: true,
        searchEnabled: true,
        webSearch: true,
        searchStatus: true,
        mcpTools: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        errorType: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Reverse to get chronological order (oldest first)
    const orderedMessages = messageList.reverse();

    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      messages: orderedMessages,
      totalCount,
      hasMore,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optimized endpoint for getting recent messages only
export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lastMessageId, limit = 20 } = await req.json();
    const chatId = params.chatId;

    // Verify chat ownership
    const chat = await db.query.chats.findFirst({
      where: and(
        eq(chats.id, chatId),
        eq(chats.userId, session.user.id)
      ),
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    let whereCondition = eq(messages.chatId, chatId);

    // If lastMessageId is provided, get messages after that ID
    if (lastMessageId) {
      const lastId = parseInt(lastMessageId);
      if (!isNaN(lastId)) {
        whereCondition = and(
          eq(messages.chatId, chatId),
          lt(messages.id, lastId) // Get messages with ID less than lastMessageId (older messages)
        )!; // Non-null assertion since we know both conditions are valid
      }
    }

    const messageList = await db.query.messages.findMany({
      where: whereCondition,
      orderBy: [desc(messages.createdAt)],
      limit: Math.min(limit, 50), // Max 50 recent messages
      columns: {
        id: true,
        role: true,
        content: true,
        reasoninContent: true,
        model: true,
        providerId: true,
        type: true,
        searchEnabled: true,
        webSearch: true,
        searchStatus: true,
        mcpTools: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        errorType: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Reverse to get chronological order
    const orderedMessages = messageList.reverse();

    return NextResponse.json({
      messages: orderedMessages,
      count: orderedMessages.length
    });

  } catch (error) {
    console.error('Error fetching recent messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
