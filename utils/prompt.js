const extractCVPrompt = async (cvText) => {
    return `You are an AI CV extractor
        
        TASK: extract key information from this candidate's CV information ${cvText}
        
        RULES:
        1. select exactly skills, experiences, projects, and description
        2. description mean personal information candidate
        3. project its different with experience, so find project very accurately
        
        OUTPUT JSON:
        {
            skills: [
                'JavaScript',
                'PHP',
                'Dart',
                'Vue.js',
                'Tailwind',
                'HTML',
                'Laravel',
                'C#',
                'Unity',
                'SQL',
                'Linux / Red Hat (RH134)',
                'Figma',
                'Canva',
                'SPSS',
                'VS Code',
                'Microsoft Office',
                'Indonesian (Native)',
                'English (Intermediate)'
            ],
            experiences: [
                'Software Engineer Intern (Front End Engineer) at PT. Stechoq Robotika Indonesia — Feb 2024 to Jun 2024 — Conducted weekly meetings with mentors to discuss progress and required features; created more efficient and user-friendly UI designs using Tailwind and Vue.js; collaborated with backend to build a dynamic website with admin-driven content updates.',
                'Lecturer Assistant, Practical Algorithm and Program class at Sebelas Maret University — ongoing (while studying) — Assisted in practical classes and supported students in coursework and labs.',
                'Coordinator of Decoration, Smart IT Fest — Jun 2023 to Sep 2023 — Coordinated staff to prepare event decorations and collaborated with other divisions for venue arrangement.',
                'Coordinator of Event and Liaison Officer, DILIGENCE — Oct 2023 to Nov 2023 — Coordinated event rundowns, helped develop event concepts and themes, coordinated event activities, and facilitated communication among participants, committee, and resource persons.'
            ],
            projects: [
                'Make Students Database — Designed and implemented database schema using Laravel; integrated Vue.js frontend for a responsive interactive UI; populated database with dummy data for testing.',
                'Design Prototype for Exam Online App and HRD App — Created detailed wireframes and UI elements in Figma; developed interactive prototypes to simulate user experience and gather feedback.',
                'Make Runner Game — Programmed game mechanics and player controls in C# within Unity; managed animated 3D models for characters and environment assets.'
            ],
            description: 'I am a backend engineer with hands-on experience designing, developing, and maintaining scalable SaaS platforms and enterprise systems across industries including point of sales, HR, and supply chain. My work spans microservices and event-driven architectures, leveraging technologies such as Go, Java, TypeScript/JavaScript, Node.js, Spring Boot, GraphQL, PostgreSQL, MySQL, Oracle, and Redis.

I have contributed to building POS backends, purchase and claim services, and attendance features, as well as a supply chain cloud platform microservice that improved visibility, analytics, and business decision-making. Beyond coding, I actively engage in code reviews, cross-functional collaboration, and agile practices with global and local teams ranging from small squads to groups of 20+ engineers.

Passionate about scalability, clean architecture, and delivering real business value, I thrive in collaborative environments where innovation and knowledge sharing drive high-quality outcomes.'
        }
        
        STYLE GUIDE:
        - skills: Array of string
        - projects: Array of string
        - experiences: Array of string
        - description: String
        `
}

const cvComparePrompt = async (cv, jobDescription, injectCvRubric) => {
    return `You are an AI CV Compare
        
        TASK: compare extracted cv ${JSON.stringify(cv)} with job vacancy ${jobDescription}
        
        RUBRIC CONTEXT (use these sections to guide scoring for the CV):
        ${injectCvRubric}
        
        RULES:
        1. provide match_rate and generate short feedback
        2. match_rate should be computed using the following components:
            a. Technical Skills Match (backend, databases, APIs, cloud, AI/LLM exposure).
            b. Experience Level (years, project complexity).
            c. Relevant Achievements (impact, scale)
            d. Cultural Fit (communication, learning attitude).
        
        OUTPUT JSON:
        {
            match_rate: 0.68,
            feedback: "Strong in backend and cloud, limited AI integration experience.",
        }
        
        STYLE GUIDE:
        - match_rate: Float between 0.0 and 1.0
        - feedback: String
        `
}

