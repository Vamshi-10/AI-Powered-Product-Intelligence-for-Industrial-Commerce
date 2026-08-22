"""
Consensus Engine — Multi-Model Voting & Tie-Breaker Logic
Eliminates hallucinations on critical fields (Brand & Manufacturer) by cross-validating across models.
Owned by Vamshi Krishna (AI Engine Developer & Project Lead)
"""

import logging
from collections import Counter
from typing import Dict, Any, List, Tuple
from shared.schemas.product import ConsensusResult

try:
    from .smart_router import SpecializedModelRouter
except ImportError:
    from smart_router import SpecializedModelRouter

logger = logging.getLogger("ConsensusEngine")


class ConsensusEngine:
    """
    Multi-Model Voting Engine for High-Risk Fields.
    - Asks 2 different models (Ox Alpha / Nemotron / Groq).
    - If both agree: 100% confidence auto-approved.
    - If they disagree: Consults a 3rd model (DeepSeek-R1) to break the tie.
    """

    def __init__(self, router: SpecializedModelRouter):
        self.router = router

    def resolve_identity_consensus(
        self,
        part_desc: str,
        mpn: str,
        distributor_raw: str = "",
        e1_brand_raw: str = "",
    ) -> Tuple[str, str, List[ConsensusResult]]:
        """
        Executes consensus voting to extract the true Manufacturer and Brand name.
        """
        prompt = f"""
Resolve the ACTUAL Manufacturer and Brand for this industrial product.
CRITICAL RULE: The Distributor name ({distributor_raw}) is NOT the product manufacturer.
Resolve the real tool/equipment manufacturer and brand.

Product Description: {part_desc}
MPN: {mpn}
Distributor Field: {distributor_raw}
Raw Brand Hint: {e1_brand_raw}

Output strictly valid JSON with keys:
{{
  "manufacturer": "Exact Resolved Manufacturer Name",
  "brand": "Exact Resolved Brand Name"
}}
"""
        system = "You are an expert industrial taxonomy resolver. Differentiate distributors from real tool manufacturers."

        # Model 1: Deep Reasoner (Ox Alpha / Nemotron)
        res1 = self.router.route_task("deep_reasoner", prompt, system)
        # Model 2: Fast Extractor (Groq Llama 3.3 70B)
        res2 = self.router.route_task("fast_extractor", prompt, system)

        votes_mfg = []
        votes_brand = []
        models_used = []

        if res1.get("manufacturer"):
            votes_mfg.append(res1["manufacturer"].strip())
            votes_brand.append(res1.get("brand", "").strip())
            models_used.append("DeepReasoner")

        if res2.get("manufacturer"):
            votes_mfg.append(res2["manufacturer"].strip())
            votes_brand.append(res2.get("brand", "").strip())
            models_used.append("FastExtractor")

        # Tie-breaker if disagreement
        if votes_mfg and votes_brand and (votes_mfg[0].lower() != votes_mfg[-1].lower()):
            logger.info("⚠️ Disagreement detected between models. Calling Tiebreaker (DeepSeek-R1 / Ollama)...")
            res3 = self.router.route_task("bulk_offline", prompt, system)
            if res3.get("manufacturer"):
                votes_mfg.append(res3["manufacturer"].strip())
                votes_brand.append(res3.get("brand", "").strip())
                models_used.append("TieBreaker")

        # Compute consensus for Manufacturer
        final_mfg, mfg_strength, dist_mfg = self._compute_majority(votes_mfg)
        final_brand, brand_strength, dist_brand = self._compute_majority(votes_brand)

        consensus_records = [
            ConsensusResult(
                field="MANUFACTURER_NAME",
                resolved_value=final_mfg,
                vote_distribution=dist_mfg,
                consensus_strength=mfg_strength,
                models_consulted=models_used,
            ),
            ConsensusResult(
                field="BRAND_NAME",
                resolved_value=final_brand,
                vote_distribution=dist_brand,
                consensus_strength=brand_strength,
                models_consulted=models_used,
            ),
        ]

        return final_mfg, final_brand, consensus_records

    def _compute_majority(self, votes: List[str]) -> Tuple[str, float, Dict[str, int]]:
        if not votes:
            return "", 0.0, {}
        normalized_votes = [v.title() for v in votes if v]
        if not normalized_votes:
            return "", 0.0, {}
        counts = Counter(normalized_votes)
        most_common, winner_count = counts.most_common(1)[0]
        strength = round(winner_count / len(normalized_votes), 2)
        return most_common, strength, dict(counts)
