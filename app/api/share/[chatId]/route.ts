import { db } from '@/app/db'
import { chats, messages } from '@/app/db/schema'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

async function getSharedChat(chatId: string) {
  return await db.query.chats.findFirst({
    where: and(
      eq(chats.id, chatId),
      eq(chats.isShared, true),
      or(isNull(chats.shareExpiresAt), gt(chats.shareExpiresAt, new Date()))
    ),
  })
}

// Get shared chat info (without messages)
export async function GET(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const { chatId } = params
  if (!chatId) {
    return new Response('Missing chatId', { status: 400 })
  }

  try {
    const chat = await getSharedChat(chatId);

    if (!chat) {
      return new Response('Chat not found or sharing has expired', {
        status: 404,
      })
    }

    const hasPassword = !!chat.sharePassword
    // Do not return messages here, only chat info
    return NextResponse.json({
      ...chat,
      hasPassword,
    })
  } catch (error) {
    console.error('Failed to fetch shared chat:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

// Verify password and get full chat content
export async function POST(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const { chatId } = params
  if (!chatId) {
    return new Response('Missing chatId', { status: 400 })
  }

  const body = await req.json()
  const { password } = body

  try {
    const chat = await getSharedChat(chatId);

    if (!chat) {
      return new Response('Chat not found or sharing has expired', {
        status: 404,
      })
    }
    
    // If chat has a password, verify it
    if (chat.sharePassword) {
      const isValid = await bcrypt.compare(password, chat.sharePassword)
      if (!isValid) {
        return new Response('Incorrect password', { status: 403 })
      }
    }

    // Password is correct or not required, return full chat with messages
    const chatMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    return NextResponse.json({ ...chat, messages: chatMessages })

  } catch (error) {
    console.error('Failed to fetch shared chat with password:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 