import { useState } from 'react'
import './App.css'

const agents = [
  {
    name: 'Maya',
    role: 'Food Insights Researcher',
    description:
      'Reviews customer signals, menu trends, and dining patterns to shape the next step.',
  },
  {
    name: 'Lina',
    role: 'Customer Experience Designer',
    description:
      'Turns research into a clearer service journey and a more welcoming customer flow.',
  },
  {
    name: 'Alex',
    role: 'AI Product Maker',
    description:
      'Frames the experience into a practical product workflow for future implementation.',
  },
  {
    name: 'Sam',
    role: 'Restaurant Marketing Communicator',
    description:
      'Shapes the message customers would see across outreach and engagement touchpoints.',
  },
  {
    name: 'Daniel',
    role: 'Restaurant Operations Manager',
    description:
      'Checks whether the workflow fits the restaurant floor, team capacity, and service rhythm.',
  },
]

const initialStatuses = {
  Maya: 'Waiting',
  Lina: 'Waiting',
  Alex: 'Waiting',
  Sam: 'Waiting',
  Daniel: 'Waiting',
}

/*
 * Generic renderer for Sam and Daniel.
 *
 * This means the frontend does not depend on us guessing
 * the exact field names returned by sam.js or daniel.js.
 */
function renderBriefValue(value) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <span>{String(value)}</span>
  }

  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            {typeof item === 'object' && item !== null
              ? renderBriefValue(item)
              : String(item)}
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    return (
      <div className="brief-object">
        {Object.entries(value).map(([key, item]) => (
          <div key={key} className="brief-field">
            <h4>
              {key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (letter) => letter.toUpperCase())}
            </h4>

            {renderBriefValue(item)}
          </div>
        ))}
      </div>
    )
  }

  return null
}

