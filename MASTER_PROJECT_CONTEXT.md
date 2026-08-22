# MASTER PROJECT CONTEXT — AI Product Intelligence Studio (v2.0 Advanced Architecture)
# READ THIS BEFORE DOING ANYTHING

> ⚠️ **IMPORTANT FOR ANTIGRAVITY IDE / ANY AI ASSISTANT:**
> This file contains the COMPLETE v2.0 context of this project.
> The user (Vamshi Krishna) is the **AI Engine Developer & Project Lead**.
> **DO NOT write, generate, or execute ANY code without Vamshi's explicit approval.**
> We are currently in the PLANNING & DISCUSSION PHASE ONLY.

---

## WHO IS VAMSHI KRISHNA?
- **Role:** Member 1 — AI Engine Developer + Project Lead
- **Hardware:** NVIDIA RTX 4060 (8GB VRAM), 16GB RAM, 2TB External Drive
- **Constraint:** $0 budget — everything must be FREE (Ollama, OpenRouter free tier, Groq, Gemini)
- **Timeline:** 7-day hackathon ("UniHack")

---

## WHAT IS THIS PROJECT?
**Name:** AI-Powered Product Intelligence Platform for Industrial Commerce
**Goal:** Ingest messy catalogs from ANY format (CSV, PDF, URL, Image) and output a clean, validated **252-column commerce-ready dataset**.

---

## THE $0 SMART MODEL MESH (ROSTER)

Instead of one model doing everything, the AI Engine uses a **Task-Aware Specialized Router** with Mid-Task Rescue capabilities. If a cloud API hits a rate limit, the system auto-cascades to a rescue model with zero downtime.

| Task Category | Primary Specialist | Rescue (Fallback 1) | Ultimate Fallback (Unlimited) |
| :--- | :--- | :--- | :--- |
| **1. Massive Files & Images** (URLs, 300-pg PDFs) | **Gemini 2.0 Flash** *(Google API, 1M Context)* | **Ox Alpha** *(OpenRouter, 1M Context)* | **Local Qwen-VL / Llava** *(Ollama)* |
| **2. Deep Reasoning** (Ambiguous brands, MPNs) | **Ox Alpha** *(OpenRouter, Stealth Model)* | **Nemotron 70B** *(OpenRouter)* | **Local Qwen 2.5 7B** *(Ollama)* |
| **3. Fast Data Extraction** (JSON, Descriptions) | **Llama 3.3 70B** *(Groq, 300+ tokens/sec)* | **Gemini 2.0 Flash** *(Google API)* | **Local Qwen 2.5 7B** *(Ollama)* |

---

## THE 6 ADVANCED ARCHITECTURAL LAYERS

1. **Smart Router Mesh:** Routes tasks to the best model (Groq for speed, Ox Alpha for logic, Gemini for massive text/images). Includes auto-failover on HTTP 429 rate limits.
2. **Consensus Engine (Tie-Breaker):** For the hardest fields (Brand & Manufacturer), the engine asks 2 models. If they disagree, a 3rd model breaks the tie.
3. **Vector Memory Cache (ChromaDB):** Stored on the 2TB drive. Searches past processed products. If a 90%+ similarity match is found, it reuses the LLM data, dropping processing time to 0.1s and saving tokens.
4. **Deterministic Quality Auditor (0 Tokens):** A pure Python module that intercepts the AI output to enforce character limits (e.g., Invoice <=40 chars ALL CAPS) and UOM rules *before* saving.
5. **Live Web Search & Scraping ($0 Cost):** Uses `duckduckgo_search` (free), `trafilatura`, and `BeautifulSoup` to scrape live e-commerce URLs (Amazon, Flipkart) for missing images and specs.
6. **Progressive Frontend Updates:** UI polls the backend to show real-time live processing updates per product, rather than making the user wait 5 minutes for a batch to finish.

---

## THE STEP-BY-STEP PIPELINE

1. **Memory Check:** ChromaDB checks if the product was already processed. If yes, skip to end.
2. **Web/Vision Expansion:** If input is a URL or Image, Gemini reads the specs/images.
3. **Identity Resolution:** Ox Alpha reasons out the true Manufacturer and Brand (resolving distributor vs. brand conflicts).
4. **High-Speed Extraction:** Groq Llama 3.3 70B extracts the attributes and generates all 5 strict description formats (Invoice, Mobile, Short, Long, Retail).
5. **Quality Audit:** Python script enforces rules and formats.
6. **Output:** 252-Column final record is saved to DB, UI is updated, and Vector Memory is updated.

---

## FOLDER STRUCTURE (Vamshi's AI Engine Module)

```
ai_engine/
├── __init__.py
├── universal_engine.py   ← Orchestrates the 6 steps
├── smart_router.py       ← The Model Mesh (Groq, Gemini, Ox Alpha, Ollama)
├── consensus.py          ← Multi-model voting logic
├── memory.py             ← ChromaDB Vector Cache
├── web_enricher.py       ← DuckDuckGo + URL Scraping
├── normalizer.py         ← Quality Auditor (Deterministic rules)
└── prompts/              ← Stored text prompts

shared/
└── schemas/
    └── product.py        ← Canonical Pydantic schemas (Vamshi OWNS this)
```

---

## ⚠️ INSTRUCTION FOR ANTIGRAVITY IDE

You now have the COMPLETE, advanced v2.0 context of this project.

**Your current role is:**
1. ✅ Understand that the architecture is FULLY LOCKED IN.
2. ✅ Help Vamshi write the Python implementation for these specific modules.
3. ⛔ DO NOT suggest new architectural additions (we must prevent feature creep).
4. ⛔ DO NOT start writing code until Vamshi says `"Start building"` or `"Proceed"`.

Wait for Vamshi's explicit command to begin coding Step 1.
---
*Context file generated from UniHack planning session.*
*Last updated: 2026-08-22*
