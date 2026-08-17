import { fileURLToPath } from 'node:url'
import { fetchLiveSheetData } from '../lib/googleSheets.js'

const chatbotMetadata = {
  id: 'nora',
  name: 'Nora',
  role: 'MCP Chatbot',
  description:
    'Answers project questions using a live MCP tool that reads the restaurant Google Sheets data.',
}

// We intentionally avoid using LLMs to fabricate answers.
// Nora must answer strictly from live data. OpenAI usage is disabled for deterministic replies.
const openai = null

function getText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  return String(value).trim()
}

function toMessageHistory(messages = []) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages
    .filter((message) => message && typeof message === 'object')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: getText(message.content),
    }))
    .filter((message) => message.content)
}

function buildFallbackReply(question, snapshot) {
  const lines = [
    snapshot.liveHighlights?.[0],
    snapshot.liveHighlights?.[1],
    snapshot.liveHighlights?.[2],
  ].filter(Boolean)

  const menuLine = snapshot.topMenuItems?.length
    ? `Use ${snapshot.topMenuItems.slice(0, 3).join(', ')} as the most concrete menu cues.`
    : 'The menu sheet is live, but no strong menu cues were detected.'

  const questionLine = question
    ? `For your question, the safest answer is to stay grounded in the live counts and the current agent handoffs.`
    : 'Ask a question about launches, customer signals, menu positioning, or the next workflow step.'

  return [
    lines.join(' '),
    menuLine,
    questionLine,
  ]
    .filter(Boolean)
    .join(' ')
}

async function loadLiveSnapshot(question) {
  const mcpServerPath = fileURLToPath(
    new URL('../mcp/serve.js', import.meta.url),
  )
  const backendRoot = fileURLToPath(
    new URL('..', import.meta.url),
  )

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [mcpServerPath],
    cwd: backendRoot,
    env: {
      ...getDefaultEnvironment(),
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '',
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  })

  const client = new Client(
    {
      name: 'tastemate-chatbot',
      version: '1.0.0',
    },
  )

  await client.connect(transport)

  try {
    const toolResult = await client.callTool({
      name: 'live_dashboard_snapshot',
      arguments: {
        question,
      },
    })

    if (toolResult.isError) {
      const errorText = Array.isArray(toolResult.content)
        ? toolResult.content
            .map((entry) => getText(entry?.text || entry?.content || entry))
            .filter(Boolean)
            .join(' ')
        : 'The MCP tool reported an error.'

      throw new Error(errorText)
    }

    const snapshot =
      toolResult.structuredContent ||
      (() => {
        const firstText = Array.isArray(toolResult.content)
          ? getText(toolResult.content[0]?.text)
          : ''

        if (!firstText) {
          return {}
        }

        try {
          return JSON.parse(firstText)
        } catch {
          return { raw: firstText }
        }
      })()

    return {
      toolName: 'live_dashboard_snapshot',
      snapshot,
    }
  } finally {
    await transport.close()
  }
}