const projectComparePrompt = async (projectText, injectProjectRubric) => {
    return `You are an AI Project Report Compare
        
        TASK: get project report score and project feedback extracted project report ${projectText}
        
        RUBRIC CONTEXT (use these sections to guide scoring for the project):
        ${injectProjectRubric}
        
        RULES:
        1. provide project_score and generate short feedback
        2. project_score should use these parameters (1-5 each) then aggregated:
            a. Correctness (meets requirements: prompt design, chaining, RAG, handling errors).
            b. Code Quality (clean, modular, testable).
            c. Resilience (handles failures, retries).
            d. Documentation (clear README, explanation of trade-offs).
            e. Creativity / Bonus (optional improvements like authentication, deployment, dashboards).
           Each parameter can be scored 1–5, then aggregate to final score (e.g., sum or weighted average).
        
        OUTPUT JSON:
        {
            project_score: 7.5,
            feedback: "Strong in backend and cloud, limited AI integration experience.",
        }
        
        STYLE GUIDE:
        - project_score: Float
        - feedback: String
        `
}

const generateSummary = async (compareResp, projectRepResp) => {
    return `You are an AI Generate Summary Based On CV and Project Report
            
            TASK: generate summary based on ${JSON.stringify({
        cv_match_rate: compareResp.match_rate,
        cv_feedback: compareResp.feedback,
        project_score: projectRepResp.project_score,
        project_feedback: projectRepResp.feedback
    })}
            
            RULES:
            1. use cv_match_rate, cv_feedback, project_score, and project_feedback to generate short summary. dont put cv_match_rate, cv_feedback, project_score, and project_feedback inside feedback
            
            OUTPUT JSON:
            {
                overall_summary: "Good candidate fit, would benefit from deeper RAG knowledge."
            }
            
            STYLE GUIDE:
            - overall_summary: String`
}

const jobDescriptionPrompt = async () => {
    return `
        We’re looking for candidates with a strong track record of working on backend technologies of web apps, ideally with exposure to AI/LLM development or a strong desire to learn.

You should have experience with backend languages and frameworks (Node.js, Django, Rails), as well as modern backend tooling and technologies such as:

Database management (MySQL, PostgreSQL, MongoDB)
RESTful APIs
Security compliance
Cloud technologies (AWS, Google Cloud, Azure)
Server-side languages (Java, Python, Ruby, or JavaScript)
Understanding of frontend technologies
User authentication and authorization between multiple systems, servers, and environments
Scalable application design principles
Creating database schemas that represent and support business processes
Implementing automated testing platforms and unit tests
Familiarity with LLM APIs, embeddings, vector databases and prompt design best practices
We're not big on credentials, so a Computer Science degree or graduating from a prestigious university isn't something we emphasize. We care about what you can do and how you do it, not how you got here.
        `
}

const scoringRubricPrompt = async () => {
    return {
        cv_scoring: {
            "Technical Skills Match": "Check backend, databases, APIs, cloud, AI/LLM exposure. Score 1-5.",
            "Experience Level": "Years, complexity, seniority. Score 1-5.",
            "Relevant Achievements": "Impact, scale. Score 1-5.",
            "Cultural Fit": "Communication, learning attitude. Score 1-5.",
        },
        project_scoring: {
            "Correctness": "Meets requirements: prompt design, chaining, RAG, handling errors. Score 1-5.",
            "Code Quality": "Clean, modular, testable. Score 1-5.",
            "Resilience": "Handles failures, retries. Score 1-5.",
            "Documentation": "Clear README, explanation of trade-offs. Score 1-5.",
            "Creativity": "Optional improvements: auth, deploy, dashboards. Score 1-5.",
        },
    }
}

module.exports = {
    extractCVPrompt,
    cvComparePrompt,
    projectComparePrompt,
    generateSummary,
    jobDescriptionPrompt,
    scoringRubricPrompt
}