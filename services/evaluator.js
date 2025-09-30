const { callLLM} = require('./llmClient');
const {cvComparePrompt, projectComparePrompt, generateSummary} = require("../utils/prompt");

const workerConcurrency = 2;
const queue = [];
let running = 0;

function startWorker() {
    if (running >= workerConcurrency) return;
    running++;
    (async function workerLoop() {
        while (queue.length > 0) {
            const jobInfo = queue.shift();
            await processJob(jobInfo);
        }
        running--;
    })();
}

function queueEvaluation({ id, vectorDB, jobsStore }) {
    queue.push({ id, vectorDB, jobsStore });
    startWorker();
}

async function processJob({ id, vectorDB, jobsStore }) {
    const job = jobsStore.get(id);
    if (!job) return;
    jobsStore.update(id, { status: 'processing' });

    try {
        const { cv, projectText, jobDescription } = job.payload;

        const cvRubricRetrieved = await vectorDB.querySimilar(`job:${id}`, "rubric for CV scoring: technical skills, experience, achievements, cultural fit", 5);
        const projectRubricRetrieved = await vectorDB.querySimilar(`job:${id}`, "rubric for project scoring: correctness, code quality, resilience, documentation, creativity", 5);

        const injectCvRubric = cvRubricRetrieved.map(r => `- ${r.metadata.type || "rubric"}: ${r.text}`).join("\n\n");
        const injectProjectRubric = projectRubricRetrieved.map(r => `- ${r.metadata.type || "rubric"}: ${r.text}`).join("\n\n");

        const promptCompare = await cvComparePrompt(cv, jobDescription, injectCvRubric)

        const compareResp = await callLLM(promptCompare);

        const projectReportCompare = await projectComparePrompt(projectText, injectProjectRubric)

        const projectRepResp = await callLLM(projectReportCompare);

        const summaryPrompt = await generateSummary(compareResp, projectRepResp)

        const summaryResp = await callLLM(summaryPrompt)

        const result = {
            cv_match_rate: compareResp.match_rate,
            cv_feedback: compareResp.feedback,
            project_score: projectRepResp.project_score,
            project_feedback: projectRepResp.feedback,
            overall_summary: summaryResp.overall_summary
        };

        jobsStore.update(id, { status: 'completed', result });
    } catch (err) {
        console.error('evaluation error', err);
        jobsStore.update(id, { status: 'failed', error: err.message });
    }
}

module.exports = {
    queueEvaluation
};
