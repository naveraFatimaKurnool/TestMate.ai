import 'dotenv/config'
import http from 'node:http'

import { fetchLiveSheetData } from './lib/googleSheets.js'

import {
  getMayaResearchBrief,
  mayaMetadata,
} from './modules/maya.js'

import {
  getLinaExperienceBrief,
  linaMetadata,
} from './modules/lina.js'

import {
  getAlexProductBrief,
  alexMetadata,
} from './modules/alex.js'

import {
  getAlexMcpProductBrief,
  alexMcpMetadata,
} from './modules/alex_mcp.js'

import {
  getSamMarketingBrief,
  samMetadata,
} from './modules/sam.js'

import {
  getDanielBusinessBrief,
  danielMetadata,
} from './modules/daniel.js'

import {
  chatbotMetadata,
  getChatbotReply,
} from './modules/chatbot.js'

const PORT = Number(process.env.PORT || 3001)
const SHEET_ID = process.env.GOOGLE_SHEET_ID

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })

  res.end(JSON.stringify(payload, null, 2))
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, {
    error: message,
  })
}

async function handleDataRequest(res) {
  if (!SHEET_ID) {
    sendError(
      res,
      500,
      'GOOGLE_SHEET_ID is not configured',
    )
    return
  }

  try {
    const data = await fetchLiveSheetData(SHEET_ID)

    sendJson(res, 200, data)
  } catch (error) {
    sendError(
      res,
      502,
      error instanceof Error
        ? error.message
        : 'Failed to load Google Sheets',
    )
  }
}

async function handleMayaRunRequest(res) {
  if (!SHEET_ID) {
    sendError(
      res,
      500,
      'Maya cannot run because the live data source is unavailable: GOOGLE_SHEET_ID is not configured',
    )
    return
  }

  try {
    const brief = await getMayaResearchBrief()

    sendJson(res, 200, brief)
  } catch (error) {
    console.error('Maya run failed:', error)

    sendError(
      res,
      502,
      `Maya cannot run because the live data source is unavailable: ${
        error instanceof Error
          ? error.message
          : 'Failed to load Google Sheets'
      }`,
    )
  }
}

async function handleLinaRunRequest(req, res) {
  let body = ''

  req.on('data', (chunk) => {
    body += chunk
  })

  req.on('end', async () => {
    try {
      const mayaBrief = JSON.parse(body || '{}')

      const linaBrief =
        await getLinaExperienceBrief(mayaBrief)

      sendJson(res, 200, linaBrief)
    } catch (error) {
      sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : 'Lina could not process the Maya handoff.',
      )
    }
  })
}

async function handleAlexRunRequest(req, res) {
  let body = ''

  req.on('data', (chunk) => {
    body += chunk
  })

  req.on('end', async () => {
    try {
      const linaBrief = JSON.parse(body || '{}')

      const alexBrief =
        await getAlexProductBrief(linaBrief)

      console.log('Alex completed:', alexBrief)

      sendJson(res, 200, alexBrief)
    } catch (error) {
      console.error('Alex run failed:', error)

      sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : 'Alex could not process the Lina handoff.',
      )
    }
  })
}

async function handleSamRunRequest(req, res) {
  let body = ''

  req.on('data', (chunk) => {
    body += chunk
  })

  req.on('end', async () => {
    try {
      const alexBrief = JSON.parse(body || '{}')

      const samBrief =
        await getSamMarketingBrief(alexBrief)

      console.log('Sam completed:', samBrief)

      sendJson(res, 200, samBrief)
    } catch (error) {
      console.error('Sam run failed:', error)

      sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : 'Sam could not process the Alex handoff.',
      )
    }
  })
}

async function handleDanielRunRequest(req, res) {
  let body = ''

  req.on('data', (chunk) => {
    body += chunk
  })

  req.on('end', async () => {
    try {
      const samBrief = JSON.parse(body || '{}')

      const danielBrief =
        await getDanielBusinessBrief(samBrief)

      console.log('Daniel completed:', danielBrief)

      sendJson(res, 200, danielBrief)
    } catch (error) {
      console.error('Daniel run failed:', error)

      sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : 'Daniel could not process the Sam handoff.',
      )
    }
  })
}

