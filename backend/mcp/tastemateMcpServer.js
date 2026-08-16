import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'

import { fetchLiveSheetData } from '../lib/googleSheets.js'

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function getCell(row, keys) {
  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = normalizeText(key)

    if (keys.some((needle) => normalizedKey.includes(needle))) {
      const text = String(value ?? '').trim()
      if (text) {
        return text
      }
    }
  }

  return ''
}

function buildSnapshot(question, data) {
  const customerCount = data.customers.length
  const menuCount = data.menu.length
  const orderCount = data.orders.length
  const feedbackCount = data.feedback.length

  const topMenuItems = data.menu
    .slice(0, 5)
    .map((row) =>
      getCell(row, ['foodname', 'item', 'dish', 'name']) ||
      getCell(row, ['foodid']) ||
      'Menu item',
    )

  const topFeedbackThemes = data.feedback
    .map((row) => getCell(row, ['comment', 'feedback', 'review', 'message']))
    .filter(Boolean)
    .slice(0, 5)

  const liveHighlights = [
    `Live Google Sheets is connected with ${customerCount} customers, ${menuCount} menu rows, ${orderCount} orders, and ${feedbackCount} feedback entries.`,
    topMenuItems.length > 0
      ? `Menu items currently showing up in the live sheet include ${topMenuItems.slice(0, 3).join(', ')}.`
      : 'The live menu sheet is available, but no menu labels were detected.',
    topFeedbackThemes.length > 0
      ? `Feedback examples include ${topFeedbackThemes.slice(0, 2).join(' and ')}.`
      : 'Feedback is present, but no clear text themes were detected yet.',
  ]

  return {
    question: question || '',
    source: 'Google Sheets',
    counts: {
      customers: customerCount,
      menu: menuCount,
      orders: orderCount,
      feedback: feedbackCount,
    },
    liveHighlights,
    topMenuItems,
    topFeedbackThemes,
    recommendedAngle: question
      ? 'Use the live counts and current agent handoffs to answer the question directly.'
      : 'Ask about customer preferences, menu focus, or a launch angle to get a grounded suggestion.',
  }
}

export function createTasteMateMcpServer() {
  const server = new McpServer(
    {
      name: 'TasteMate Live Insights',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  server.registerTool(
    'live_dashboard_snapshot',
    {
      title: 'Live dashboard snapshot',
      description:
        'Summarise the live Google Sheets data for the chatbot.',
      inputSchema: z.object({
        question: z.string().optional(),
      }),
    },
    async ({ question }) => {
      const data = await fetchLiveSheetData(
        process.env.GOOGLE_SHEET_ID,
      )
      const snapshot = buildSnapshot(question, data)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(snapshot, null, 2),
          },
        ],
        structuredContent: snapshot,
      }
    },
  )

  return server
}