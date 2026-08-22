"""
Table Parser for Industrial Product Specification Sheets
Extracts structured matrices and attribute-value tables from unstructured text or HTML/CSV tables.
"""

import re
from typing import List, Dict, Any, Optional


class TableParser:
    """
    Parses complex multi-column specification tables, attribute matrices,
    and dimension tables found in industrial catalogs.
    """

    def parse_text_table(self, table_text: str) -> List[Dict[str, str]]:
        """
        Parses ASCII/whitespace-aligned or pipe-separated tables into list of row dicts.
        """
        lines = [line.strip() for line in table_text.strip().split("\n") if line.strip()]
        if not lines:
            return []

        # Check if table is pipe-delimited (| col1 | col2 |)
        if all("|" in line for line in lines[:2]):
            return self._parse_pipe_table(lines)

        # Check if tab or comma delimited
        if "\t" in lines[0]:
            return self._parse_delimited_table(lines, delimiter="\t")
        elif "," in lines[0] and len(lines[0].split(",")) > 1:
            return self._parse_delimited_table(lines, delimiter=",")

        # Fallback whitespace parsing
        return self._parse_whitespace_table(lines)

    def _parse_pipe_table(self, lines: List[str]) -> List[Dict[str, str]]:
        headers = [c.strip() for c in lines[0].split("|") if c.strip()]
        start_idx = 1
        # Skip markdown separator line |---|---|
        if len(lines) > 1 and re.match(r"^[\s|:-]+$", lines[1]):
            start_idx = 2

        results = []
        for line in lines[start_idx:]:
            cells = [c.strip() for c in line.split("|") if c.strip()]
            if cells:
                row_dict = {}
                for idx, header in enumerate(headers):
                    if idx < len(cells):
                        row_dict[header] = cells[idx]
                results.append(row_dict)
        return results

    def _parse_delimited_table(self, lines: List[str], delimiter: str) -> List[Dict[str, str]]:
        headers = [h.strip() for h in lines[0].split(delimiter)]
        results = []
        for line in lines[1:]:
            cells = [c.strip() for c in line.split(delimiter)]
            if cells and any(cells):
                row_dict = {headers[i]: cells[i] for i in range(min(len(headers), len(cells)))}
                results.append(row_dict)
        return results

    def _parse_whitespace_table(self, lines: List[str]) -> List[Dict[str, str]]:
        # Regex split on 2 or more spaces
        headers = [h.strip() for h in re.split(r"\s{2,}", lines[0]) if h.strip()]
        if len(headers) <= 1:
            return []

        results = []
        for line in lines[1:]:
            cells = [c.strip() for c in re.split(r"\s{2,}", line) if c.strip()]
            if cells:
                row_dict = {}
                for idx, header in enumerate(headers):
                    if idx < len(cells):
                        row_dict[header] = cells[idx]
                results.append(row_dict)
        return results