export async function getChatbotReply({ message, messages = [] } = {}) {
  const question = getText(message)

  if (!question) {
    throw new Error('A chat message is required.')
  }

  const history = toMessageHistory(messages)

  // Load full live sheet data for deterministic lookups
  let liveData = null
  let snapshot = {}
  let toolName = 'live_dashboard_snapshot'

  try {
    // load snapshot via MCP tool for metadata
    const loaded = await loadLiveSnapshot(question)
    snapshot = loaded.snapshot || {}
  } catch (err) {
    snapshot = {}
  }

  try {
    liveData = await fetchLiveSheetData(process.env.GOOGLE_SHEET_ID || '')
  } catch (err) {
    liveData = { customers: [], menu: [], orders: [], feedback: [] }
  }

  // Deterministic answer helpers
  function findCustomerById(id) {
    if (!id) return null
    const needle = String(id).trim().toLowerCase()
    for (const row of liveData.customers || []) {
      for (const value of Object.values(row || {})) {
        if (String(value || '').trim().toLowerCase() === needle) {
          return row
        }
      }
    }
    return null
  }

  function findMenuItemsByKeyword(keyword) {
    if (!keyword) return []
    const k = String(keyword).trim().toLowerCase()
    const matches = []
    for (const row of liveData.menu || []) {
      for (const value of Object.values(row || {})) {
        if (String(value || '').toLowerCase().includes(k)) {
          matches.push(row)
          break
        }
      }
    }
    return matches
  }

  function getMenuItemName(row) {
    if (!row || typeof row !== 'object') return ''
    const nameKeys = ['name', 'item', 'title', 'dish', 'menu_item', 'menuitem']
    for (const k of nameKeys) {
      if (k in row && String(row[k] || '').trim()) return String(row[k]).trim()
    }
    // fallback to first non-empty value
    for (const v of Object.values(row || {})) {
      if (String(v || '').trim()) return String(v).trim()
    }
    return ''
  }

  function findMenuItemsByCuisine(cuisine) {
    if (!cuisine) return []

    // broaden matching with known synonyms and fuzzy contains
    const synonyms = {
      indian: ['indian', 'north indian', 'south indian', 'tandoori', 'masala', 'curry', 'butter chicken'],
      'south indian': ['south indian', 'southindian', 'dosa', 'idli', 'sambar', 'vada', 'chettinad', 'andhra', 'kerala'],
      italian: ['italian', 'pizza', 'pasta', 'risotto', 'carbonara', 'margherita'],
      chinese: ['chinese', 'szechuan', 'sichuan', 'cantonese', 'dimsum', 'manchurian', 'hakka'],
      thai: ['thai', 'pad thai', 'green curry'],
      japanese: ['japanese', 'sushi', 'ramen', 'udon', 'tempura'],
      mediterranean: ['mediterranean', 'greek', 'mezze'],
    }

    function fuzzyMatchText(text, tokens) {
      if (!text) return false
      const t = String(text).toLowerCase()
      for (const tok of tokens) {
        if (t.includes(tok)) return true
      }
      return false
    }

    const c = String(cuisine).trim().toLowerCase()
    const tokens = synonyms[c] || [c]
    const matches = []

    for (const row of liveData.menu || []) {
      for (const [k, v] of Object.entries(row || {})) {
        const key = String(k).toLowerCase()
        const val = String(v || '').toLowerCase()

        // check cuisine-like keys first
        if (key.includes('cuisine') || key.includes('cuis') || key.includes('category') || key.includes('tags') || key.includes('style')) {
          if (fuzzyMatchText(val, tokens)) {
            matches.push(row)
            break
          }
        }

        // check any field for token presence
        if (fuzzyMatchText(val, tokens)) {
          matches.push(row)
          break
        }
      }
    }

    return matches
  }

  // Basic question parsing
  const custIdMatch = question.match(/\b(C\d{1,6})\b/i)
  const asksCuisine = /cuisine|preference|what (do they )?like|recommend/i.test(question)
  const cuisineMatch = question.match(/\b(indian|italian|south ?indian|chinese|thai|japanese|mediterranean|greek)\b/i)
  const asksVegetarian = /vegetarian|veg\b|vegan|plant[- ]?based|veggie|no meat/i.test(question)
  const asksMenu = /menu|menu items|which menu items|which dishes|items are/i.test(question)

  let reply = ''

  // Customer-specific queries
  if (custIdMatch && asksCuisine) {
    const cid = custIdMatch[1]
    const customer = findCustomerById(cid)
    if (customer) {
      // try to find a cuisine-like field
      const keys = Object.keys(customer)
      let cuisine = ''
      for (const key of keys) {
        if (/cuisine|food|preference|pref/i.test(key)) {
          cuisine = String(customer[key] || '').trim()
          if (cuisine) break
        }
      }

      if (cuisine) {
        reply = `${cid}'s preferred cuisine is ${cuisine}.`
      } else {
        reply = "I couldn't find that information in the available TasteMate data."
      }
    } else {
      reply = "I couldn't find that information in the available TasteMate data."
    }
  } else if (asksVegetarian || (asksMenu && asksVegetarian)) {
    // Find vegetarian menu items by searching menu rows for 'vegetarian' or dietary tags
    const vegItems = []
    for (const row of liveData.menu || []) {
      // check obvious fields
      for (const [k, v] of Object.entries(row || {})) {
        const key = String(k).toLowerCase()
        const val = String(v || '').toLowerCase()
        if (key.includes('diet') || key.includes('tags') || key.includes('labels') || key.includes('category')) {
          if (val.includes('vegetarian') || val.includes('veg') || val.includes('vegan')) {
            vegItems.push(row)
            break
          }
        }
        if (val.includes('vegetarian') || val.includes('veg') || val.includes('vegan')) {
          vegItems.push(row)
          break
        }
      }
    }

    if (vegItems.length > 0) {
      const names = vegItems.map((r) => getMenuItemName(r)).filter(Boolean).slice(0, 10)
      reply = `Sure — here are some vegetarian choices I can see: ${names.join(', ')}.`
    } else {
      reply = "I couldn't find that information in the available TasteMate data. Try asking in a different way (for example, 'Which items are plant-based?' or 'Show veggie options')."
    }
  } else if (cuisineMatch) {
    // User asked about a specific cuisine
    const cuisine = cuisineMatch[1]
    const items = findMenuItemsByCuisine(cuisine)
    if (items.length > 0) {
      const names = items.map((r) => getMenuItemName(r)).filter(Boolean).slice(0, 12)
      reply = `Nice choice — here are some ${cuisine} dishes I can find: ${names.join(', ')}.`
    } else if (Array.isArray(snapshot.topMenuItems) && snapshot.topMenuItems.length > 0) {
      reply = `I don't see many labelled ${cuisine} dishes, but top menu items right now include: ${snapshot.topMenuItems.slice(0, 6).join(', ')}.`
    } else {
      reply = "I couldn't find that information in the available TasteMate data. You can also try broader terms like 'Indian' or 'Asian' to see related items."
    }
  } else if (asksMenu) {
    // Generic menu query — return top menu items from snapshot if present
    if (Array.isArray(snapshot.topMenuItems) && snapshot.topMenuItems.length > 0) {
      reply = `Here are some popular items in the live data: ${snapshot.topMenuItems.slice(0, 6).join(', ')}.`
    } else {
      reply = "I couldn't find that information in the available TasteMate data."
    }
  } else {
    // For any other question, do not invent answers — point to live snapshot
    reply = "I couldn't find that information in the available TasteMate data. You can ask me for recommendations by cuisine (for example, 'Recommend Italian dishes'), dietary filters (like 'vegetarian' or 'plant-based'), or ask for popular items."
  }

  return {
    agent: chatbotMetadata.name,
    role: chatbotMetadata.role,
    generatedAt: new Date().toISOString(),
    modelUsed: 'data-only',
    toolName,
    question,
    reply,
    suggestedFollowUps: [
      'Which customers match this preference?',
      'Show vegetarian menu items',
      'Give me the top menu items you see',
    ],
    mcpSnapshot: snapshot,
  }
}

export { chatbotMetadata }