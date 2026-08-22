"""
Technical Attribute Extractor for Industrial Commerce
Extracts structured technical specifications (Dimensions, Electrical, Mechanical, Physical, Pack Qty, Series)
from raw product descriptions, technical datasheets, and catalog fields.
"""

import os
import sys
import re
from typing import Dict, Any, List, Optional

_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

from uom_normalizer import UOMNormalizer
from abbreviation_expander import AbbreviationExpander


class AttributeExtractor:
    """
    Extracts deep, structured taxonomy attributes conforming to Unilog Lists of Values (LOV).
    """

    def __init__(self, uom_normalizer: Optional[UOMNormalizer] = None):
        self.uom = uom_normalizer or UOMNormalizer()
        self.expander = AbbreviationExpander()

    def extract_attributes(
        self,
        part_desc: str,
        mpn: Optional[str] = None,
        extra_fields: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extracts structured attributes dictionary and taxonomy parameters from input text.
        """
        text = str(part_desc or "").strip()
        attributes: Dict[str, Any] = {}

        # 1. Extract Item Type / Category
        item_type = self._extract_item_type(text)
        if item_type:
            attributes["Item_Type"] = item_type

        # 2. Extract Product Series / Sub-brand
        series = self._extract_series(text)
        if series:
            attributes["Series"] = series

        # 3. Extract Electrical Attributes (Voltage, Amperage, Wattage, Phase, Frequency)
        elec_specs = self._extract_electrical(text)
        attributes.update(elec_specs)

        # 4. Extract Dimensions & Geometry (Diameter, Width, Length, Thickness, Arbor Size)
        dim_specs = self._extract_dimensions(text)
        attributes.update(dim_specs)

        # 5. Extract Mechanical / Performance Specs (Speed, Teeth Count, Grit, Horsepower, Battery)
        perf_specs = self._extract_performance(text)
        attributes.update(perf_specs)

        # 6. Extract Material, Finish & Color
        phys_specs = self._extract_physical(text)
        attributes.update(phys_specs)

        # 7. Extract Mounting, Configuration & Package Count
        misc_specs = self._extract_configuration(text)
        attributes.update(misc_specs)

        # Merge extra fields if present
        if extra_fields:
            for k, v in extra_fields.items():
                if v is not None and k not in attributes:
                    attributes[k] = v

        return attributes

    def _extract_item_type(self, text: str) -> Optional[str]:
        """Identifies product subcategory and item type."""
        patterns = [
            (r"(?i)\b(?:cut-off\s+disc|cut\s+off\s+disc|cutoff\s+disc)\b", "Cut-Off Disc"),
            (r"(?i)\b(?:grinding\s+wheel|grind\s+disc)\b", "Grinding Wheel"),
            (r"(?i)\b(?:sanding\s+belt|sanding\s+sponge|sanding\s+disc|abrasive\s+disc)\b", "Abrasive Sanding Media"),
            (r"(?i)\b(?:circ(?:ular)?\s+saw\s+blade|saw\s+blade|track\s+saw\s+blade|jig\s+saw\s+blade|diamond\s+blade)\b", "Saw Blade"),
            (r"(?i)\b(?:impact\s+driver|hammer\s+drill|drill\s+driver|plunge\s+router|angle\s+grinder|miter\s+saw|circular\s+saw|table\s+saw|bandsaw|recip(?:rocating)?\s+saw|planer|jointer|sander)\b", "Power Tool"),
            (r"(?i)\b(?:dishwasher)\b", "Dishwasher"),
            (r"(?i)\b(?:refrigerator|fridge|freezer|beverage\s+center)\b", "Refrigeration Appliance"),
            (r"(?i)\b(?:range|cooktop|wall\s+oven|microwave|toaster|espresso\s+machine|coffee\s+maker)\b", "Cooking Appliance"),
            (r"(?i)\b(?:washer|dryer|laundry\s+center)\b", "Laundry Appliance"),
            (r"(?i)\b(?:wall\s+light|wall\s+lt|bath\s+light|chandelier|pendant\s+light|ceiling\s+light|downlight|strip\s+light|flood\s+light|led\s+bulb)\b", "Lighting Fixture"),
            (r"(?i)\b(?:dimmer|switch|outlet|wallplate|load\s+center|box\s+cover|conduit\s+box|wire|cable)\b", "Electrical Equipment"),
            (r"(?i)\b(?:decking|fascia|post\s+wrap|post\s+sleeve|rail\s+kit|baluster|siding|soffit|trim)\b", "Building Materials"),
            (r"(?i)\b(?:tape|joist\s+tape|masking\s+tape|vinyl\s+tape)\b", "Industrial Tape"),
            (r"(?i)\b(?:safety\s+glasses|heated\s+glove|heated\s+hoodie|hearing\s+protector|fire\s+extinguisher|smoke\s+alarm)\b", "Safety & PPE")
        ]
        for pattern, item_type in patterns:
            if re.search(pattern, text):
                return item_type
        return None

    def _extract_series(self, text: str) -> Optional[str]:
        """Extracts brand series / marketing line."""
        series_patterns = [
            (r"(?i)\bSteel Demon\b", "Steel Demon"),
            (r"(?i)\bSpeed Demon\b", "Speed Demon"),
            (r"(?i)\bPerformance\+\b", "Performance+"),
            (r"(?i)\bCubitron II\b", "Cubitron II"),
            (r"(?i)\bProfessional Series\b", "Professional Series"),
            (r"(?i)\bTranscend Lineage\b", "Transcend Lineage"),
            (r"(?i)\bEnhance Naturals\b", "Enhance Naturals"),
            (r"(?i)\bEnhance Basics\b", "Enhance Basics"),
            (r"(?i)\bSelect 2\.0\b", "Select 2.0"),
            (r"(?i)\bVintage Azek\b", "Vintage Azek"),
            (r"(?i)\bLandmark Azek\b", "Landmark Azek"),
            (r"(?i)\bHarvest Azek\b", "Harvest Azek"),
            (r"(?i)\bSmartSide\b", "SmartSide"),
            (r"(?i)\bHardiePlank\b", "HardiePlank"),
            (r"(?i)\bHardiePanel\b", "HardiePanel"),
            (r"(?i)\bPackout\b", "Packout"),
            (r"(?i)\bM12 Fuel\b", "M12 FUEL"),
            (r"(?i)\bM18 Fuel\b", "M18 FUEL"),
            (r"(?i)\bM18\b", "M18"),
            (r"(?i)\bM12\b", "M12"),
            (r"(?i)\b20V Max XR\b", "20V MAX XR"),
            (r"(?i)\b20V Max\b", "20V MAX"),
            (r"(?i)\bAtomic\b", "Atomic"),
            (r"(?i)\bFlexvolt\b", "FlexVolt"),
            (r"(?i)\bStarfish\b", "Starfish"),
            (r"(?i)\bNuvo\b", "Nuvo")
        ]
        for pattern, name in series_patterns:
            if re.search(pattern, text):
                return name
        return None

    def _extract_electrical(self, text: str) -> Dict[str, str]:
        specs = {}
        # Voltage e.g., 120V, 20V, 18V, 125V
        v_match = re.search(r"\b(\d{1,3})\s*(?:V|VAC|VDC|Volt|Volts)\b", text, re.IGNORECASE)
        if v_match:
            specs["Voltage"] = f"{v_match.group(1)} V"

        # Amperage e.g., 15A, 200A, 225A, 4A, 4 Amp
        a_match = re.search(r"\b(\d{1,3})\s*(?:A|Amp|Amps|Ampere)\b", text, re.IGNORECASE)
        if a_match:
            specs["Amperage"] = f"{a_match.group(1)} A"

        # Wattage e.g., 60W, 100W, 15W, 300W
        w_match = re.search(r"\b(\d{1,4})\s*(?:W|Watt|Watts)\b", text, re.IGNORECASE)
        if w_match:
            specs["Wattage"] = f"{w_match.group(1)} W"

        # Multi-wattage e.g. 60/100/150 Led
        multi_w = re.search(r"\b(\d{2,3}/\d{2,3}/\d{2,3})\s*(?:W|Watt|Watts|Led)?\b", text, re.IGNORECASE)
        if multi_w and "Wattage" not in specs:
            specs["Wattage"] = f"{multi_w.group(1)} W"

        # Phase e.g., 1PH, 1Ph, 3PH
        ph_match = re.search(r"\b([13])\s*(?:PH|Ph|Phase)\b", text, re.IGNORECASE)
        if ph_match:
            specs["Phase"] = f"{ph_match.group(1)}-Phase"

        # Color Temperature e.g., 27k, 30K, 50k, 5CCT
        cct_match = re.search(r"\b(\d{2})k\b", text, re.IGNORECASE)
        if cct_match:
            specs["Color_Temperature"] = f"{cct_match.group(1)}00 K"
        elif re.search(r"(?i)\b(?:multi\s+cct|5cct|5\s+cct)\b", text):
            specs["Color_Temperature"] = "Selectable Multi-CCT"

        return specs

    def _extract_dimensions(self, text: str) -> Dict[str, str]:
        specs = {}
        # Diameter x Thickness x Arbor Size for cutting discs/wheels
        # e.g., 5"x.045"x7/8", 7"x1/16"x7/8", 12"x7/64"x1", 14"x1/8"x20mm
        disc_dim = re.search(r'(\d+(?:-\d+/\d+)?)\s*["”]?\s*x\s*(\.?\d+|\d+/\d+)\s*["”]?\s*x\s*(\d+(?:-\d+/\d+|\.\d+)?|20mm|5/8-11|5/8|7/8|1)\s*["”]?', text, re.IGNORECASE)
        if disc_dim:
            d_val = disc_dim.group(1)
            t_val = disc_dim.group(2)
            a_val = disc_dim.group(3)
            
            # Format thickness
            if t_val.startswith("."):
                t_val = self.uom.decimal_to_trade_fraction(float("0" + t_val))
            
            arbor_str = f"{a_val} in" if not a_val.endswith("mm") and not a_val.startswith("5/8-11") else a_val
            specs["Blade_Diameter"] = f"{d_val} in"
            specs["Thickness"] = f"{t_val} in"
            specs["Arbor_Size"] = arbor_str
            return specs

        # 2D/3D Dimensions e.g. 1/2"x18", 2.75x30, 4x6x6, 1nx6-16', 1x6-16', 6'x36", 4x4-108
        dim_match = re.search(r'(\d+(?:-\d+/\d+|/\d+|\.\d+)?)\s*(?:["”]|nx|x|\')\s*(\d+(?:-\d+/\d+|/\d+|\.\d+)?)\s*(?:["”]|x|-|\')?\s*(\d+(?:-\d+/\d+|/\d+|\.\d+)?\s*(?:[\'’]|ft|in)?)?', text, re.IGNORECASE)
        if dim_match:
            d1 = dim_match.group(1).replace("nx", "").replace("x", "").strip()
            d2 = dim_match.group(2).strip()
            d3 = dim_match.group(3).strip() if dim_match.group(3) else None

            # Convert decimals to trade fractions if needed
            if "." in d1:
                try:
                    d1 = self.uom.decimal_to_trade_fraction(float(d1))
                except Exception:
                    pass
            if "." in d2:
                try:
                    d2 = self.uom.decimal_to_trade_fraction(float(d2))
                except Exception:
                    pass

            if d3:
                specs["Dimensions"] = f"{d1} in x {d2} in x {d3}"
            elif d2:
                specs["Dimensions"] = f"{d1} in x {d2} in"

        # Single Diameter / Length (e.g. 7-1/4", 12", 10", 6', 8', 12', 16')
        single_dia = re.search(r'\b(\d+(?:-\d+/\d+|/\d+)?)\s*["”]\b', text)
        if single_dia and "Blade_Diameter" not in specs and "Dimensions" not in specs:
            specs["Diameter"] = f"{single_dia.group(1)} in"

        length_ft = re.search(r'\b(\d{1,2})\s*[\'’]\b', text)
        if length_ft and "Dimensions" not in specs:
            specs["Length"] = f"{length_ft.group(1)} ft"

        return specs

    def _extract_performance(self, text: str) -> Dict[str, str]:
        specs = {}
        # Grit e.g., P80, P120, P150, P180, P220, P320, 220 Grit
        grit_match = re.search(r"\b(?:P(\d{2,3})|(\d{2,3})\s*Grit)\b", text, re.IGNORECASE)
        if grit_match:
            g_num = grit_match.group(1) or grit_match.group(2)
            specs["Grit"] = f"P{g_num}"

        # Teeth Count e.g., 24T, 60 Tooth, 10 TPI, 4-Tooth
        t_match = re.search(r"\b(\d{1,3})\s*(?:T|Tooth|Teeth|TPI)\b", text, re.IGNORECASE)
        if t_match:
            specs["Tooth_Count"] = f"{t_match.group(1)} T"

        # Horsepower e.g., 3HP, 1.75HP, 2HP
        hp_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:HP|hp)\b", text, re.IGNORECASE)
        if hp_match:
            specs["Horsepower"] = f"{hp_match.group(1)} hp"

        # Battery Capacity e.g., 8Ah, 4Ah, 2Ah, 12AH
        ah_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:Ah|AH)\b", text, re.IGNORECASE)
        if ah_match:
            specs["Battery_Capacity"] = f"{ah_match.group(1)} Ah"

        # Lumens e.g. 4500L, 2600L, 800L (only for lighting products)
        if re.search(r"(?i)\b(?:Light|Lt|Headlight|Flashlight|Shop\s+Light|Flood|Panel|Lumen)\b", text):
            lm_match = re.search(r"\b(\d{3,5})\s*(?:L|lm|Lumens)\b", text, re.IGNORECASE)
            if lm_match:
                specs["Luminous_Flux"] = f"{lm_match.group(1)} lm"

        return specs

    def _extract_physical(self, text: str) -> Dict[str, str]:
        specs = {}
        # Materials
        mat_patterns = [
            (r"(?i)\b(?:Stainless\s+Steel|SS|SST)\b", "Stainless Steel"),
            (r"(?i)\b(?:Black\s+Stainless\s+Steel|BSS)\b", "Black Stainless Steel"),
            (r"(?i)\b(?:Aluminum|Alum|Alm)\b", "Aluminum"),
            (r"(?i)\b(?:Brass|BRS)\b", "Brass"),
            (r"(?i)\b(?:PVC|Composite|Vinyl)\b", "Composite PVC"),
            (r"(?i)\b(?:Ceramic\+|Ceramic)\b", "Ceramic"),
            (r"(?i)\b(?:Diamond)\b", "Diamond"),
            (r"(?i)\b(?:Masonry)\b", "Masonry")
        ]
        for pattern, mat in mat_patterns:
            if re.search(pattern, text):
                specs["Material"] = mat
                break

        # Color & Finish
        color_patterns = [
            (r"(?i)\b(?:Stainless\s+Steel|SS)\b", "Stainless Steel"),
            (r"(?i)\b(?:Black\s+Stainless|BSS)\b", "Black Stainless Steel"),
            (r"(?i)\b(?:Black\s+Oxide|BO)\b", "Black Oxide"),
            (r"(?i)\b(?:Black|Blk|BK)\b", "Black"),
            (r"(?i)\b(?:White|Wh|WH)\b", "White"),
            (r"(?i)\b(?:Brushed\s+Nickel|Nickel|BN|NI)\b", "Brushed Nickel"),
            (r"(?i)\b(?:Champagne\s+Bronze|CPZ)\b", "Champagne Bronze"),
            (r"(?i)\b(?:Dark\s+Bronze|Bronze|BZ|DBZ)\b", "Dark Bronze"),
            (r"(?i)\b(?:Slate\s+Gray|Slate|SL|SG)\b", "Slate Gray"),
            (r"(?i)\b(?:Dark\s+Gray|DG)\b", "Dark Gray"),
            (r"(?i)\b(?:Coastline)\b", "Coastline"),
            (r"(?i)\b(?:English\s+Walnut)\b", "English Walnut"),
            (r"(?i)\b(?:Mahogany)\b", "Mahogany"),
            (r"(?i)\b(?:Weathered\s+Teak)\b", "Weathered Teak"),
            (r"(?i)\b(?:American\s+Walnut)\b", "American Walnut"),
            (r"(?i)\b(?:Castle\s+Gate)\b", "Castle Gate"),
            (r"(?i)\b(?:French\s+White\s+Oak)\b", "French White Oak"),
            (r"(?i)\b(?:Brownstone)\b", "Brownstone"),
            (r"(?i)\b(?:Biscayne)\b", "Biscayne"),
            (r"(?i)\b(?:Carmel)\b", "Carmel"),
            (r"(?i)\b(?:Jasper)\b", "Jasper"),
            (r"(?i)\b(?:Rainier)\b", "Rainier"),
            (r"(?i)\b(?:Honey\s+Grove)\b", "Honey Grove"),
            (r"(?i)\b(?:Tide\s+Pool)\b", "Tide Pool"),
            (r"(?i)\b(?:Cinnamon\s+Cove)\b", "Cinnamon Cove"),
            (r"(?i)\b(?:Golden\s+Hour)\b", "Golden Hour"),
            (r"(?i)\b(?:Pebble\s+Beach)\b", "Pebble Beach"),
            (r"(?i)\b(?:Malted\s+Barley)\b", "Malted Barley"),
            (r"(?i)\b(?:Millstone)\b", "Millstone"),
            (r"(?i)\b(?:Whiskey\s+Barrel)\b", "Whiskey Barrel")
        ]
        for pattern, col in color_patterns:
            if re.search(pattern, text) and "Finish_Color" not in specs:
                specs["Finish_Color"] = col
                break

        return specs

    def _extract_configuration(self, text: str) -> Dict[str, str]:
        specs = {}
        # Package Quantity e.g. 6pc, 10pc, 50 Disc/Box, 4pk, 2pk, 3pk, 500CT, 4M
        pkg_match = re.search(r"\b(\d{1,4})\s*(?:pc|pcs|pk|pack|ct|count|Disc/Box|Sheets/Box|M)\b", text, re.IGNORECASE)
        if pkg_match:
            specs["Package_Quantity"] = f"{pkg_match.group(1)} pc"

        # Edge / Profile (for decking & building)
        if re.search(r"(?i)\b(?:Sq\s+Edge|Square\s+Edge)\b", text):
            specs["Edge_Profile"] = "Square Edge"
        elif re.search(r"(?i)\b(?:Grooved|Groov)\b", text):
            specs["Edge_Profile"] = "Grooved"

        # Bare Tool vs Kit
        if re.search(r"(?i)\b(?:Bare|Tool\s+Only|Bare\s+Tool)\b", text):
            specs["Configuration"] = "Bare Tool"
        elif re.search(r"(?i)\b(?:Kit)\b", text):
            specs["Configuration"] = "Kit"

        # Orientation (Horizontal / Stair)
        if re.search(r"(?i)\b(?:Horiz|Hor|Horizontal)\b", text):
            specs["Orientation"] = "Horizontal"
        elif re.search(r"(?i)\b(?:Stair|Str)\b", text):
            specs["Orientation"] = "Stair"

        return specs
