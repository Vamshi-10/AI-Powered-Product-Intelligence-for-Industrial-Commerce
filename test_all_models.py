import os
import sys
import httpx
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

groq_key = os.getenv("GROQ_API_KEY", "")
gemini_key = os.getenv("GEMINI_API_KEY", "")
openrouter_key = os.getenv("OPENROUTER_API_KEY", "")

print("================================================================")
print("             LIVE AI PROVIDER DIAGNOSTIC TEST")
print("================================================================")

# 1. Test Groq
print("\n[1/4] 🚀 TESTING GROQ (Llama / GPT 20B):")
if groq_key:
    try:
        r = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}"},
            json={"model": "openai/gpt-oss-20b", "messages": [{"role": "user", "content": "Respond ONLY with the text: GROQ ONLINE"}]},
            timeout=10
        )
        if r.status_code == 200:
            print(f"  ✅ STATUS: {r.status_code} OK")
            print(f"  💬 RESPONSE: {r.json()['choices'][0]['message']['content'].strip()}")
        else:
            print(f"  ⚠️ STATUS: {r.status_code}")
            print(f"  ℹ️ DETAILS: {r.text[:120]}")
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
else:
    print("  ❌ GROQ_API_KEY is not set in .env")

# 2. Test Google Gemini
print("\n[2/4] 🌐 TESTING GOOGLE GEMINI (Gemini 3 Flash):")
if gemini_key:
    try:
        r = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={gemini_key}",
            json={"contents": [{"parts": [{"text": "Respond ONLY with the text: GEMINI ONLINE"}]}]},
            timeout=10
        )
        if r.status_code == 200:
            print(f"  ✅ STATUS: {r.status_code} OK")
            print(f"  💬 RESPONSE: {r.json()['candidates'][0]['content']['parts'][0]['text'].strip()}")
        else:
            print(f"  ⚠️ STATUS: {r.status_code}")
            print(f"  ℹ️ DETAILS: {r.text[:120]}")
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
else:
    print("  ❌ GEMINI_API_KEY is not set in .env")

# 3. Test OpenRouter
print("\n[3/4] 🔄 TESTING OPENROUTER (Free Tier):")
if openrouter_key:
    try:
        r = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {openrouter_key}"},
            json={"model": "nvidia/nemotron-3.5-lightning:free", "messages": [{"role": "user", "content": "Respond ONLY with the text: OPENROUTER ONLINE"}]},
            timeout=10
        )
        if r.status_code == 200:
            print(f"  ✅ STATUS: {r.status_code} OK")
            print(f"  💬 RESPONSE: {r.json()['choices'][0]['message']['content'].strip()}")
        else:
            print(f"  ⚠️ STATUS: {r.status_code}")
            print(f"  ℹ️ DETAILS: {r.text[:120]}")
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
else:
    print("  ❌ OPENROUTER_API_KEY is not set in .env")

# 4. Test Local Ollama
print("\n[4/4] 🖥️ TESTING LOCAL OLLAMA (RTX 4060 GPU - 100% Unlimited):")
try:
    r = httpx.get("http://localhost:11434/api/tags", timeout=5)
    if r.status_code == 200:
        models = [m['name'] for m in r.json().get('models', [])]
        print(f"  ✅ STATUS: 200 OK (Running on your RTX 4060 GPU)")
        print(f"  📦 AVAILABLE LOCAL MODELS: {models}")
    else:
        print(f"  ⚠️ STATUS: {r.status_code}")
except Exception as e:
    print(f"  ⚠️ Ollama not reachable: {e}")

print("\n================================================================")
print("                     DIAGNOSTIC COMPLETE")
print("================================================================")
