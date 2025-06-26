import { handlers } from "@/auth" // Referring to the auth.ts we just created

// Force this route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs'

export const { GET, POST } = handlers