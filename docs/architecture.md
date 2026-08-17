# System Architecture

```mermaid
flowchart LR
  subgraph Frontend
    A[User Browser] --> B[React App (Vite)]
    B --> |POST /api/chatbot/run| Backend
    B --> |POST /api/agents/*/run| Backend
  end

  subgraph Backend
    Backend[Node ESM server]
    Backend --> MCP[MCP Server]
    Backend --> Sheets[Google Sheets]
    Backend --> Agents[Maya / Lina / Alex / Sam / Daniel]
    Agents --> Backend
    MCP --> Backend
  end

  Sheets[Google Sheets] --> Backend
  Backend --> |serves| Frontend

  note right of Backend
    - Chatbot (Nora) reads MCP snapshot + Sheets
    - Agents run sequential pipeline: Researcher → Designer → Maker → Communicator → Manager
  end
```

**Components**

- Frontend: Vite + React demo UI. Triggers the pipeline and provides the chat interface (Nora).
- Backend: Node ESM server exposing REST endpoints for agents and chatbot. Loads Google Sheets via GViz and runs an MCP server for tool snapshots.
- Google Sheets: live data source (Customers, Menu, Orders, Feedback).
- MCP: provides deterministic snapshot tooling (`live_dashboard_snapshot`) used by Nora.

**Data flow**: User → Frontend → Backend → (MCP, Google Sheets) → Backend → Frontend (responses)
