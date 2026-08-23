"""
Connectivity Tester for AI Engine Smart Router Mesh
Owned by Vamshi Krishna (AI Engine Lead)
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# Ensure the project root is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

env_path = os.path.join(root_dir, '.env')
load_dotenv(env_path)

from shared.config.settings import GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, OLLAMA_BASE_URL
import httpx

async def test_groq():
    print("\n[1] Testing Groq (Llama 3.3 70B)...")
    if not GROQ_API_KEY:
        print("SKIPPED: No GROQ_API_KEY found in .env")
        return
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"}
            )
            if response.status_code == 200:
                print("SUCCESS: Groq API Key is valid and connected!")
            else:
                print(f"ERROR: Groq returned status {response.status_code}")
    except Exception as e:
        print(f"ERROR: Connection failed: {e}")

async def test_gemini():
    print("\n[2] Testing Google Gemini...")
    if not GEMINI_API_KEY:
        print("SKIPPED: No GEMINI_API_KEY found in .env")
        return
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
            )
            if response.status_code == 200:
                print("SUCCESS: Gemini API Key is valid and connected!")
            else:
                print(f"ERROR: Gemini returned status {response.status_code}")
    except Exception as e:
        print(f"ERROR: Connection failed: {e}")

async def test_openrouter():
    print("\n[3] Testing OpenRouter...")
    if not OPENROUTER_API_KEY:
        print("SKIPPED: No OPENROUTER_API_KEY found in .env")
        return
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
            )
            if response.status_code == 200:
                print("SUCCESS: OpenRouter API Key is valid and connected!")
            else:
                print(f"ERROR: OpenRouter returned status {response.status_code}")
    except Exception as e:
        print(f"ERROR: Connection failed: {e}")

async def test_ollama():
    print("\n[4] Testing Local Ollama (Ultimate Fallback)...")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                print("SUCCESS: Local Ollama daemon is running!")
            else:
                print(f"ERROR: Ollama returned status {response.status_code}")
    except Exception as e:
        print(f"OFFLINE: Local Ollama is not running on {OLLAMA_BASE_URL}")

async def main():
    print("==================================================")
    print("AI ENGINE CONNECTIVITY DIAGNOSTICS")
    print("==================================================")
    env_path = os.path.join(root_dir, '.env')
    load_dotenv(env_path)
    await test_groq()
    await test_gemini()
    await test_openrouter()
    await test_ollama()
    print("\n==================================================")
    print("Diagnostics Complete.")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
