import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

/**
 * Analyzes a detected vulnerability using an LLM to determine if it's a false positive.
 * @param {Object} vuln - The vulnerability object
 * @param {string} context - Optional HTTP response or context string
 * @returns {Promise<Object>} JSON containing isFalsePositive and reason
 */
export async function analyzeVulnerability(vuln, context = '') {
  // Skip if no API key is provided
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key') {
    return { isFalsePositive: false, confidence: 0, reason: "AI Disabled (No API Key)" };
  }

  try {
    const prompt = `
You are an expert application security engineer. Analyze this reported vulnerability and determine if it is a false positive.
    
Vulnerability Type: ${vuln.type}
Severity: ${vuln.severity}
Title: ${vuln.title}
URL: ${vuln.url}
Parameter: ${vuln.parameter || 'N/A'}
Evidence/Payload: ${vuln.evidence}

Context/Response Snippet:
${context || 'No additional context provided'}

Respond ONLY with a valid JSON object in this format:
{
  "isFalsePositive": boolean,
  "confidence": number, // 0 to 100
  "reason": "short explanation of your finding"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI Analysis failed:", error.message);
    // Fail open: assume it's a real vulnerability if the AI fails
    return { isFalsePositive: false, confidence: 0, reason: "AI Analysis Error" };
  }
}
