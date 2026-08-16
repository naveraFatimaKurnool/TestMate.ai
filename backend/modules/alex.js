function getTopValues(values = []) {
  return values.slice(0, 4)
}

export function getAlexProductBrief(linaBrief) {
  if (!linaBrief) {
    throw new Error(
      'Alex cannot run because Lina did not provide a customer experience brief.',
    )
  }

  const designGoals = Array.isArray(linaBrief.designGoals)
    ? linaBrief.designGoals
    : []

  const customerExperienceNeeds = Array.isArray(
    linaBrief.customerExperienceNeeds,
  )
    ? linaBrief.customerExperienceNeeds
    : []

  const researchSignals = Array.isArray(linaBrief.researchSignals)
    ? linaBrief.researchSignals
    : []

  const experienceOpportunities = Array.isArray(
    linaBrief.experienceOpportunities,
  )
    ? linaBrief.experienceOpportunities
    : []

  const designRecommendations = Array.isArray(
    linaBrief.designRecommendations,
  )
    ? linaBrief.designRecommendations
    : []

  const proposedJourney = Array.isArray(linaBrief.proposedJourney)
    ? linaBrief.proposedJourney
    : []

  return {
    agent: 'Alex',
    role: 'AI Product Maker',
    generatedAt: new Date().toISOString(),
    handoffFrom: 'Lina',

    source: {
      agent: 'Lina',
      dataSource: linaBrief.source?.dataSource || 'Lina Experience Brief',
    },

    summary:
      'Alex transformed Lina’s customer experience design into a practical AI product and workflow direction for TasteMate AI.',

    productGoals: getTopValues([
      ...designGoals,
      'Create a simple AI-assisted restaurant recommendation experience.',
    ]),

    customerRequirements: getTopValues([
      ...customerExperienceNeeds,
      ...researchSignals,
    ]),

    productOpportunities: getTopValues(experienceOpportunities),

    coreFeatures: [
      {
        feature: 'Customer Preference Profile',
        description:
          'Capture relevant customer preferences such as cuisine, dietary needs, favourite foods, and dining preferences.',
      },
      {
        feature: 'Personalised Recommendation Engine',
        description:
          'Use customer preference signals and restaurant/menu information to generate relevant food recommendations.',
      },
      {
        feature: 'Recommendation Explanation',
        description:
          'Explain why a particular restaurant or menu item has been recommended to the customer.',
      },
      {
        feature: 'Menu Exploration',
        description:
          'Allow customers to explore and compare suitable dishes with minimal effort.',
      },
      {
        feature: 'Customer Feedback',
        description:
          'Capture feedback about recommendations so future recommendations can become more relevant.',
      },
    ],

    aiWorkflow: [
      {
        stage: 'Collect',
        description:
          'Collect customer preferences and relevant restaurant or menu information.',
      },
      {
        stage: 'Analyse',
        description:
          'Analyse customer signals against available restaurant and menu data.',
      },
      {
        stage: 'Recommend',
        description:
          'Generate personalised restaurant or food recommendations.',
      },
      {
        stage: 'Explain',
        description:
          'Provide a simple explanation for why the recommendation matches the customer.',
      },
      {
        stage: 'Learn',
        description:
          'Use customer feedback to improve future recommendations.',
      },
    ],

    customerJourneyMapping: proposedJourney.map((stage) => ({
      stage: stage.stage,
      productResponse: stage.description,
    })),

    designToProductTranslation: getTopValues(designRecommendations),

    implementationConsiderations: [
      'Keep the customer interaction simple and easy to understand.',
      'Make recommendation reasoning visible to support user trust.',
      'Protect customer preference data and avoid unnecessary data collection.',
      'Allow customers to provide feedback or correct their preferences.',
      'Keep the workflow flexible enough to support different restaurant contexts.',
    ],

    recommendationsForSam: [
      'Translate the product value into clear customer-facing messaging.',
      'Explain the benefits of personalised food recommendations in simple language.',
      'Highlight transparency and customer control over recommendations.',
      'Create communication messages that encourage customers to provide preferences and feedback.',
    ],

    handoffTo: 'Sam',
  }
}

export const alexMetadata = {
  name: 'Alex',
  role: 'AI Product Maker',
  description:
    'Transforms Lina’s customer experience design into a practical AI product and workflow.',
}