function App() {
  const [agentStatuses, setAgentStatuses] = useState(initialStatuses)
  const [workflowStatus, setWorkflowStatus] = useState('ready')

  const [mayaStatus, setMayaStatus] = useState('idle')
  const [mayaBrief, setMayaBrief] = useState(null)
  const [mayaError, setMayaError] = useState('')

  const [linaStatus, setLinaStatus] = useState('idle')
  const [linaBrief, setLinaBrief] = useState(null)
  const [linaError, setLinaError] = useState('')

  const [alexBrief, setAlexBrief] = useState(null)
  const [samBrief, setSamBrief] = useState(null)
  const [danielBrief, setDanielBrief] = useState(null)

  // Chat UI state for Nora (MCP-backed chatbot)
  const [chatMessages, setChatMessages] = useState([
    { from: 'nora', text: 'Hi — I am Nora, your TasteMate assistant. Ask me about the current dashboard or next steps.' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [lastSnapshot, setLastSnapshot] = useState(null)
  const [showRecommendationDetail, setShowRecommendationDetail] = useState(false)

  function updateAgentStatus(agentName, status) {
    setAgentStatuses((current) => ({
      ...current,
      [agentName]: status,
    }))
  }

  async function readErrorResponse(response, fallbackMessage) {
    try {
      const responseText = await response.text()

      if (!responseText) {
        return fallbackMessage
      }

      try {
        const payload = JSON.parse(responseText)

        if (payload?.error) {
          return payload.error
        }
      } catch {
        // Response was not JSON.
      }

      return responseText
    } catch {
      return fallbackMessage
    }
  }

  /*
   * STEP 3
   * Alex receives Lina's output.
   */
  async function runAlex(brief) {
    updateAgentStatus('Alex', 'Running')

    try {
      const response = await fetch(
        'http://localhost:3001/api/agents/alex/run',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(brief),
        },
      )

      if (!response.ok) {
        const errorMessage = await readErrorResponse(
          response,
          'Alex could not process Lina’s brief.',
        )

        throw new Error(errorMessage)
      }

      const alexResult = await response.json()

      console.log('Alex completed:', alexResult)

      updateAgentStatus('Alex', 'Complete')

      return alexResult
    } catch (error) {
      updateAgentStatus('Alex', 'Error')
      throw error
    }
  }

  /*
   * STEP 4
   * Sam receives Alex's output.
   */
  async function runSam(brief) {
    updateAgentStatus('Sam', 'Running')

    try {
      const response = await fetch(
        'http://localhost:3001/api/agents/sam/run',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(brief),
        },
      )

      if (!response.ok) {
        const errorMessage = await readErrorResponse(
          response,
          'Sam could not process Alex’s brief.',
        )

        throw new Error(errorMessage)
      }

      const samResult = await response.json()

      console.log('Sam completed:', samResult)

      updateAgentStatus('Sam', 'Complete')

      return samResult
    } catch (error) {
      updateAgentStatus('Sam', 'Error')
      throw error
    }
  }

  /*
   * STEP 5
   * Daniel receives Sam's output.
   */
  async function runDaniel(brief) {
    updateAgentStatus('Daniel', 'Running')

    try {
      const response = await fetch(
        'http://localhost:3001/api/agents/daniel/run',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(brief),
        },
      )

      if (!response.ok) {
        const errorMessage = await readErrorResponse(
          response,
          'Daniel could not process Sam’s brief.',
        )

        throw new Error(errorMessage)
      }

      const danielResult = await response.json()

      console.log('Daniel completed:', danielResult)

      updateAgentStatus('Daniel', 'Complete')

      return danielResult
    } catch (error) {
      updateAgentStatus('Daniel', 'Error')
      throw error
    }
  }

  async function handleRunTasteMateAI() {
    if (workflowStatus === 'running') {
      return
    }

    setWorkflowStatus('running')
    setAgentStatuses(initialStatuses)

    setMayaStatus('loading')
    setMayaError('')
    setMayaBrief(null)

    setLinaStatus('idle')
    setLinaBrief(null)
    setLinaError('')

    setAlexBrief(null)
    setSamBrief(null)
    setDanielBrief(null)

    /*
     * This variable is deliberately synchronous.
     * React state updates are asynchronous, so this gives
     * the catch block the correct agent name immediately.
     */
    let currentStep = 'Maya'

    updateAgentStatus('Maya', 'Running')

    try {
      /*
       * STEP 1
       * Run Maya.
       */
      const mayaResponse = await fetch(
        'http://localhost:3001/api/agents/maya/run',
        {
          method: 'POST',
        },
      )

      if (!mayaResponse.ok) {
        const errorMessage = await readErrorResponse(
          mayaResponse,
          'Maya could not run because the backend request failed.',
        )

        throw new Error(errorMessage)
      }

      const mayaResult = await mayaResponse.json()

      setMayaBrief(mayaResult)
      setMayaStatus('success')
      updateAgentStatus('Maya', 'Complete')

      console.log('Maya completed:', mayaResult)

      /*
       * STEP 2
       * Send Maya's output to Lina.
       */
      currentStep = 'Lina'

      setLinaStatus('loading')
      updateAgentStatus('Lina', 'Running')

      const linaResponse = await fetch(
        'http://localhost:3001/api/agents/lina/run',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mayaResult),
        },
      )

      if (!linaResponse.ok) {
        const errorMessage = await readErrorResponse(
          linaResponse,
          'Lina could not process Maya’s research brief.',
        )

        throw new Error(errorMessage)
      }

      const linaResult = await linaResponse.json()

      setLinaBrief(linaResult)
      setLinaStatus('success')
      updateAgentStatus('Lina', 'Complete')

      console.log('Lina completed:', linaResult)

      /*
       * STEP 3
       * Lina → Alex
       */
      currentStep = 'Alex'

      const alexResult = await runAlex(linaResult)

      setAlexBrief(alexResult)

      /*
       * STEP 4
       * Alex → Sam
       */
      currentStep = 'Sam'

      const samResult = await runSam(alexResult)

      setSamBrief(samResult)

      /*
       * STEP 5
       * Sam → Daniel
       */
      currentStep = 'Daniel'

      const danielResult = await runDaniel(samResult)

      setDanielBrief(danielResult)

      /*
       * All five agents completed.
       */
      setWorkflowStatus('complete')

      console.log('Complete TasteMate AI pipeline:', {
        maya: mayaResult,
        lina: linaResult,
        alex: alexResult,
        sam: samResult,
        daniel: danielResult,
      })
    } catch (error) {
      setWorkflowStatus('error')

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'The TasteMate AI workflow could not run.'

      if (currentStep === 'Maya') {
        setMayaStatus('error')
        setMayaError(errorMessage)
      } else if (currentStep === 'Lina') {
        setLinaStatus('error')
        setLinaError(errorMessage)
        setMayaError(`Lina step failed: ${errorMessage}`)
      } else {
        setMayaError(`${currentStep} step failed: ${errorMessage}`)
      }

      updateAgentStatus(currentStep, 'Error')
    }
  }

  const isRunning = workflowStatus === 'running'

  const hasBrief = Boolean(mayaBrief)
  const hasLinaBrief = Boolean(linaBrief)
  const hasAlexBrief = Boolean(alexBrief)
  const hasSamBrief = Boolean(samBrief)
  const hasDanielBrief = Boolean(danielBrief)

  return (
    <main className="dashboard-shell">
      <header className="site-header">
        <div className="site-brand">
          <h2>TasteMate AI</h2>
          <p className="site-tag">Personalised dining recommendations</p>
        </div>

        <nav className="site-nav">
          <a href="#">Dashboard</a>
          <a href="#how">How it works</a>
          <a href="#docs">Docs</a>
          <button className="ghost" onClick={() => window.scrollTo(0, document.body.scrollHeight)}>AI Chat</button>
        </nav>
      </header>
      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="hero-panel product-hero">
        <div className="brand-block">
          <p className="eyebrow">TasteMate AI</p>

          <h1>Find your perfect dining experience</h1>

          <p className="lead">
            AI-powered, personalised restaurant and dish recommendations based on
            customer preferences, orders and feedback — explained in plain language.
          </p>

          <p className="muted">Customer preferences → AI analysis → personalised recommendation</p>
        </div>

        <div className="hero-actions">
          <div className="hero-cta">
            <button
              type="button"
              className="run-button"
              onClick={handleRunTasteMateAI}
              disabled={isRunning}
            >
              {isRunning
                ? 'Running TasteMate AI...'
                : workflowStatus === 'complete'
                  ? 'Run Again'
                  : 'Explore Recommendations'}
            </button>

            <p className="button-note">
              {workflowStatus === 'running'
                ? 'Generating a personalised recommendation — this may take a few seconds.'
                : workflowStatus === 'complete'
                  ? 'A recommendation is ready. See the preview below.'
                  : 'Start the pipeline to generate a recommendation.'}
            </p>
          </div>

          <div className="hero-preview">
            <div className="recommendation-card">
              {hasSamBrief || hasDanielBrief ? (
                <>
                  <div className="match-row">
                    <div className="match-badge">94%</div>
                    <div className="match-label">AI Match</div>
                  </div>

                  <h3 className="rec-title">Recommended for you</h3>

                  <p className="rec-summary">
                    {samBrief?.summary || danielBrief?.summary || 'A personalised restaurant suggestion based on your preferences.'}
                  </p>

                  <div className="rec-actions">
                    <button className="view-recommendation" onClick={() => setShowRecommendationDetail((s) => !s)}>{showRecommendationDetail ? 'Hide' : 'View Recommendation'}</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="placeholder-label">Preview</p>
                  <h3 className="rec-title">Your personalised recommendation will appear here</h3>
                  <p className="rec-summary">Run the TasteMate pipeline to see a recommended restaurant or dish with an AI match score and clear explanation.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {showRecommendationDetail && (hasSamBrief || hasDanielBrief) ? (
        <section className="recommendation-detail">
          <div className="rec-detail-card">
            <div className="rec-detail-image" aria-hidden>
              {/* placeholder image */}
            </div>

            <div className="rec-detail-body">
              <h3>{samBrief?.restaurant || danielBrief?.restaurant || 'The Spice Garden'}</h3>
              <p className="rec-sub">{samBrief?.dish || danielBrief?.dish || 'Chicken Tikka Bowl'}</p>

              <div className="rec-tags">
                <span className="tag">Thai</span>
                <span className="tag">Spicy</span>
                <span className="tag">Under $15</span>
              </div>

              <h4>Why we recommend this</h4>
              <ul>
                {(samBrief?.reasons || danielBrief?.reasons || ['Matches cuisine preference','Within budget','High recent satisfaction']).map((r, i) => (
                  <li key={i}>{typeof r === 'string' ? r : JSON.stringify(r)}</li>
                ))}
              </ul>

              <div className="rec-ctas">
                <button className="view-recommendation">Open in app</button>
                <button className="ghost" onClick={() => setShowRecommendationDetail(false)}>Close</button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* =========================================================
          PIPELINE
      ========================================================= */}

      <div className="kpi-row">
        <div className="kpi-card">
          <p className="kpi-label">Customers</p>
          <p className="kpi-value">{lastSnapshot?.customers ?? (mayaBrief?.customers?.length ?? '—')}</p>
        </div>

        <div className="kpi-card">
          <p className="kpi-label">Menu items</p>
          <p className="kpi-value">{lastSnapshot?.menu ?? (mayaBrief?.menu?.length ?? '—')}</p>
        </div>

        <div className="kpi-card">
          <p className="kpi-label">Orders</p>
          <p className="kpi-value">{lastSnapshot?.orders ?? '—'}</p>
        </div>
      </div>

      <section
        className="pipeline-panel"
        aria-labelledby="pipeline-heading"
      >
        <div className="section-heading">
          <p className="section-kicker">Sequential Pipeline</p>

          <h2 id="pipeline-heading">
            Researcher → Designer → Maker → Communicator → Manager
          </h2>
        </div>

        <div
          className="pipeline-track"
          role="list"
          aria-label="TasteMate AI agent pipeline"
        >
          {agents.map((agent, index) => {
            const status = agentStatuses[agent.name]

            return (
              <div
                className="pipeline-step-wrap"
                key={agent.name}
              >
                <article
                  className={`pipeline-step status-${status.toLowerCase()}`}
                  role="listitem"
                >
                  <div className="agent-meta">
                    <p className="agent-name">
                      {agent.name}
                    </p>

                    <span className="agent-status">
                      Status: {status}
                    </span>
                  </div>

                  <h3>{agent.role}</h3>

                  <p>{agent.description}</p>

                  {status === 'Running' && (
                    <div className="agent-progress">
                      <span>Working...</span>
                    </div>
                  )}

                  {status === 'Complete' && (
                    <div className="agent-complete">
                      ✓ Handoff complete
                    </div>
                  )}

                  {status === 'Error' && (
                    <div className="agent-error">
                      ✕ Error
                    </div>
                  )}
                </article>

                {index < agents.length - 1 ? (
                  <div
                    className="pipeline-arrow"
                    aria-hidden="true"
                  >
                    <span>→</span>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}

      <section className="content-grid">
        <article className="output-panel">
          <div className="section-heading">
            <p className="section-kicker">
              Main Output Area
            </p>

            <h2>
              {hasDanielBrief
                ? 'TasteMate AI Final Outputs'
                : hasBrief
                  ? 'Agent Outputs'
                  : 'Agent outputs will appear here'}
            </h2>
          </div>

          {/* =====================================================
              WORKFLOW ERROR
          ===================================================== */}

          {workflowStatus === 'error' ? (
            <div
              className="placeholder-card output-placeholder"
              role="alert"
            >
              <p className="placeholder-label">
                Workflow Error
              </p>

              <p>{mayaError}</p>
            </div>
          ) : null}

          {/* =====================================================
              MAYA
          ===================================================== */}

          {workflowStatus === 'running' && !hasBrief ? (
            <div
              className="placeholder-card output-placeholder"
              aria-live="polite"
            >
              <p className="placeholder-label">
                Maya Running
              </p>

              <p>
                Maya is reading the live Google Sheet and
                preparing the research handoff.
              </p>
            </div>
          ) : null}

          {hasBrief ? (
            <div
              className="placeholder-card output-placeholder"
              aria-live="polite"
            >
              <p className="placeholder-label">
                Maya — Research Brief
              </p>

              {mayaBrief.generatedAt ? (
                <p>
                  Generated at{' '}
                  {new Date(
                    mayaBrief.generatedAt,
                  ).toLocaleString()}{' '}
                  from {mayaBrief.dataSource}.
                </p>
              ) : null}

              <p>{mayaBrief.summary}</p>

              {Array.isArray(mayaBrief.keyFindings) ? (
                <div>
                  <h3>Key findings</h3>

                  <ul>
                    {mayaBrief.keyFindings.map(
                      (finding, index) => (
                        <li key={index}>
                          <strong>
                            {finding.importance}:
                          </strong>{' '}
                          {finding.finding}{' '}
                          {finding.evidence}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(mayaBrief.customerNeeds) ? (
                <div>
                  <h3>Customer needs</h3>

                  <ul>
                    {mayaBrief.customerNeeds.map(
                      (need, index) => (
                        <li key={index}>{need}</li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(mayaBrief.opportunities) ? (
                <div>
                  <h3>Opportunities</h3>

                  <ul>
                    {mayaBrief.opportunities.map(
                      (opportunity, index) => (
                        <li key={index}>
                          {opportunity}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(
                mayaBrief.recommendationsForNextAgent,
              ) ? (
                <div>
                  <h3>Recommendations for Lina</h3>

                  <ul>
                    {mayaBrief.recommendationsForNextAgent.map(
                      (recommendation, index) => (
                        <li key={index}>
                          {recommendation}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* =====================================================
              LINA
          ===================================================== */}

          {hasLinaBrief ? (
            <div
              className="placeholder-card output-placeholder"
              aria-live="polite"
            >
              <p className="placeholder-label">
                Lina — Customer Experience Design Brief
              </p>

              {linaBrief.generatedAt ? (
                <p>
                  Generated at{' '}
                  {new Date(
                    linaBrief.generatedAt,
                  ).toLocaleString()}
                </p>
              ) : null}

              <p>{linaBrief.summary}</p>

              {Array.isArray(linaBrief.designGoals) ? (
                <div>
                  <h3>Design Goals</h3>

                  <ul>
                    {linaBrief.designGoals.map(
                      (goal, index) => (
                        <li key={index}>{goal}</li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(
                linaBrief.customerExperienceNeeds,
              ) ? (
                <div>
                  <h3>Customer Experience Needs</h3>

                  <ul>
                    {linaBrief.customerExperienceNeeds.map(
                      (need, index) => (
                        <li key={index}>{need}</li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(linaBrief.researchSignals) ? (
                <div>
                  <h3>Research Signals from Maya</h3>

                  <ul>
                    {linaBrief.researchSignals.map(
                      (signal, index) => (
                        <li key={index}>{signal}</li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(
                linaBrief.experienceOpportunities,
              ) ? (
                <div>
                  <h3>Experience Opportunities</h3>

                  <ul>
                    {linaBrief.experienceOpportunities.map(
                      (opportunity, index) => (
                        <li key={index}>
                          {opportunity}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(
                linaBrief.designRecommendations,
              ) ? (
                <div>
                  <h3>Design Recommendations</h3>

                  <ul>
                    {linaBrief.designRecommendations.map(
                      (recommendation, index) => (
                        <li key={index}>
                          {recommendation}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(linaBrief.proposedJourney) ? (
                <div>
                  <h3>Proposed Customer Journey</h3>

                  <ol>
                    {linaBrief.proposedJourney.map(
                      (stage, index) => (
                        <li key={index}>
                          <strong>
                            {stage.stage}:
                          </strong>{' '}
                          {stage.description}
                        </li>
                      ),
                    )}
                  </ol>
                </div>
              ) : null}

              {Array.isArray(
                linaBrief.recommendationsForNextAgent,
              ) ? (
                <div>
                  <h3>Handoff to Alex</h3>

                  <ul>
                    {linaBrief.recommendationsForNextAgent.map(
                      (recommendation, index) => (
                        <li key={index}>
                          {recommendation}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* =====================================================
              ALEX
          ===================================================== */}

          {hasAlexBrief ? (
            <div
              className="placeholder-card output-placeholder"
              aria-live="polite"
            >
              <p className="placeholder-label">
                Alex — AI Product Brief
              </p>

              {Array.isArray(alexBrief.productGoals) ? (
                <div>
                  <h3>Product Goals</h3>

                  <ul>
                    {alexBrief.productGoals.map(
                      (goal, index) => (
                        <li key={index}>{goal}</li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(
                alexBrief.customerRequirements,
              ) ? (
                <div>
                  <h3>Customer Requirements</h3>

                  <ul>
                    {alexBrief.customerRequirements.map(
                      (requirement, index) => (
                        <li key={index}>
                          {requirement}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(
                alexBrief.productOpportunities,
              ) ? (
                <div>
                  <h3>Product Opportunities</h3>

                  <ul>
                    {alexBrief.productOpportunities.map(
                      (opportunity, index) => (
                        <li key={index}>
                          {opportunity}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(alexBrief.coreFeatures) ? (
                <div>
                  <h3>Core Features</h3>

                  <ul>
                    {alexBrief.coreFeatures.map(
                      (feature, index) => (
                        <li key={index}>
                          <strong>
                            {feature.feature}:
                          </strong>{' '}
                          {feature.description}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(alexBrief.aiWorkflow) ? (
                <div>
                  <h3>AI Workflow</h3>

                  <ol>
                    {alexBrief.aiWorkflow.map(
                      (stage, index) => (
                        <li key={index}>
                          <strong>
                            {stage.stage}:
                          </strong>{' '}
                          {stage.description}
                        </li>
                      ),
                    )}
                  </ol>
                </div>
              ) : null}

              {Array.isArray(
                alexBrief.customerJourneyMapping,
              ) ? (
                <div>
                  <h3>Customer Journey Mapping</h3>

                  <ol>
                    {alexBrief.customerJourneyMapping.map(
                      (stage, index) => (
                        <li key={index}>
                          <strong>
                            {stage.stage}:
                          </strong>{' '}
                          {stage.productResponse}
                        </li>
                      ),
                    )}
                  </ol>
                </div>
              ) : null}

              {Array.isArray(
                alexBrief.implementationConsiderations,
              ) ? (
                <div>
                  <h3>
                    Implementation Considerations
                  </h3>

                  <ul>
                    {alexBrief.implementationConsiderations.map(
                      (consideration, index) => (
                        <li key={index}>
                          {consideration}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(
                alexBrief.recommendationsForSam,
              ) ? (
                <div>
                  <h3>Handoff to Sam</h3>

                  <ul>
                    {alexBrief.recommendationsForSam.map(
                      (recommendation, index) => (
                        <li key={index}>
                          {recommendation}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* =====================================================
              SAM
          ===================================================== */}

          {hasSamBrief ? (
            <div
              className="placeholder-card output-placeholder"
              aria-live="polite"
            >
              <p className="placeholder-label">
                Sam — Restaurant Marketing Brief
              </p>

              <p>
                Sam has processed Alex's product
                recommendations and created the marketing
                handoff.
              </p>

              {samBrief.summary ? (
                <div>
                  <h3>Marketing Summary</h3>
                  <p>{samBrief.summary}</p>
                </div>
              ) : null}

              {samBrief.generatedAt ? (
                <p>
                  Generated at{' '}
                  {new Date(
                    samBrief.generatedAt,
                  ).toLocaleString()}
                </p>
              ) : null}

              <div>
                <h3>Sam's Complete Output</h3>

                {renderBriefValue(samBrief)}
              </div>
            </div>
          ) : null}

          {/* =====================================================
              DANIEL
          ===================================================== */}

          {hasDanielBrief ? (
            <div
              className="placeholder-card output-placeholder"
              aria-live="polite"
            >
              <p className="placeholder-label">
                Daniel — Restaurant Operations Brief
              </p>

              <p>
                Daniel has reviewed Sam's marketing output
                and completed the operational/business
                handoff.
              </p>

              {danielBrief.summary ? (
                <div>
                  <h3>Operations Summary</h3>
                  <p>{danielBrief.summary}</p>
                </div>
              ) : null}

              {danielBrief.generatedAt ? (
                <p>
                  Generated at{' '}
                  {new Date(
                    danielBrief.generatedAt,
                  ).toLocaleString()}
                </p>
              ) : null}

              <div>
                <h3>Daniel's Complete Output</h3>

                {renderBriefValue(danielBrief)}
              </div>
            </div>
          ) : null}

          {/* =====================================================
              CUSTOMER-FACING PREVIEW
          ===================================================== */}

          <div className="recommendation-panel">
            <div className="section-heading compact">
              <p className="section-kicker">
                Customer-Facing Preview
              </p>

              <h2>
                Final TasteMate Recommendation
              </h2>
            </div>

            <div className="placeholder-card recommendation-placeholder">
              {!hasSamBrief && !hasDanielBrief ? (
                <>
                  <p className="placeholder-label">
                    Waiting for downstream agents
                  </p>

                  <h3>
                    Menu pairing and engagement summary
                  </h3>

                  <p>
                    Final recommendations will appear here
                    after Sam and Daniel complete their
                    handoffs.
                  </p>
                </>
              ) : (
                <>
                  <p className="placeholder-label">
                    Final Workflow Result
                  </p>

                  <h3>
                    Restaurant recommendation ready
                  </h3>

                  {samBrief?.summary ? (
                    <p>{samBrief.summary}</p>
                  ) : null}

                  {danielBrief?.summary ? (
                    <p>{danielBrief.summary}</p>
                  ) : null}

                  {hasDanielBrief ? (
                    <div className="agent-complete">
                      ✓ Validated by all five agents
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </article>

        {/* =======================================================
            SIDEBAR
        ======================================================= */}

        <aside className="sidebar-panel">
          <section
            className="data-source-card"
            aria-labelledby="data-source-heading"
          >
            <p className="section-kicker">
              Live Data Source
            </p>

            <h2 id="data-source-heading">
              Google Sheets — Connected
            </h2>

            <p>
              Maya is connected to the live Google Sheet
              through the backend.
            </p>
          </section>

          <section className="chat-card" aria-labelledby="chat-heading">
            <p className="section-kicker">Assistant</p>

            <h2 id="chat-heading">Nora — Chat</h2>

            <div className="chat-messages" role="log" aria-live="polite">
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-message from-${m.from}`}>
                  <div className="chat-message-body">{m.text}</div>
                  {m.snapshot ? (
                    <details className="chat-snapshot">
                      <summary>Show data snapshot</summary>
                      <pre>{JSON.stringify(m.snapshot, null, 2)}</pre>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>

            <form
              className="chat-form"
              onSubmit={async (e) => {
                e.preventDefault()

                if (!chatInput || chatSending) return

                const userMessage = chatInput.trim()

                setChatMessages((c) => [...c, { from: 'user', text: userMessage }])
                setChatInput('')
                setChatSending(true)

                try {
                  const res = await fetch('http://localhost:3001/api/chatbot/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userMessage }),
                  })

                  if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Chatbot request failed')
                  }

                  const payload = await res.json()

                  const replyText = payload?.reply || payload?.message || 'No reply'
                  const snapshot = payload?.mcpSnapshot || payload?.snapshot || null

                  setLastSnapshot(snapshot)

                  setChatMessages((c) => [
                    ...c,
                    { from: 'nora', text: replyText, snapshot },
                  ])
                } catch (err) {
                  setChatMessages((c) => [
                    ...c,
                    { from: 'nora', text: `Error: ${err instanceof Error ? err.message : String(err)}` },
                  ])
                } finally {
                  setChatSending(false)
                }
              }}
            >
              <input
                className="chat-input"
                placeholder="Ask Nora about the dashboard or next steps..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                aria-label="Message to Nora"
                disabled={chatSending}
              />

              <button type="submit" className="chat-send" disabled={chatSending || !chatInput}>
                {chatSending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </section>

          <section
            className="status-card"
            aria-labelledby="workflow-status-heading"
          >
            <p className="section-kicker">
              Workflow State
            </p>

            <h2 id="workflow-status-heading">
              {workflowStatus === 'running'
                ? 'Agents are working'
                : workflowStatus === 'complete'
                  ? 'Workflow Complete'
                  : workflowStatus === 'error'
                    ? 'Workflow Error'
                    : 'Ready to run'}
            </h2>

            <ul>
              {agents.map((agent) => (
                <li key={agent.name}>
                  {agent.name}: {agentStatuses[agent.name]}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App