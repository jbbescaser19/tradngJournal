import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadDirectory } from '../config/paths.js';

const MIME_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

function extractOutputText(response) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  const parts = (response.output || []).flatMap((item) => item.content || []);
  return parts.filter((item) => item.type === 'output_text' && item.text).map((item) => item.text).join('\n').trim();
}

export async function analyzeScreenshot(trade) {
  const filename = path.basename(trade.screenshot);
  const filePath = path.join(uploadDirectory, filename);
  const extension = path.extname(filename).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) {
    const error = new Error('This screenshot format cannot be analyzed. Please use JPG, PNG, or WEBP.');
    error.status = 400;
    throw error;
  }

  const image = await fs.readFile(filePath);
  const dataUrl = `data:${mimeType};base64,${image.toString('base64')}`;
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const prompt = `You are reviewing a personal trading journal screenshot. Give cautious, educational chart observations, not financial advice.

Trade metadata (may be incomplete):
- Instrument: ${trade.symbol}
- Direction: ${trade.direction}
- Recorded result: ${trade.result}
- Trade date/time: ${new Date(trade.tradeDate).toISOString()}
- Entry: ${trade.entryPrice ?? 'not provided'}
- Take profit: ${trade.takeProfit ?? 'not provided'}
- Stop loss: ${trade.stopLoss ?? 'not provided'}
- Planned risk/reward: ${trade.riskReward ?? 'not provided'}
- Trader notes: ${trade.notes || 'none'}

Review the screenshot with these short headings:
1. What is visible: describe only chart features and levels that are actually readable.
2. Possible reason for the result: discuss plausible ways the visible setup could have reached the recorded TP/SL, but do not claim causation unless the screenshot clearly supports it.
3. What supports or weakens the setup: mention trend, range, support/resistance, or entry timing only if visible.
4. Lesson to consider: give 1-3 neutral questions or process improvements to review.
5. Confidence and missing information: say what cannot be confirmed from a single screenshot.

Do not invent indicator values, candle movement outside the screenshot, exact price paths, or market news. A winning trade is not automatically a good decision and a losing trade is not automatically a bad decision. If the screenshot is too unclear, say so directly.`;

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: dataUrl, detail: 'high' }
          ]
        }],
        max_output_tokens: 1000
      }),
      signal: AbortSignal.timeout(60000)
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      const timeoutError = new Error('The chart review timed out. Please try again.');
      timeoutError.status = 504;
      throw timeoutError;
    }
    const networkError = new Error('Could not connect to the AI review service. Check your internet connection and try again.');
    networkError.status = 502;
    throw networkError;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || 'The AI review request failed.';
    const error = new Error(response.status === 401 ? 'The AI API key was rejected. Check OPENAI_API_KEY in backend/.env.' : message);
    error.status = response.status === 429 ? 429 : response.status >= 500 ? 502 : 400;
    throw error;
  }

  const text = extractOutputText(body);
  if (!text) {
    const error = new Error('The AI service returned no review text. Please try again.');
    error.status = 502;
    throw error;
  }
  return { text, model };
}
