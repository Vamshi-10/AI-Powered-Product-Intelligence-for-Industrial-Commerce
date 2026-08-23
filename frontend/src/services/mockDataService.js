/**
 * ADHARRA — Comprehensive Mock Data Store (Client-Side State)
 * 
 * Provides rich, realistic industrial commerce product intelligence datasets
 * for search, filtering, sorting, validation workflows, and AI pipeline simulations.
 */

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-001',
    sku: 'DCB518ASTS06G',
    name: 'Diablo DCB518ASTS06G 1/2" x 18" Sanding Belt 6-Pack',
    category: 'Abrasives & Sanding Belts',
    manufacturer: 'Freud America, Inc.',
    qualityScore: 98,
    confidenceScore: 95,
    status: 'Validated',
    lastUpdated: '2026-08-23',
    specifications: {
      "Width": "0.5 in",
      "Length": "18 in",
      "Pack Quantity": "6 pc",
      "Brand": "Diablo",
      "Abrasive Material": "Premium Zirconia Blend",
      "Application": "Metal, Wood, Plastic Grinding"
    }
  },
  {
    id: 'prod-002',
    sku: 'XLC10ZW',
    name: 'Makita XLC10ZW 18V LXT Cordless Compact Vacuum (Tool Only)',
    category: 'Power Tools & Cordless Equipment',
    manufacturer: 'Makita U.S.A., Inc.',
    qualityScore: 96,
    confidenceScore: 95,
    status: 'Validated',
    lastUpdated: '2026-08-23',
    specifications: {
      "Voltage": "18 V",
      "Battery System": "18V LXT Lithium-Ion",
      "Power Source": "Cordless",
      "Tool Status": "Bare Tool",
      "Suction Power": "38 CFM",
      "Dust Bag Capacity": "500 mL"
    }
  },
  {
    id: 'prod-003',
    sku: '574012',
    name: 'Philips 574012 75W Equivalent ST19 Dimmable LED Bulb 5000K 2-Pack',
    category: 'Electrical & LED Lighting',
    manufacturer: 'Philips Lighting',
    qualityScore: 95,
    confidenceScore: 95,
    status: 'Validated',
    lastUpdated: '2026-08-23',
    specifications: {
      "Wattage Equivalent": "75 W",
      "Bulb Shape": "ST19 Vintage Edison",
      "Color Temperature": "5000 K (Daylight)",
      "Technology": "LED Filament",
      "Package Quantity": "2 pc",
      "Base Type": "E26 Medium Screw"
    }
  },
  {
    id: 'prod-004',
    sku: '51334',
    name: 'Hunter Gilmour 44-inch Indoor White Ceiling Fan with 5 Blades',
    category: 'Ceiling Fans & Ventilation',
    manufacturer: 'Hunter Fan Company',
    qualityScore: 94,
    confidenceScore: 94,
    status: 'Validated',
    lastUpdated: '2026-08-23',
    specifications: {
      "Blade Span / Diameter": "44 in",
      "Finish": "Matte White",
      "Number of Blades": "5",
      "Motor Type": "WhisperWind Quiet Motor",
      "Airflow Speed": "3341 CFM",
      "Mounting Options": "Standard, Flush, Angled"
    }
  },
  {
    id: 'prod-005',
    sku: 'CHP90301TBB',
    name: 'Café CHP90301TBB 30-Inch Smart Induction Cooktop in Black',
    category: 'Commercial Appliances & Kitchen',
    manufacturer: 'GE Appliances',
    qualityScore: 97,
    confidenceScore: 95,
    status: 'Validated',
    lastUpdated: '2026-08-23',
    specifications: {
      "Width": "30 in",
      "Color / Finish": "Black Glass",
      "Cooking Technology": "Induction",
      "Number of Elements": "4",
      "Smart Connectivity": "WiFi Built-In (SmartHQ)",
      "Max Power Rating": "3700 W Boost"
    }
  },
  {
    id: 'prod-006',
    sku: 'LC1D25BD',
    name: 'Schneider Electric TeSys D LC1D25BD 3-Pole 24V DC 25A IEC Contactor',
    category: 'Power Distribution & Control',
    manufacturer: 'Schneider Electric',
    qualityScore: 99,
    confidenceScore: 98,
    status: 'Validated',
    lastUpdated: '2026-08-23',
    specifications: {
      "Rated Current": "25 A",
      "Coil Voltage": "24 V DC",
      "Poles": "3-Pole (3P)",
      "Auxiliary Contacts": "1 NO + 1 NC",
      "Mounting": "DIN Rail / Plate",
      "Standards": "IEC 60947-4-1, UL, CSA"
    }
  }
];

