# AI Evaluator Backend

Backend service for evaluating candidates by comparing their **CV** and **project report** against a **job vacancy description** and a **study case brief**.  
It demonstrates backend engineering combined with AI workflows: prompt design, LLM chaining, retrieval-augmented generation (RAG), resilience, and long-running process handling.

---

## Features

- **Upload CV & Project Report** (`/upload`) – supports plain text, PDF, or DOCX.
- **Async Evaluation Pipeline** (`/evaluate`, `/result/{id}`) – returns a job ID, status evaluation processing.
- **Evaluation Parameters**
    - CV Match Rate (skills, experience, achievements, cultural fit).
    - Project Scoring (correctness, code quality, resilience, documentation, creativity).
- **RAG Integration** – retrieves job description & rubric from a vector DB for targeted scoring.
- **Using LLM OpenAI**

---

## Instructions

### 1. Clone Project

```bash
git clone https://github.com/Taufik0101/ai-cv-evaluator.git
```

### 2. Instalation

```bash
cp .env.example .env

fill OPENAI_API_KEY

pnpm install

pnpm start
