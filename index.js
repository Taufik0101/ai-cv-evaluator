import {jobDescriptionPrompt, scoringRubricPrompt} from "./utils/prompt";

const {extractCVPrompt} = require("./utils/prompt")
const {callLLM} = require("./services/llmClient")
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const Jobs = require('./jobsStore');
const Evaluator = require('./services/evaluator');
const Parser = require('./utils/parser');
const VectorStore = require('./services/vectorStore');

const upload = multer({storage: multer.memoryStorage()});

const app = express();
app.use(bodyParser.json());

const vectorDB = new VectorStore();
const scoringRubric = await scoringRubricPrompt();

const rubricText = JSON.stringify(scoringRubric, null, 2);

async function main() {
    const {v4: uuidv4} = await import("uuid");

    const jobDescription = await jobDescriptionPrompt()

    await vectorDB.storeJobAndRubric({
        jobId: uuidv4(),
        jobDescription,
        scoringRubricText: rubricText,
    });
}

main().catch(console.error);
app.post('/upload', upload.fields([{name: 'cv'}, {name: 'project'}, {name: 'meta'}]), async (req, res) => {
    try {

        const {v4: uuidv4} = await import("uuid");

        const id = uuidv4();
        const cvFile = req.files?.cv?.[0];
        const projectFile = req.files?.project?.[0];
        if (!cvFile || !projectFile) {
            return res.status(400).json({error: 'Please provide both cv and project files'});
        }
        const cvText = await Parser.parseBufferToText(cvFile);
        const projectText = await Parser.parseBufferToText(projectFile);

        const promptCV = await extractCVPrompt(cvText)

        const structured = await callLLM(promptCV);

        Jobs.create({
            id,
            status: 'uploaded',
            createdAt: Date.now(),
            payload: {
                cv: structured,
                projectText,
            }
        });
        return res.json({id, status: 'uploaded'});
    } catch (err) {
        return res.status(500).json({error: 'upload failed', details: err.message});
    }
});

app.post('/evaluate', async (req, res) => {
    try {
        const {id: providedId, cvText, projectText} = req.body;
        let job;
        if (providedId) {
            job = Jobs.get(providedId);
            if (!job) return res.status(404).json({error: 'job id not found'});
        }

        const {v4: uuidv4} = await import("uuid");

        const jobDescription = await jobDescriptionPrompt()

        const id = providedId || uuidv4();
        const payload = job ? job.payload : {cvText, projectText, meta: {}};
        Jobs.create({
            id,
            status: 'queued',
            createdAt: Date.now(),
            payload: {...payload, jobDescription: jobDescription || ''}
        });

        Evaluator.queueEvaluation({id, vectorDB, jobsStore: Jobs});
        return res.json({id, status: 'queued'});
    } catch (err) {
        return res.status(500).json({error: 'evaluate failed', details: err.message});
    }
});

app.get('/result/:id', (req, res) => {
    const job = Jobs.get(req.params.id);
    if (!job) return res.status(404).json({error: 'job not found'});
    return res.json({
        id: job.id,
        status: job.status,
        result: job.result
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
