"""
Smart Router Mesh — Task-Aware Specialized Model Router with Auto-Failover
Owned by Vamshi Krishna (AI Engine Developer & Project Lead)
"""

import os
import json
import logging
import httpx
from typing import Dict, Any, Optional, List

from shared.config.settings import (
    GROQ_API_KEY,
    GEMINI_API_KEY,
    OPENROUTER_API_KEY,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OLLAMA_VISION_MODEL,
    GROQ_MODEL,
    GEMINI_MODEL,
    OPENROUTER_OX_ALPHA,
    OPENROUTER_NEMOTRON,
    OPENROUTER_DEEPSEEK_FREE,
    LLM_TEMPERATURE,
    LLM_JSON_TEMPERATURE,
    LLM_TIMEOUT_SECONDS,
)

logger = logging.getLogger("SmartRouter")


class SpecializedModelRouter:
    """
    Task-Aware AI Model Router with Mid-Task Rescue:
    - Ingests URLs & Massive PDFs via Gemini 2.0 Flash (1M Context) / Ox Alpha
    - Performs Deep Reasoning via Ox Alpha / Nemotron 70B / DeepSeek-R1
    - Blasts JSON Extraction & Descriptions via Groq Llama 3.3 70B (300+ tok/s)
    - Always backed by 100% offline Local Ollama on RTX 4060 GPU
    """

    def __init__(
        self,
        groq_key: Optional[str] = None,
        gemini_key: Optional[str] = None,
        openrouter_key: Optional[str] = None,
        ollama_url: str = OLLAMA_BASE_URL,
    ):
        self.groq_key = groq_key or GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        self.gemini_key = gemini_key or GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.openrouter_key = openrouter_key or OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY", "")
        self.ollama_url = ollama_url.rstrip("/")

        # Specialists and Rescue Fallback Chain
        self.specialists = {
            "url_reader": {
                "primary": {"name": "Gemini 2.0 Flash", "provider": "gemini", "model": GEMINI_MODEL},
                "rescue": {"name": "Ox Alpha (1M Context)", "provider": "openrouter", "model": OPENROUTER_OX_ALPHA},
            },
            "image_vision": {
                "primary": {"name": "Gemini 2.0 Flash Vision", "provider": "gemini", "model": GEMINI_MODEL},
                "rescue": {"name": "Local Ollama Llava", "provider": "ollama", "model": OLLAMA_VISION_MODEL},
            },
            "fast_extractor": {
                "primary": {"name": "Groq Llama 3.3 70B", "provider": "groq", "model": GROQ_MODEL},
                "rescue": {"name": "Gemini 2.0 Flash", "provider": "gemini", "model": GEMINI_MODEL},
            },
            "deep_reasoner": {
                "primary": {"name": "Ox Alpha Stealth", "provider": "openrouter", "model": OPENROUTER_OX_ALPHA},
                "rescue": {"name": "Nemotron 70B", "provider": "openrouter", "model": OPENROUTER_NEMOTRON},
            },
            "bulk_offline": {
                "primary": {"name": "Local Qwen 2.5 7B", "provider": "ollama", "model": OLLAMA_MODEL},
                "rescue": {"name": "Groq Llama 70B", "provider": "groq", "model": GROQ_MODEL},
            },
        }

    def route_task(self, task_type: str, prompt: str, system: str = "") -> Dict[str, Any]:
        """
        Routes a task to its specialist model.
        If primary encounters rate limit (429/quota), auto-cascades to rescue model.
        """
        spec = self.specialists.get(task_type, self.specialists["fast_extractor"])

        # 1. Try PRIMARY specialist
        result = self._call_model(spec["primary"], prompt, system)
        if result is not None:
            logger.info(f"✅ {task_type} successfully resolved by {spec['primary']['name']}")
            return result

        # 2. PRIMARY failed -> RESCUE model takes over
        logger.warning(f"⚠️ {spec['primary']['name']} failed for {task_type}. Auto-routing to rescue: {spec['rescue']['name']}")
        result = self._call_model(spec["rescue"], prompt, system)
        if result is not None:
            return result

        # 3. Both failed -> Ultimate unlimited fallback: Local Ollama on RTX 4060
        logger.warning(f"⚠️ Cloud providers exhausted for {task_type}. Switching to Local Ollama fallback.")
        return self._call_ollama(prompt, system, OLLAMA_MODEL)

    def _call_model(self, model_config: dict, prompt: str, system: str) -> Optional[dict]:
        try:
            provider = model_config["provider"]
            if provider == "groq":
                return self._call_cloud(
                    self.groq_key,
                    "https://api.groq.com/openai/v1/chat/completions",
                    model_config["model"],
                    prompt,
                    system,
                )
            elif provider == "gemini":
                return self._call_cloud(
                    self.gemini_key,
                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    model_config["model"],
                    prompt,
                    system,
                )
            elif provider == "openrouter":
                return self._call_cloud(
                    self.openrouter_key,
                    "https://openrouter.ai/api/v1/chat/completions",
                    model_config["model"],
                    prompt,
                    system,
                )
            elif provider == "ollama":
                return self._call_ollama(prompt, system, model_config["model"])
        except Exception as e:
            logger.warning(f"Model {model_config.get('name')} error: {e}")
            return None
        return None

    def _call_cloud(self, key: str, url: str, model: str, prompt: str, system: str) -> Optional[dict]:
        if not key:
            return None
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://unihack.industrial.commerce",
            "X-Title": "AI Product Intelligence Studio",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system + "\nIMPORTANT: Output strictly valid JSON with no markdown backticks or commentary."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": LLM_JSON_TEMPERATURE,
        }
        try:
            res = httpx.post(url, headers=headers, json=payload, timeout=LLM_TIMEOUT_SECONDS)
            if res.status_code in [429, 403, 503]:
                logger.warning(f"Quota/Rate Limit reached on {model} (HTTP {res.status_code})")
                return None
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            return self._parse_json_safe(content)
        except Exception as err:
            logger.warning(f"Cloud request error on {model}: {err}")
            return None

    def _call_ollama(self, prompt: str, system: str, model: str) -> dict:
        try:
            res = httpx.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "system": system,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": LLM_JSON_TEMPERATURE},
                },
                timeout=90,
            )
            res.raise_for_status()
            return self._parse_json_safe(res.json().get("response", "{}"))
        except Exception as e:
            logger.error(f"Local Ollama error: {e}")
            return {}

    def _parse_json_safe(self, text: str) -> dict:
        if not text:
            return {}
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {}
