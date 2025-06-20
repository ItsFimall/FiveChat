import { auth } from '@/auth'
import { db } from '@/app/db'
import { chats } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const session = await auth()
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { chatId } = params
  if (!chatId) {
    return new Response('Missing chatId', { status: 400 })
  }

  const body = await req.json()
  const { sharePassword, shareExpiresAt } = body

  try {
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    })

    if (!chat || chat.userId !== session.user.id) {
      return new Response('Chat not found or access denied', { status: 404 })
    }

    await db
      .update(chats)
      .set({
        isShared: true,
        sharePassword: sharePassword || null,
        shareExpiresAt: shareExpiresAt ? new Date(shareExpiresAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId))

    return NextResponse.json({ success: true, chatId })
  } catch (error) {
    console.error('Failed to share chat:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 