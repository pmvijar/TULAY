/*
  NOTE: This module only works when you have R2R running on your local system or Docker.
        To setup: https://r2r-docs.sciphi.ai/documentation/installation/light/docker
                  https://r2r-docs.sciphi.ai/documentation/js-sdk/introductions
*/

import { r2rClient } from "r2r-js";

export async function getRagResponse(prompt) {
  try {
    const client = new r2rClient("http://localhost:7272");
    console.log("R2R Client initialized successfully.");
    const healthResponse = await client.health();
    console.log(healthResponse);

    const ragResponse = await client.rag(
      prompt,
      {},
      {
        /* Knowledge Graph Settings */
      },
      {
        model: "gpt-4o-mini",
        temperature: 0.2,
      }
    );

    // Extract response from result object
    const completionContent =
      ragResponse.results.completion.choices[0].message.content;

    // Call the new function to clean up the completion content
    const cleanedContent = removeNumberPlaceholders(completionContent);

    return cleanedContent; // Return the cleaned content
  } catch (error) {
    console.error("Error during RAG response processing:", error.message);
    console.error("Full error details:", error);
    throw new Error("Failed to get RAG response");
  }
}

// New function to remove [number] patterns from the string
function removeNumberPlaceholders(content) {
  return content.replace(/\[\d+\]/g, ""); // Updated regex to match [number]
}
