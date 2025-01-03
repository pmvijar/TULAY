import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openAIClient = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export async function generateChatCompletion(prompt) {
  try {
    const response = await openAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("No completion choices returned from the API");
    }

    const content = response.choices[0].message.content;
    if (!content || content.trim().length === 0) {
      throw new Error("Empty or null completion returned from the API");
    }

    return content;
  } catch (error) {
    console.error("Error generating chat completion:", error);
    throw new Error("Failed to generate chat completion: " + error.message);
  }
}
