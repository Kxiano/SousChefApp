import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { z } from 'zod'

export const maxDuration = 30 // Allow up to 30 seconds for AI response

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) {
    return new Response('Unauthorized', { status: 401 })
  }

  const restaurantId = profile.restaurantId
  const { messages } = await req.json()

  // Save the incoming user message to the DB
  const lastMessage = messages[messages.length - 1]
  if (lastMessage && lastMessage.role === 'user') {
    await prisma.chatMessage.create({
      data: {
        restaurantId,
        profileId: profile.id,
        role: 'user',
        content: typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content),
      },
    })
  }

  const result = streamText({
    model: google('gemini-1.5-flash'),
    messages,
    system: `You are the Sous Chef AI Assistant for a restaurant kitchen. 
You are speaking with a kitchen team member. 
Be helpful, concise, and professional. 
You have access to tools to check inventory, calculate recipe ingredients, and record sales. 
Always use these tools when asked about stock levels or when asked to calculate or record something. 
Never expose the restaurant_id or internal UUIDs to the user; always use names.
If a tool returns an error, explain it gracefully to the user.`,
    tools: {
      get_inventory: {
        description: 'Get the current inventory levels of all ingredients in the kitchen.',
        inputSchema: z.object({}),
        execute: async () => {
          const ingredients = await prisma.ingredient.findMany({
            where: { restaurantId },
            select: { name: true, quantity: true, unit: true, lowStockThreshold: true },
          })
          return ingredients.map(i => ({
            name: i.name,
            quantity: Number(i.quantity),
            unit: i.unit,
            isLowStock: Number(i.quantity) <= Number(i.lowStockThreshold),
          }))
        },
      },
      get_recipes: {
        description: 'Get a list of all recipes available in the kitchen.',
        inputSchema: z.object({}),
        execute: async () => {
          const recipes = await prisma.recipe.findMany({
            where: { restaurantId },
            select: { id: true, name: true, yieldPortions: true },
          })
          return recipes
        },
      },
      calculate_recipe_ingredients: {
        description: 'Calculate the required ingredients for a specific recipe and portions.',
        inputSchema: z.object({
          recipeId: z.string().describe('The ID of the recipe'),
          portions: z.number().describe('The number of portions to calculate for'),
        }),
        execute: async ({ recipeId, portions }: { recipeId: string; portions: number }) => {
          const recipe = await prisma.recipe.findFirst({
            where: { id: recipeId, restaurantId },
            include: { ingredients: { include: { ingredient: true } } },
          })
          if (!recipe) return { error: 'Recipe not found' }

          const requirements = recipe.ingredients.map(ri => {
            const required = Number(ri.quantityPerPortion) * portions
            const available = Number(ri.ingredient.quantity)
            return {
              ingredient: ri.ingredient.name,
              required,
              available,
              unit: ri.ingredient.unit,
              isShort: available < required,
            }
          })
          const hasShortage = requirements.some(r => r.isShort)
          return { recipeName: recipe.name, portions, requirements, hasShortage }
        },
      },
      record_sale: {
        description: 'Record a sale or discard of a recipe portion.',
        inputSchema: z.object({
          recipeId: z.string().describe('The ID of the recipe'),
          quantity: z.number().describe('The number of portions'),
          type: z.enum(['sold', 'discarded']).describe('Whether the portion was sold or discarded'),
        }),
        execute: async ({ recipeId, quantity, type }: { recipeId: string; quantity: number; type: 'sold' | 'discarded' }) => {
          // Deduct from ready portions
          await prisma.readyPortion.updateMany({
            where: { recipeId, restaurantId },
            data: { quantity: { decrement: quantity } },
          })

          // Log the event
          await prisma.salesEvent.create({
            data: {
              restaurantId,
              recipeId,
              quantity,
              eventType: type,
              createdById: profile.id,
              source: 'ai_assistant',
            },
          })
          
          return { success: true, message: `Recorded ${quantity} portions as ${type}.` }
        },
      },
    },
    async onFinish({ text, toolCalls, toolResults }) {
      // Save the assistant's response to the DB
      await prisma.chatMessage.create({
        data: {
          restaurantId,
          profileId: profile.id,
          role: 'assistant',
          content: text || '',
          functionCalls: toolCalls?.length ? JSON.parse(JSON.stringify({ toolCalls, toolResults })) : null,
        },
      })
    },
  })

  return result.toTextStreamResponse()
}
