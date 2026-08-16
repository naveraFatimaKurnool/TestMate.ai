import { serveStdio } from '@modelcontextprotocol/server/stdio'

import { createTasteMateMcpServer } from './tastemateMcpServer.js'

serveStdio(() => createTasteMateMcpServer())