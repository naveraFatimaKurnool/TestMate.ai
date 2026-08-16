const danielMetadata = {
  id: 'daniel',
  name: 'Daniel',
  role: 'Business Strategy Agent',
  description:
    'Daniel turns marketing insights into clear business priorities, actions, and recommendations.',
  capabilities: [
    'Business strategy',
    'Campaign prioritisation',
    'Customer-focused recommendations',
    'Action planning',
    'Executive decision support',
  ],
}

function getText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  return String(value).trim()
}

function toBulletStrings(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map((value) => getText(value))
    .filter(Boolean)
}

function firstText(values, fallback) {
  const items = toBulletStrings(values)
  return items.length > 0 ? items[0] : fallback
}

function buildPriority(area, reason, action, priority = 'Medium') {
  return {
    priority,
    area,
    reason,
    action,
  }
}

function buildBusinessAction(action, owner, expectedOutcome) {
  return {
    action,
    owner,
    expectedOutcome,
  }
}

export async function getDanielBusinessBrief(samBrief = {}) {
  if (!samBrief || typeof samBrief !== 'object') {
    throw new Error('Daniel requires a valid Sam marketing brief.')
  }
  const communicationGoals = toBulletStrings(
    samBrief.communicationGoals,
  )

  const targetAudience = toBulletStrings(
    samBrief.targetAudience,
  )

  const keyMessages = toBulletStrings(samBrief.keyMessages)
  const customerMessages = toBulletStrings(
    samBrief.customerMessages,
  )
  const recommendedFeatures = toBulletStrings(
    samBrief.recommendedFeatures,
  )
  const campaignIdeas = Array.isArray(samBrief.campaignIdeas)
    ? samBrief.campaignIdeas
        .map((idea) => {
          if (!idea || typeof idea !== 'object') {
            return null
          }

          const campaign = getText(idea.campaign)
          const message = getText(idea.message)
          return campaign || message
            ? `${campaign || 'Campaign'}: ${message || 'No campaign message provided.'}`
            : null
        })
        .filter(Boolean)
    : []

  const campaignCount = campaignIdeas.length

  const decisionSummary =
    'Daniel translated Sam’s customer-facing messaging into business priorities that emphasise clear personalisation, simple communication, and measurable restaurant engagement.'

  const priorities = [
    buildPriority(
      'Customer engagement',
      firstText(
        communicationGoals,
        'Sam recommends a clearer customer-friendly explanation of the value proposition.',
      ),
      'Test one concise customer message that explains the value of personalised recommendations and measures engagement.',
      'High',
    ),
    buildPriority(
      'Product adoption',
      firstText(
        recommendedFeatures,
        'The product needs a small set of clearly explainable features to support the customer journey.',
      ),
      'Prioritise the features that are easiest for customers and staff to understand during a live demo or pilot.',
      'High',
    ),
    buildPriority(
      'Campaign execution',
      campaignCount > 0
        ? `Sam proposed ${campaignCount} campaign concept(s), giving the business a practical starting point for outreach.`
        : 'Sam did not provide campaign concepts with enough structure for direct execution.',
      'Select the strongest campaign idea and turn it into a short launch plan with a clear audience and message.',
      'Medium',
    ),
  ]

  const businessActions = [
    buildBusinessAction(
      'Launch a simple personalised recommendation pilot with one clear customer message.',
      'Restaurant manager',
      'Validates whether customers respond to personalisation without adding operational complexity.',
    ),
    buildBusinessAction(
      'Brief staff on the recommended feature set and the customer value story.',
      'Operations lead',
      'Improves consistency so the experience can be explained the same way across touchpoints.',
    ),
    buildBusinessAction(
      'Track response to the selected campaign idea, recommendation usage, and repeat engagement.',
      'Marketing lead',
      'Creates evidence for whether the concept should be expanded, refined, or paused.',
    ),
  ]

  const keyInsights = [
    firstText(
      keyMessages,
      'Sam’s messaging already frames the value of personalisation in customer-friendly language.',
    ),
    targetAudience.length > 0
      ? `The target audience is defined enough to support a focused launch: ${targetAudience[0]}.`
      : 'The current brief needs a more precise launch audience before wider rollout.',
    campaignCount > 0
      ? `There are ${campaignCount} campaign concept(s) available for a controlled business test.`
      : 'Campaign ideas should be simplified before they are turned into a business test.',
    customerMessages.length > 0
      ? 'Customer-facing messaging is ready to be used in a pilot or a presentation.'
      : 'Customer messaging should be tightened before a customer-facing launch.',
  ]

  const recommendedNextStep =
    campaignCount > 0
      ? `Start with ${campaignIdeas[0]} as the pilot message, then measure engagement and customer response before expanding.`
      : 'Refine the communication brief into one pilot message, then validate it with customers before scaling.'

  return {
    agent: 'Daniel',
    role: danielMetadata.role,
    status: 'completed',
    decisionSummary,
    priorities,
    businessActions,
    keyInsights,
    campaignCount,
    recommendedNextStep,
    handoff: {
      sourceAgent: 'Sam',
      destinationAgent: 'Daniel',
      completed: true,
    },
  }
}

export { danielMetadata }