async function handleChatbotRunRequest(req, res) {
  let body = ''

  req.on('data', (chunk) => {
    body += chunk
  })

  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}')
      const chatbotReply = await getChatbotReply(payload)

      sendJson(res, 200, chatbotReply)
    } catch (error) {
      console.error('Chatbot run failed:', error)

      sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : 'The chatbot could not generate a reply.',
      )
    }
  })
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })

    res.end()
    return
  }

  const requestUrl = new URL(
    req.url || '/',
    `http://${req.headers.host || 'localhost'}`,
  )

  // Health check
  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/health'
  ) {
    sendJson(res, 200, {
      status: 'ok',
    })
    return
  }

  // Google Sheets data
  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/data'
  ) {
    void handleDataRequest(res)
    return
  }

  // Maya
  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/agents/maya'
  ) {
    sendJson(res, 200, mayaMetadata)
    return
  }

  if (
    req.method === 'POST' &&
    requestUrl.pathname === '/api/agents/maya/run'
  ) {
    void handleMayaRunRequest(res)
    return
  }

  // Lina
  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/agents/lina'
  ) {
    sendJson(res, 200, linaMetadata)
    return
  }

  if (
    req.method === 'POST' &&
    requestUrl.pathname === '/api/agents/lina/run'
  ) {
    void handleLinaRunRequest(req, res)
    return
  }

  // Alex
  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/agents/alex'
  ) {
    sendJson(res, 200, alexMetadata)
    return
  }

  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/agents/alex_mcp'
  ) {
    sendJson(res, 200, alexMcpMetadata)
    return
  }

  if (
    req.method === 'POST' &&
    requestUrl.pathname === '/api/agents/alex/run'
  ) {
    void handleAlexRunRequest(req, res)
    return
  }

  if (
    req.method === 'POST' &&
    requestUrl.pathname === '/api/agents/alex_mcp/run'
  ) {
    // similar to handleAlexRunRequest but use MCP-backed implementation
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', async () => {
      try {
        const linaBrief = JSON.parse(body || '{}')

        const alexBrief = await getAlexMcpProductBrief(linaBrief)

        console.log('Alex (MCP) completed:', alexBrief)

        sendJson(res, 200, alexBrief)
      } catch (error) {
        console.error('Alex (MCP) run failed:', error)

        sendError(
          res,
          400,
          error instanceof Error
            ? error.message
            : 'Alex (MCP) could not process the Lina handoff.',
        )
      }
    })

    return
  }

  // Sam
  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/agents/sam'
  ) {
    sendJson(res, 200, samMetadata)
    return
  }

  if (
    req.method === 'POST' &&
    requestUrl.pathname === '/api/agents/sam/run'
  ) {
    void handleSamRunRequest(req, res)
    return
  }

  // Daniel
  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/agents/daniel'
  ) {
    sendJson(res, 200, danielMetadata)
    return
  }

  if (
    req.method === 'POST' &&
    requestUrl.pathname === '/api/agents/daniel/run'
  ) {
    void handleDanielRunRequest(req, res)
    return
  }

  if (
    req.method === 'GET' &&
    requestUrl.pathname === '/api/chatbot'
  ) {
    sendJson(res, 200, chatbotMetadata)
    return
  }

  if (
    req.method === 'POST' &&
    requestUrl.pathname === '/api/chatbot/run'
  ) {
    void handleChatbotRunRequest(req, res)
    return
  }

  sendError(res, 404, 'Not found')
})

server.listen(PORT, () => {
  if (!SHEET_ID) {
    console.warn(
      'GOOGLE_SHEET_ID is not set. /api/data will return an error until it is provided.',
    )
  }

  console.log(
    `TasteMate AI backend listening on http://localhost:${PORT}`,
  )
})