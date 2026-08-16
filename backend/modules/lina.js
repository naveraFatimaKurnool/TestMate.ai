function getTopValues(values = []) {
  return values.slice(0, 3)
}

export function getLinaExperienceBrief(mayaBrief) {
  if (!mayaBrief) {
    throw new Error('Lina cannot run because Maya did not provide a research brief.')
  }

  const keyFindings = Array.isArray(mayaBrief.keyFindings)
    ? mayaBrief.keyFindings
    : []

  const customerNeeds = Array.isArray(mayaBrief.customerNeeds)
    ? mayaBrief.customerNeeds
    : []

  const opportunities = Array.isArray(mayaBrief.opportunities)
    ? mayaBrief.opportunities
    : []

  const recommendations = Array.isArray(
    mayaBrief.recommendationsForNextAgent,
  )
    ? mayaBrief.recommendationsForNextAgent
    : []

  const highPriorityFindings = keyFindings.filter(
    (finding) =>
      String(finding.importance).toLowerCase() === 'high',
  )

  return {
    agent: 'Lina',
    role: 'Customer Experience Designer',
    generatedAt: new Date().toISOString(),
    handoffFrom: 'Maya',

    source: {
      agent: 'Maya',
      dataSource: mayaBrief.dataSource || 'Maya Research Brief',
    },

    summary:
      'Lina transformed Maya’s research findings into a customer experience design direction for TasteMate AI.',

    designGoals: [
      'Make recommendations feel relevant to individual customer preferences.',
      'Reduce friction when customers choose meals and menu options.',
      'Use customer preference signals to create a clearer dining journey.',
      'Present recommendations in a simple and understandable way.',
    ],

    customerExperienceNeeds: getTopValues(customerNeeds),

    researchSignals: getTopValues(
      highPriorityFindings.length > 0
        ? highPriorityFindings.map(
            (finding) =>
              `${finding.finding} ${finding.evidence || ''}`.trim(),
          )
        : keyFindings.map(
            (finding) =>
              `${finding.finding} ${finding.evidence || ''}`.trim(),
          ),
    ),

    experienceOpportunities: getTopValues(opportunities),

    designRecommendations: getTopValues(recommendations),

    proposedJourney: [
      {
        stage: 'Discover',
        description:
          'Understand the customer and identify relevant dining preferences.',
      },
      {
        stage: 'Explore',
        description:
          'Present menu options that match the customer preference signals.',
      },
      {
        stage: 'Choose',
        description:
          'Help the customer compare suitable options with minimal effort.',
      },
      {
        stage: 'Engage',
        description:
          'Provide a personalised recommendation and supporting explanation.',
      },
      {
        stage: 'Feedback',
        description:
          'Capture customer feedback to improve future recommendations.',
      },
    ],

    handoffTo: 'Alex',

    recommendationsForNextAgent: [
      'Use the customer journey to define the product workflow.',
      'Turn the experience goals into practical product features.',
      'Preserve customer preference signals throughout the workflow.',
    ],
  }
}

export const linaMetadata = {
  name: 'Lina',
  role: 'Customer Experience Designer',
  description:
    'Transforms Maya’s research findings into a customer-centred experience design.',
}