export const INITIAL_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Abrasives & Sanding Belts',
    description: 'High-performance industrial sanding belts, abrasive discs, and grinding sheets.',
    skuCount: 48,
    completeness: '98%',
    topBrands: ['Diablo', 'Freud America', '3M', 'Norton']
  },
  {
    id: 'cat-2',
    name: 'Power Tools & Cordless Equipment',
    description: 'Lithium-Ion cordless power tools, vacs, drivers, and industrial saws.',
    skuCount: 64,
    completeness: '96%',
    topBrands: ['Makita', 'DeWalt', 'Milwaukee', 'Bosch']
  },
  {
    id: 'cat-3',
    name: 'Electrical & LED Lighting',
    description: 'Commercial LED retrofits, vintage filaments, high-bay lamps, and ballasts.',
    skuCount: 82,
    completeness: '95%',
    topBrands: ['Philips Lighting', 'Sylvania', 'GE Current', 'Cree']
  },
  {
    id: 'cat-4',
    name: 'Ceiling Fans & Ventilation',
    description: 'Industrial and commercial indoor/outdoor ceiling fans and air movers.',
    skuCount: 35,
    completeness: '94%',
    topBrands: ['Hunter Fan Company', 'Big Ass Fans', 'Kichler', 'Minka Aire']
  },
  {
    id: 'cat-5',
    name: 'Commercial Appliances & Kitchen',
    description: 'Induction cooktops, commercial espresso machines, and appliances.',
    skuCount: 29,
    completeness: '97%',
    topBrands: ['Café', 'GE Appliances', 'Bosch', 'KitchenAid']
  },
  {
    id: 'cat-6',
    name: 'Power Distribution & Control',
    description: 'IEC contactors, motor starters, circuit breakers, and industrial drives.',
    skuCount: 55,
    completeness: '93%',
    topBrands: ['Schneider Electric', 'ABB', 'Siemens', 'Eaton']
  }
];

export const INITIAL_BRANDS = [
  {
    id: 'brand-1',
    name: 'Diablo',
    country: 'United States',
    categories: ['Abrasives & Sanding Belts', 'Cutting Tools'],
    activeSKUs: 42,
    qualityRating: '98%',
    status: 'Verified Brand'
  },
  {
    id: 'brand-2',
    name: 'Makita',
    country: 'Japan',
    categories: ['Power Tools & Cordless Equipment'],
    activeSKUs: 68,
    qualityRating: '96%',
    status: 'Verified Brand'
  },
  {
    id: 'brand-3',
    name: 'Philips Lighting',
    country: 'Netherlands',
    categories: ['Electrical & LED Lighting'],
    activeSKUs: 85,
    qualityRating: '95%',
    status: 'Verified Brand'
  },
  {
    id: 'brand-4',
    name: 'Hunter Fan Company',
    country: 'United States',
    categories: ['Ceiling Fans & Ventilation'],
    activeSKUs: 38,
    qualityRating: '94%',
    status: 'Verified Brand'
  },
  {
    id: 'brand-5',
    name: 'Café',
    country: 'United States',
    categories: ['Commercial Appliances & Kitchen'],
    activeSKUs: 31,
    qualityRating: '97%',
    status: 'Verified Brand'
  },
  {
    id: 'brand-6',
    name: 'Schneider Electric',
    country: 'France',
    categories: ['Power Distribution & Control'],
    activeSKUs: 72,
    qualityRating: '96%',
    status: 'Verified Brand'
  }
];

export const INITIAL_VALIDATION_RULES = [
  {
    id: 'rule-01',
    name: 'Mandatory Voltage Units',
    targetCategory: 'All Categories',
    condition: 'Voltage specs must include voltage unit (V or kV) and frequency (50/60 Hz)',
    severity: 'High',
    enabled: true,
    passedCount: 142,
    failedCount: 3
  },
  {
    id: 'rule-02',
    name: 'Pressure Range Completeness',
    targetCategory: 'Pumps & Fluid Handling',
    condition: 'Must specify both nominal flow rate and maximum head pressure (bar / m)',
    severity: 'High',
    enabled: true,
    passedCount: 88,
    failedCount: 2
  },
  {
    id: 'rule-03',
    name: 'IP Ingress Protection Standard',
    targetCategory: 'Motors & Drives',
    condition: 'Protection class must match standard IPxx format (e.g. IP55, IP66, IP67)',
    severity: 'Medium',
    enabled: true,
    passedCount: 65,
    failedCount: 4
  },
  {
    id: 'rule-04',
    name: 'Material Grade Harmonization',
    targetCategory: 'Valves & Actuators',
    condition: 'Wetted metallic parts must reference AISI or EN material grades',
    severity: 'Medium',
    enabled: false,
    passedCount: 40,
    failedCount: 8
  }
];

