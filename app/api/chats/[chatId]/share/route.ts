import { auth } from '@/auth'
import { db } from '@/app/db'
import { chats } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// Force this route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs'

export async function POST(
  req: Request,
  context: { params: { chatId: string } }
) {
  const session = await auth()
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { chatId } = context?.params || {}
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

    // Hash the share password if provided
    const hashedPassword = sharePassword ? await bcrypt.hash(sharePassword, 10) : null
    await db
      .update(chats)
      .set({
        isShared: true,
        sharePassword: hashedPassword,
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

export async function GET(
  req: Request,
  context: { params: { chatId: string } }
) {
  const session = await auth()
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  const { chatId } = context?.params || {}
  if (!chatId) {
    return new Response('Missing chatId', { status: 400 })
  }
  try {
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      columns: {
        isShared: true,
        userId: true
      }
    })
    if (!chat || chat.userId !== session.user.id) {
      return new Response('Chat not found or access denied', { status: 404 })
    }
    return NextResponse.json({ isShared: chat.isShared })
  }
  catch (error) {
    console.error('Failed to get chat share status:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: { params: { chatId: string } }
) {
  const session = await auth()
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  const { chatId } = context?.params || {}
  if (!chatId) {
    return new Response('Missing chatId', { status: 400 })
  }
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
        isShared: false,
        sharePassword: null,
        shareExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to unshare chat:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 