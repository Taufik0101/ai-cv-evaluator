const OpenAI = require('openai');
const dotenv = require('dotenv');
dotenv.config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function safeJsonParse(text) {
    try { return JSON.parse(text); } catch { return null; }
}

async function callLLM(prompt) {
    try {
        const completion = await client.chat.completions.create({
            model: 'gpt-5-mini',
            messages: [{ role: 'user', content: prompt }],
        });
        const content = completion.choices[0].message.content;
        return await safeJsonParse(content) || { raw: content };
    } catch (err) {
        console.error('LLM error', err);
        return null;
    }
}

module.exports = { callLLM };