export const INITIAL_DUPLICATES = [
  {
    id: 'dup-1',
    confidence: '96% Match',
    reason: 'Identical SKU with differing whitespace and case formatting',
    itemA: {
      id: 'prod-001-a',
      name: 'Grundfos CR 15-4 Centrifugal Pump 4kW',
      sku: 'CR-15-04-A-A-E-HQQE',
      source: 'Uploaded PDF Datasheet'
    },
    itemB: {
      id: 'prod-001-b',
      name: 'Grundfos CR 15-4 Multistage Pump (5.5HP)',
      sku: 'CR 15-04 A-A-E-HQQE',
      source: 'Supplier Website Link'
    }
  },
  {
    id: 'dup-2',
    confidence: '91% Match',
    reason: 'Exact model match with minor description variations',
    itemA: {
      id: 'prod-002-a',
      name: 'Siemens SIMOTICS GP 1LE1 15kW Motor',
      sku: '1LE1001-1DB43-4AA4',
      source: 'Catalog Spreadsheet'
    },
    itemB: {
      id: 'prod-002-b',
      name: 'Siemens 15kW IE3 Induction Motor 1LE1001',
      sku: '1LE1001-1DB43-4AA4',
      source: 'Manual Form Entry'
    }
  }
];

export const INITIAL_MISSING_VALUES = [
  {
    id: 'miss-1',
    sku: 'ETA-100-065-200-GG',
    productName: 'KSB Etanorm End-Suction Pump',
    missingField: 'Operating Temperature Min',
    category: 'Pumps & Fluid Handling',
    suggestedValue: '-10°C'
  },
  {
    id: 'miss-2',
    sku: 'VLT-FC-302P15KT5',
    productName: 'Danfoss VLT AutomationDrive 15kW',
    missingField: 'IP Protection Class',
    category: 'Industrial Automation',
    suggestedValue: 'IP20'
  },
  {
    id: 'miss-3',
    sku: '3051S-2-C-G-4-A-2-A-1-A',
    productName: 'Emerson Rosemount 3051S Transmitter',
    missingField: 'Diaphragm Seal Material',
    category: 'Instrumentation & Sensors',
    suggestedValue: '316L Stainless Steel'
  }
];

export const INITIAL_ANOMALIES = [
  {
    id: 'anom-1',
    severity: 'Critical',
    sku: 'VLT-FC-302P15KT5',
    product: 'Danfoss VLT Inverter 15kW',
    issue: 'Extreme Voltage Outlier Detected',
    detail: 'Extracted voltage value "4800 V" exceeds typical low voltage category maximum (690 V). Likely missing decimal point.',
    detectedAt: '2026-08-20 14:32'
  },
  {
    id: 'anom-2',
    severity: 'Warning',
    sku: 'CR-15-04-A-A-E-HQQE',
    product: 'Grundfos CR 15-4 Pump',
    issue: 'Unit Inconsistency in Flow Rate',
    detail: 'Source datasheet uses GPM (US Gallons/Min) instead of catalog standard m³/h.',
    detectedAt: '2026-08-19 11:15'
  }
];

export const INITIAL_RECOMMENDATIONS = [
  {
    id: 'rec-1',
    title: 'Standardize Pressure Units to Bar',
    category: 'Taxonomy',
    impact: '+4.2% Completeness',
    description: '14 products currently specify pressure ratings in PSI. Converting to SI standard Bar will improve buyer search filters.',
    status: 'Pending'
  },
  {
    id: 'rec-2',
    title: 'Populate Missing IE Efficiency Ratings',
    category: 'Attribute Quality',
    impact: '+6.8% Discoverability',
    description: '18 industrial motors lack IE efficiency tier classifications (IE1/IE2/IE3/IE4).',
    status: 'Pending'
  },
  {
    id: 'rec-3',
    title: 'Harmonize Stainless Steel Grade Names',
    category: 'Standardization',
    impact: '+3.5% Match Rate',
    description: 'Map synonym terms (SS316, 1.4401, AISI 316) to unified ISO designation 316 Stainless Steel.',
    status: 'Pending'
  }
];

export const INITIAL_INTEGRATIONS = [
  {
    id: 'int-1',
    name: 'SAP ERP S/4HANA Connector',
    type: 'Enterprise ERP',
    status: 'Connected',
    lastSync: '10 minutes ago',
    itemsSynced: 1240
  },
  {
    id: 'int-2',
    name: 'Akeneo PIM Product Feeds',
    type: 'PIM System',
    status: 'Connected',
    lastSync: '1 hour ago',
    itemsSynced: 850
  },
  {
    id: 'int-3',
    name: 'Industrial Commerce REST API',
    type: 'Custom API Webhook',
    status: 'Active',
    lastSync: 'Real-time Streaming',
    itemsSynced: 420
  },
  {
    id: 'int-4',
    name: 'Direct Supplier SFTP Ingestion',
    type: 'File Protocol',
    status: 'Standby',
    lastSync: 'Yesterday 23:00',
    itemsSynced: 190
  }
];
