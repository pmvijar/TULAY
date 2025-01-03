// @TODO
// - Handle image input
// - replace with RAG all of them
// - Handle conversation history from browser session

import { generateChatCompletion } from "../clients/openaiClient.js"; // Import the OpenAI client function
import { getRagResponse } from "../clients/ragClient.js";

// Function to generate insights based on statistical results
export const getInsights = async (request, reply) => {
  try {
    // EXPECTED REQUEST { "statisticalData": {...} }
    const { statisticalData } = request.body;

    // Check if the request body is empty or statisticalData is empty
    if (!statisticalData || Object.keys(statisticalData).length === 0) {
      return reply
        .code(400)
        .send({ error: "Invalid statistical data provided." });
    }
    const prompt = `
You are an AI that generates insights from statistical traffic data. The data has been pre-processed to reveal key patterns, relationships, and trends. Your task is to interpret the results and provide actionable insights.

Based on the following statistical data: ${JSON.stringify(
      statisticalData
    )}, please generate the following:

1. A list of THREE (3) insights that highlight key findings, trends, or potential implications for traffic management. Ensure each insight is actionable or helps decision-making.
2. A list of THREE (3) main variables used in this analysis, detailing their significance and how they contribute to the findings. Focus on those variables that had the most impact on the insights.
3. A list of THREE (3) suggested user prompts that a user can ask to explore the insights further. Keep each prompt short (under 15 tokens). Example: "What are the peak traffic times?", "How does speed affect fuel efficiency?"

Please format your response as follows:

{
  insights: [
    { title: "Insight 1", description: "Explanation of the insight and its relevance to traffic management" },
    { title: "Insight 2", description: "Same thing" },
    { title: "Insight 3", description: "Same thing" }
  ],
  variables: [ // Make sure the attribute names are in Normal Casing, not camelCase
    { attributeName: "Variable Name 1", usage: "Explanation of how this variable was used and why it is important" },
    { attributeName: "Variable Name 2", usage: "Same thing" },
    { attributeName: "Variable Name 3", usage: "Same thing" }
  ],
  suggestedPrompts: [
    "Suggested prompt 1",
    "Suggested prompt 2",
    "Suggested prompt 3"
  ]
}

Note: Only respond with the JSON string, no other yappers.
`;

    const insightsObject = await getRagResponse(prompt);
    return reply.code(200).send(insightsObject);
  } catch (error) {
    console.error("Error in getInsights:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

// New helper function to handle insights generation
const generateInsights = async (prompt) => {
  try {
    const insightsResponse = await getRagResponse(prompt);
    const insightsObject = JSON.parse(insightsResponse);

    // Validate
    if (
      !insightsObject.insights ||
      !insightsObject.variables ||
      !insightsObject.suggestedPrompts
    ) {
      throw new Error("Invalid insights structure: Missing required fields.");
    }

    return insightsObject;
  } catch (error) {
    console.error("Error generating insights:", error);
    throw new Error("Generation Error: " + error.message);
  }
};

export const getPolicyRecommendation = async (request, reply) => {
  try {
    const { insightData } = request.body;

    // Validate insightData structure
    if (!insightData || typeof insightData !== "object") {
      throw new Error("Invalid insightData: Must be a non-null object.");
    }

    const prompt = `
You are an AI that generates policy recommendations based on traffic insights. The insights provided highlight key traffic management issues and reveal patterns and relationships critical for effective policy-making. Your task is to use these insights to generate targeted, actionable policy recommendations.

Based on the following insights: ${JSON.stringify(
      insightData
    )}, please generate the following:

1. A list of THREE (3) policy recommendations, where each recommendation provides a specific action or adjustment to improve traffic flow, fuel efficiency, or passenger distribution.
2. Each policy should include:
   - A concise policy description detailing how the policy will be implemented.
   - A rationale that justifies how the policy is based on the provided insights and explains its expected impact on transportation efficiency.

Format your response as follows (example):
**Policy Recommendation #1**: Brief Title of Policy
**Description:**
**Rationale:**

Note: Only respond with the string, no additional commentary.
`;

    const policyObject = await generatePolicyRecommendation(prompt);
    return reply.code(200).send(policyObject);
  } catch (error) {
    console.error("Error in getPolicyRecommendation:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

const generatePolicyRecommendation = async (prompt) => {
  try {
    const policyResponse = await getRagResponse(prompt);
    const policyObject = { response: policyResponse };

    return policyObject;
  } catch (error) {
    console.error("Error generating policy:", error);
    throw new Error("Generation Error: " + error.message);
  }
};

export const getRelevantResponse = async (request, reply) => {
  try {
    const { userPrompt, conversationHistory = [] } = request.body; // Default to empty array
    console.log("User Prompt:", userPrompt);

    if (!userPrompt || Object.keys(userPrompt).length === 0) {
      return reply.code(400).send({ error: "Invalid user prompt provided." });
    }

    // Validate conversationHistory
    if (!Array.isArray(conversationHistory)) {
      return reply.code(400).send({
        error: "Invalid conversation history provided. It must be an array.",
      });
    }

    const prompt = `You are an AI chatbot designed to respond exclusively to inquiries related to the following topics: 

1. Buses
2. Urban Mobility
3. Transportation
4. Traffic Management
5. Vehicle Efficiency (including fuel usage and engine load)
6. Environmental Impacts of Transportation
7. And all other topics with a second-degree relation to these

NOTE: Even if the prompt does not appear in the context, please feel free to answer, no need to say that it isn't in the context.
However, whatever is in the document must take priority.

Please only respond if the user prompt pertains to these areas: ${JSON.stringify(
      userPrompt
    )}. Here is the conversation history: ${JSON.stringify(
      conversationHistory
    )}.
`;

    const promptResponse = await getRagResponse(prompt);
    const responseObject = { response: promptResponse };

    return reply.code(200).send(responseObject);
  } catch (error) {
    console.error("Error generating policy:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

export const getAugmentedResponse = async (request, reply) => {
  try {
    const { userPrompt } = request.body;

    if (!userPrompt || Object.keys(userPrompt).length === 0) {
      return reply.code(400).send({ error: "Invalid user prompt provided." });
    }

    const prompt = `You are an AI chatbot that only entertains prompts that are related to the topics: Sustainable Urban Mobility related topics, Transportation Demand Management related topics, Traffic related Topics, Vehicle related Topics (such as fuel usage, engine load), and how this affects the environment.
    Please respond to this prompt only if it is relevant: ${JSON.stringify(
      userPrompt
    )}`;
    const promptResponse = await getRagResponse(prompt);
    const responseObject = { response: promptResponse };

    return reply.code(200).send(responseObject);
  } catch (error) {
    console.error("Error getting augmented response:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};
/*
export const getMapContext = async (request, reply) => {
  try {
    const { mapContext } = request.body;

    if (!mapContext || Object.keys(mapContext).length === 0) {
      return reply.code(400).send({ error: "Invalid map context provided." });
    }
  } catch (error) {
    console.error("Error generating map context");
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

export const getInsightReport = async (request, reply) => {
  try {
    // EXPECTED REQUEST { "statisticalData": {...} }
    const { statisticalData } = request.body;

    // Check if the request body is empty or statisticalData is empty
    if (!statisticalData || Object.keys(statisticalData).length === 0) {
      return reply
        .code(400)
        .send({ error: "Invalid statistical data provided." });
    }

    const prompt = `ROLE: You are a data analyst specialized in traffic management`;

    const insightsObject = await generateInsights(prompt);
    return reply.code(200).send(insightsObject);
  } catch (error) {
    console.error("Error in getInsights:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};
*/
