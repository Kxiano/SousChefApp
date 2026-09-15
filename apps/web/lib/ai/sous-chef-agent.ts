import { prisma } from '@sous-chef/db'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { tool } from '@langchain/core/tools'
import { createAgent } from 'langchain'
import { z } from 'zod'

type SousChefContext = { restaurantId: string; profileId: string }

const SYSTEM_PROMPT = `You are the Sous Chef AI Assistant for a restaurant kitchen. You are speaking with a kitchen team member. Be helpful, concise, and professional.

You have tools to manage inventory, recipes, portions, sales, shifts, and team notifications. 
- ALWAYS resolve names to IDs (e.g. recipeId, ingredientId, profileId) before performing actions that require them by using the 'get_recipes', 'get_inventory', or 'get_team_members' tools.
- Never expose restaurant IDs, profile IDs, recipe IDs, or any other internal identifiers to the user. Refer to them by name.
- If a tool reports an error, explain it gracefully and suggest a clear next step.
- Before recording a sale, discard, or schedule change, confirm the details when ambiguous.`

const positiveWholeNumber = z.number().int().describe('A positive whole number > 0')

/** Creates a request-scoped agent so tenant identifiers remain server-only. */
export function createSousChefAgent({ restaurantId, profileId }: SousChefContext) {
  const tools = [
    tool(async () => {
      const ingredients = await prisma.ingredient.findMany({
        where: { restaurantId },
        select: { id: true, name: true, quantity: true, unit: true, lowStockThreshold: true },
      })
      return ingredients.map((ingredient) => ({ id: ingredient.id, name: ingredient.name, quantity: Number(ingredient.quantity), unit: ingredient.unit, isLowStock: Number(ingredient.quantity) <= Number(ingredient.lowStockThreshold) }))
    }, { name: 'get_inventory', description: 'Get the current inventory levels of all kitchen ingredients, including their IDs.', schema: z.object({}) }),
    tool(async () => prisma.recipe.findMany({ where: { restaurantId }, select: { id: true, name: true, yieldPortions: true } }), {
      name: 'get_recipes', description: 'Get kitchen recipes. Use this to find a recipe ID before using another recipe tool.', schema: z.object({}),
    }),
    tool(async ({ recipeId, portions }) => {
      const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, restaurantId }, include: { ingredients: { include: { ingredient: true } } } })
      if (!recipe) return { error: 'Recipe not found.' }
      const requirements = recipe.ingredients.map((recipeIngredient) => {
        const required = Number(recipeIngredient.quantityPerPortion) * portions
        const available = Number(recipeIngredient.ingredient.quantity)
        return { ingredient: recipeIngredient.ingredient.name, required, available, unit: recipeIngredient.ingredient.unit, isShort: available < required }
      })
      return { recipeName: recipe.name, portions, requirements, hasShortage: requirements.some((requirement) => requirement.isShort) }
    }, {
      name: 'calculate_recipe_ingredients', description: 'Calculate required ingredients and shortages for a recipe and number of portions.', schema: z.object({ recipeId: z.string().uuid(), portions: positiveWholeNumber }),
    }),
    tool(async ({ recipeId, quantity, type }) => {
      const result = await prisma.$transaction(async (tx) => {
        const recipe = await tx.recipe.findFirst({ where: { id: recipeId, restaurantId }, select: { id: true, name: true } })
        if (!recipe) return { error: 'Recipe not found.' }
        const portions = await tx.readyPortion.findFirst({ where: { recipeId, restaurantId }, select: { id: true, quantity: true } })
        if (!portions || Number(portions.quantity) < quantity) return { error: `There are not enough ready portions of ${recipe.name} to record this.` }
        await tx.readyPortion.update({ where: { id: portions.id }, data: { quantity: { decrement: quantity } } })
        await tx.salesEvent.create({ data: { restaurantId, recipeId, quantity, eventType: type, createdById: profileId, source: 'ai_assistant' } })
        return { success: true, recipeName: recipe.name }
      })
      return 'error' in result ? result : { success: true, message: `Recorded ${quantity} portions of ${result.recipeName} as ${type}.` }
    }, {
      name: 'record_sale', description: 'Record a sale or discard of ready recipe portions.', schema: z.object({ recipeId: z.string().uuid(), quantity: positiveWholeNumber, type: z.enum(['sold', 'discarded']) }),
    }),
    tool(async ({ recipeId, quantity }) => {
      const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, restaurantId }, select: { id: true, name: true } })
      if (!recipe) return { error: 'Recipe not found.' }
      const existing = await prisma.readyPortion.findFirst({ where: { recipeId, restaurantId }, select: { id: true } })
      if (existing) await prisma.readyPortion.update({ where: { id: existing.id }, data: { quantity: { increment: quantity } } })
      else await prisma.readyPortion.create({ data: { restaurantId, recipeId, quantity } })
      return { success: true, message: `Added ${quantity} portions of ${recipe.name} to the ready portions.` }
    }, {
      name: 'add_ready_portions', description: "Add completed portions of a recipe to the kitchen's ready portions.", schema: z.object({ recipeId: z.string().uuid(), quantity: positiveWholeNumber }),
    }),
    
    // NEW TOOLS
    tool(async ({ recipeId }) => {
      const recipe = await prisma.recipe.findFirst({
        where: { id: recipeId, restaurantId },
        include: { ingredients: { include: { ingredient: true } } }
      });
      if (!recipe) return { error: 'Recipe not found.' };
      const ingredients = recipe.ingredients.map(ri => ({
        name: ri.ingredient.name,
        quantityPerPortion: Number(ri.quantityPerPortion),
        unit: ri.ingredient.unit,
        costPerUnit: ri.ingredient.costPerUnit ? Number(ri.ingredient.costPerUnit) : null
      }));
      return { recipeName: recipe.name, yieldPortions: recipe.yieldPortions, ingredients };
    }, {
      name: 'get_recipe_details',
      description: 'Get detailed ingredients, quantities per portion, and unit costs for a recipe. Use to calculate cost per portion.',
      schema: z.object({ recipeId: z.string().uuid() }),
    }),

    tool(async ({ startDate, endDate, eventType }) => {
      const events = await prisma.salesEvent.findMany({
        where: {
          restaurantId,
          eventType,
          recordedAt: { gte: new Date(startDate), lte: new Date(endDate) }
        },
        include: { recipe: { select: { name: true } } }
      });
      const aggregated = events.reduce((acc, event) => {
        const name = event.recipe.name;
        acc[name] = (acc[name] || 0) + Number(event.quantity);
        return acc;
      }, {} as Record<string, number>);
      return { eventType, startDate, endDate, totals: aggregated };
    }, {
      name: 'get_sales_report',
      description: 'Get aggregated sales or discard reports over a date range. startDate and endDate must be ISO strings.',
      schema: z.object({ startDate: z.string(), endDate: z.string(), eventType: z.enum(['sold', 'discarded']) }),
    }),

    tool(async ({ ingredientId, quantityChange }) => {
      const ingredient = await prisma.ingredient.findFirst({ where: { id: ingredientId, restaurantId } });
      if (!ingredient) return { error: 'Ingredient not found.' };
      const newQuantity = Number(ingredient.quantity) + quantityChange;
      if (newQuantity < 0) return { error: `Cannot reduce stock below 0. Current stock is ${ingredient.quantity}.` };
      await prisma.ingredient.update({ where: { id: ingredientId }, data: { quantity: newQuantity } });
      return { success: true, message: `Inventory for ${ingredient.name} updated. New quantity is ${newQuantity} ${ingredient.unit}.` };
    }, {
      name: 'update_inventory',
      description: 'Directly add or remove inventory quantity for a specific ingredient. Use a negative quantityChange to remove.',
      schema: z.object({ ingredientId: z.string().uuid(), quantityChange: z.number().describe('Positive to add, negative to remove') }),
    }),

    tool(async () => {
      const profiles = await prisma.profile.findMany({ where: { restaurantId }, select: { id: true, displayName: true, role: true } });
      return profiles;
    }, {
      name: 'get_team_members',
      description: 'Get a list of team members in the restaurant to find their profile IDs.',
      schema: z.object({}),
    }),

    tool(async ({ startDate, endDate, profileId }) => {
      const shifts = await prisma.shift.findMany({
        where: {
          restaurantId,
          ...(profileId ? { profileId } : {}),
          startsAt: { gte: new Date(startDate) },
          endsAt: { lte: new Date(endDate) }
        },
        include: { profile: { select: { displayName: true } } }
      });
      return shifts.map(s => ({
        id: s.id,
        teamMember: s.profile?.displayName || 'Unassigned',
        profileId: s.profileId,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        roleLabel: s.roleLabel,
        notes: s.notes
      }));
    }, {
      name: 'get_shifts',
      description: 'Get staff shifts within a date range (ISO strings). Optionally filter by profileId.',
      schema: z.object({ startDate: z.string(), endDate: z.string(), profileId: z.string().uuid().optional() }),
    }),

    tool(async ({ action, shiftId, profileId, startsAt, endsAt, roleLabel, notes }) => {
      if (action === 'create') {
        if (!profileId || !startsAt || !endsAt) return { error: 'profileId, startsAt, and endsAt are required to create a shift.' };
        const shift = await prisma.shift.create({ data: { restaurantId, profileId, startsAt: new Date(startsAt), endsAt: new Date(endsAt), roleLabel, notes } });
        return { success: true, message: 'Shift created successfully.', shiftId: shift.id };
      } else if (action === 'update') {
        if (!shiftId) return { error: 'shiftId is required to update a shift.' };
        const shift = await prisma.shift.findFirst({ where: { id: shiftId, restaurantId } });
        if (!shift) return { error: 'Shift not found.' };
        await prisma.shift.update({
          where: { id: shiftId },
          data: {
            profileId: profileId || undefined,
            startsAt: startsAt ? new Date(startsAt) : undefined,
            endsAt: endsAt ? new Date(endsAt) : undefined,
            roleLabel: roleLabel !== undefined ? roleLabel : undefined,
            notes: notes !== undefined ? notes : undefined
          }
        });
        return { success: true, message: 'Shift updated successfully.' };
      } else if (action === 'delete') {
        if (!shiftId) return { error: 'shiftId is required to delete a shift.' };
        await prisma.shift.deleteMany({ where: { id: shiftId, restaurantId } });
        return { success: true, message: 'Shift deleted successfully.' };
      }
      return { error: 'Invalid action.' };
    }, {
      name: 'manage_shift',
      description: 'Create, update, or delete a shift. Provide shiftId for update/delete. Dates must be ISO strings.',
      schema: z.object({
        action: z.enum(['create', 'update', 'delete']),
        shiftId: z.string().uuid().optional(),
        profileId: z.string().uuid().optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
        roleLabel: z.string().optional(),
        notes: z.string().optional()
      }),
    }),

    tool(async ({ content, isUrgent }) => {
      await prisma.note.create({
        data: { restaurantId, authorId: profileId, content, isUrgent: !!isUrgent }
      });
      return { success: true, message: 'Notification/Note created successfully.' };
    }, {
      name: 'create_notification',
      description: 'Create a notification/note for the team.',
      schema: z.object({ content: z.string(), isUrgent: z.boolean().optional() }),
    }),
  ]

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('Gemini API key is not configured.')

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 1024,
  })
  return createAgent({ model, tools, systemPrompt: SYSTEM_PROMPT, name: 'sous_chef' })
}
