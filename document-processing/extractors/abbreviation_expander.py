"""
Industrial Abbreviation Expander
Expands cryptic domain acronyms and supplier shorthand into clear, professional commerce terminology.
"""

import os
import json
import re
from typing import Dict, Any, Optional


class AbbreviationExpander:
    """
    Translates cryptic supplier shorthand (e.g. 'SS', 'Alum', 'Sq', 'Wh', 'DKO') into
    canonical trade terms according to Unilog style guidelines.
    """

    def __init__(self, lexicon_path: Optional[str] = None):
        if lexicon_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            lexicon_path = os.path.join(base_dir, "data", "abbreviations_lexicon.json")
        
        self.lexicon = self._load_lexicon(lexicon_path)

    def _load_lexicon(self, path: str) -> Dict[str, str]:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f).get("abbreviations", {})
        return {}

    def expand(self, text: str) -> str:
        """
        Replaces abbreviations in a product string with their full natural terms.
        """
        if not text:
            return ""

        words = text.split()
        expanded_words = []

        for word in words:
            # Strip trailing punctuation for lookup
            clean_word = word.strip('",;:.()/-')
            punctuation_suffix = word[len(clean_word):] if word.startswith(clean_word) else ""
            
            # Check exact match
            if clean_word in self.lexicon:
                expanded = self.lexicon[clean_word]
                expanded_words.append(expanded + punctuation_suffix)
            # Check case-insensitive match for common acronyms
            elif clean_word.upper() in self.lexicon:
                expanded = self.lexicon[clean_word.upper()]
                expanded_words.append(expanded + punctuation_suffix)
            else:
                expanded_words.append(word)

        result = " ".join(expanded_words)
        
        # Clean up double spaces or awkward hyphens
        result = re.sub(r"\s+", " ", result)
        result = re.sub(r"\s*-\s*-\s*", " - ", result)
        return result.strip()
