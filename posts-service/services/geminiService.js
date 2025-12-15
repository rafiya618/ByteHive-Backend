import axios from "axios";

export const analyzePostContent = async (post) => {
  try {
    const prompt = `
You are an AI content moderator. Analyze the following post:

Category: ${post.category}
Title: ${post.post_title}
Description: ${post.small_description}
Content: ${post.post_description}
Community: ${post.community}

Rules:
1. Relevance: Provide a "relevance_score" between 0.0 and 1.0.
   - 1.0 = fully relevant to the community
   - 0.0 = completely irrelevant
   - Slightly off-topic posts should get a partial score, not zero.
2. Quality: Measure writing clarity, structure, informativeness, and technical accuracy.
   - Provide a "quality_score" between 0.0 and 1.0
   - Do not assign 0 automatically for slightly irrelevant posts.
3. Detect policy violations: NSFW, hate speech, violence, spam.
4. Provide actionable suggestions to fix policy violations, improve relevance and quality.

Return ONLY a valid JSON object with the structure:
{
  "relevance_score": number,
  "relevance_reason": string,
  "violations": {
    "nsfw": boolean,
    "hate_speech": boolean,
    "violence": boolean,
    "spam": boolean
  },
  "quality_score": number,
  "suggestions": [ "string" ]
}
Do NOT include any explanation outside JSON.
    `;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "amazon/nova-2-lite-v1:free",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000", // optional but recommended
          "X-Title": "Post QA Microservice"
        }
      }
    );

    const rawText = response.data.choices[0].message.content;
    console.log('response by gemini', rawText )
    // Clean up JSON in case model wraps in backticks or markdown
    const cleaned = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error("OpenRouter Error:", err.response?.data || err.message);

    return {
      is_relevant: false,
      relevance_reason: "AI validation failed",
      violations: { nsfw: false, hate_speech: false, violence: false, spam: false },
      quality_score: 0,
      suggestions: ["AI validation error, manual review required"]
    };
  }
};
