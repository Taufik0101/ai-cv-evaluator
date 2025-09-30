const {OpenAI} = require("openai");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-small"; // change if needed

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const inMemoryStore = {};
function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

function chunkText(text, maxChars = 800) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        let end = Math.min(i + maxChars, text.length);
        // Prefer to cut on newline or space
        if (end < text.length) {
            const lastNewline = text.lastIndexOf("\n", end);
            const lastSpace = text.lastIndexOf(" ", end);
            const cut = Math.max(lastNewline, lastSpace);
            if (cut > i) end = cut;
        }
        chunks.push(text.slice(i, end).trim());
        i = end + 1;
    }
    return chunks.filter(Boolean);
}

class VectorStore {
    constructor() {
        this.docs = [];
    }

    async upsertDocuments(namespace, docs, options = {}) {
        const texts = docs.map(d => d.text);
        const embedResp = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: texts,
        });
        const embeddings = embedResp.data.map(d => d.embedding);

        if (!inMemoryStore[namespace]) inMemoryStore[namespace] = [];

        for (let i = 0; i < docs.length; i++) {
            const id = docs[i].id || crypto.randomUUID();
            const entry = {
                id,
                text: docs[i].text,
                metadata: docs[i].metadata || {},
                embedding: embeddings[i],
            };

            inMemoryStore[namespace] = inMemoryStore[namespace].filter(e => e.id !== id);
            inMemoryStore[namespace].push(entry);
        }

        return true;
    }

    async querySimilar(namespace, queryText, topK = 5) {
        const embedResp = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: [queryText],
        });
        const qEmbedding = embedResp.data[0].embedding;

        const candidates = inMemoryStore[namespace] || [];
        const scored = candidates.map(c => ({
            ...c,
            score: cosine(qEmbedding, c.embedding),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    }

    async storeJobAndRubric(jobDoc) {
        const namespace = `job:${jobDoc.jobId}`;

        this.docs.push({
            id: `${jobDoc.jobId}::jobdesc`,
            text: jobDoc.jobDescription,
            metadata: {type: "job_description"},
        });

        let rubricText = jobDoc.scoringRubricText || "";
        if (!rubricText && jobDoc.scoringRubric) {
            rubricText = Object.entries(jobDoc.scoringRubric)
                .map(([k, v]) => `${k}:\n${JSON.stringify(v)}`)
                .join("\n\n");
        }

        const rubricChunks = chunkText(rubricText, 1000);
        rubricChunks.forEach((txt, idx) => {
            this.docs.push({
                id: `${jobDoc.jobId}::rubric::${idx}`,
                text: txt,
                metadata: {type: "rubric", chunkIndex: idx},
            });
        });

        await this.upsertDocuments(namespace, this.docs);
        return true;
    }
}

module.exports = VectorStore;
