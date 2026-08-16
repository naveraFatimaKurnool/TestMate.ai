import OpenAI from 'openai'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/client/stdio'
import { fileURLToPath } from 'node:url'

const chatbotMetadata = {
  id: 'nora',
  name: 'Nora',
  role: 'MCP Chatbot',
  description:
    'Answers project questions using a live MCP tool that reads the restaurant Google Sheets data.',
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

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
  const { snapshot, toolName } = await loadLiveSnapshot(question)

  const systemPrompt = `
You are Nora, the MCP-connected TasteMate AI chatbot.
You answer in a concise, helpful, product-minded tone.
You must ground every answer in the live Google Sheets snapshot and the agent handoffs.
If you mention live data, stay factual.
If the user asks for a recommendation, prioritise the current customer signals and current workflow state.
`

  let reply = buildFallbackReply(question, snapshot)
  let modelUsed = 'mcp-fallback'

  if (openai) {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'system',
          content: `MCP snapshot:\n${JSON.stringify(snapshot, null, 2)}`,
        },
        ...history.slice(-6),
        {
          role: 'user',
          content: question,
        },
      ],
    })

    reply =
      completion.choices?.[0]?.message?.content?.trim() || reply
    modelUsed = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }

  return {
    agent: chatbotMetadata.name,
    role: chatbotMetadata.role,
    generatedAt: new Date().toISOString(),
    modelUsed,
    toolName,
    question,
    reply,
    suggestedFollowUps: [
      'What should the next agent focus on?',
      'Which live signals matter most right now?',
      'Turn this into a customer-facing launch idea.',
    ],
    mcpSnapshot: snapshot,
  }
}

export { chatbotMetadata }