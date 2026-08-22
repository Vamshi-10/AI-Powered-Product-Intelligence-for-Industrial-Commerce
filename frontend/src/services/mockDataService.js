/**
 * ADHARRA — Comprehensive Mock Data Store (Client-Side State)
 * 
 * Provides rich, realistic industrial commerce product intelligence datasets
 * for search, filtering, sorting, validation workflows, and AI pipeline simulations.
 */

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-001',
    sku: 'CR-15-04-A-A-E-HQQE',
    name: 'Grundfos CR 15-4 Vertical Multistage Centrifugal Pump',
    category: 'Pumps & Fluid Handling',
    manufacturer: 'Grundfos',
    qualityScore: 96,
    confidenceScore: 94,
    status: 'Validated',
    lastUpdated: '2026-08-20',
    specifications: {
      "Flow Rate": "15 m³/h",
      "Max Pressure": "16 bar",
      "Motor Power": "4.0 kW (5.5 HP)",
      "Voltage": "3x380-415 V, 50 Hz",
      "Material": "Stainless Steel AISI 304",
      "Temperature Range": "-20°C to +120°C",
      "Protection Class": "IP55"
    }
  },
  {
    id: 'prod-002',
    sku: '1LE1001-1DB43-4AA4',
    name: 'Siemens SIMOTICS GP 1LE1 Cast Iron 3-Phase Induction Motor 15kW',
    category: 'Motors & Drives',
    manufacturer: 'Siemens',
    qualityScore: 92,
    confidenceScore: 89,
    status: 'Validated',
    lastUpdated: '2026-08-19',
    specifications: {
      "Power Rating": "15 kW (20 HP)",
      "Rated Speed": "1470 RPM",
      "Efficiency Class": "IE3 Premium",
      "Voltage": "400V / 690V, 50Hz",
      "Frame Size": "160L",
      "Mounting Type": "IM B3 (Foot)",
      "Protection Class": "IP55"
    },
    sources: [
      { id: 'SRC-001', type: 'pdf', name: 'motor_datasheet.pdf' },
      { id: 'SRC-002', type: 'html', name: 'motor_specs.html' },
      { id: 'SRC-003', type: 'xlsx', name: 'motor_catalog.xlsx' },
      { id: 'SRC-004', type: 'image', name: 'motor_label.jpg' }
    ],
    evidence: {
      "Voltage": [
        { sourceId: "SRC-001", value: "400V / 690V, 50Hz" },
        { sourceId: "SRC-002", value: "400V / 690V, 50Hz" },
        { sourceId: "SRC-003", value: "400V / 690V, 50Hz" },
        { sourceId: "SRC-004", value: "400V / 690V, 50Hz" }
      ],
      "Power Rating": [
        { sourceId: "SRC-001", value: "15 kW (20 HP)" },
        { sourceId: "SRC-002", value: "15 kW (20 HP)" },
        { sourceId: "SRC-003", value: "15 kW (20 HP)" }
      ],
      "Rated Speed": [
        { sourceId: "SRC-001", value: "1470 RPM" },
        { sourceId: "SRC-002", value: "1470 RPM" },
        { sourceId: "SRC-003", value: "1450 RPM" }
      ],
      "Mounting Type": [
        { sourceId: "SRC-001", value: "IM B3 (Foot)" }
      ],
      "Efficiency Class": [
        { sourceId: "SRC-001", value: "IE3 Premium" },
        { sourceId: "SRC-002", value: "IE3 Premium" }
      ],
      "Frame Size": [
        { sourceId: "SRC-001", value: "160L" },
        { sourceId: "SRC-002", value: "160L" }
      ],
      "Protection Class": [
        { sourceId: "SRC-001", value: "IP55" },
        { sourceId: "SRC-002", value: "IP55" }
      ]
    }
  },
  {
    id: 'prod-003',
    sku: '3051S-2-C-G-4-A-2-A-1-A',
    name: 'Emerson Rosemount 3051S Scalable Coplanar Pressure Transmitter',
    category: 'Instrumentation & Sensors',
    manufacturer: 'Emerson',
    qualityScore: 88,
    confidenceScore: 85,
    status: 'Pending Review',
    lastUpdated: '2026-08-18',
    specifications: {
      "Pressure Range": "-100 to 25 bar",
      "Accuracy": "±0.025% of span",
      "Output Signal": "4-20 mA HART",
      "Wetted Material": "Hastelloy C-276",
      "Fill Fluid": "Silicone Oil",
      "Process Temperature": "-40°C to +121°C",
      "Hazardous Approval": "ATEX Zone 0/1"
    }
  },
  {
    id: 'prod-004',
    sku: 'ETA-100-065-200-GG',
    name: 'KSB Etanorm End-Suction Volute Casing Water Pump',
    category: 'Pumps & Fluid Handling',
    manufacturer: 'KSB',
    qualityScore: 78,
    confidenceScore: 74,
    status: 'Pending Review',
    lastUpdated: '2026-08-17',
    specifications: {
      "Flow Rate": "100 m³/h",
      "Head": "50 m",
      "Motor Power": "18.5 kW",
      "Voltage": "400 V, 50 Hz",
      "Casing Material": "Cast Iron JL1040",
      "Impeller Material": "Bronze CC480K",
      "Max Operating Temp": "140°C"
    }
  },
  {
    id: 'prod-005',
    sku: 'ATV630D18N4',
    name: 'Schneider Altivar Process ATV630 Variable Speed Drive 18.5kW',
    category: 'Industrial Automation',
    manufacturer: 'Schneider Electric',
    qualityScore: 95,
    confidenceScore: 92,
    status: 'Validated',
    lastUpdated: '2026-08-16',
    specifications: {
      "Nominal Power": "18.5 kW (25 HP)",
      "Supply Voltage": "380...480 V (- 15...10 %)",
      "Network Frequency": "50...60 Hz",
      "Comm Protocols": "Modbus TCP, Ethernet/IP",
      "IP Rating": "IP21 / UL type 1",
      "Harmonic Mitigation": "Built-in DC choke",
      "Cooling Type": "Forced Convection"
    }
  },
  {
    id: 'prod-006',
    sku: 'PROMAG-50W-DN150',
    name: 'Endress+Hauser Proline Promag W 400 Electromagnetic Flowmeter DN150',
    category: 'Instrumentation & Sensors',
    manufacturer: 'Endress+Hauser',
    qualityScore: 84,
    confidenceScore: 81,
    status: 'In Processing',
    lastUpdated: '2026-08-15',
    specifications: {
      "Nominal Diameter": "DN 150 (6\")",
      "Measuring Range": "0 to 1100 m³/h",
      "Measured Error": "±0.5% o.r.",
      "Liner Material": "Hard Rubber",
      "Electrodes": "1.4435 (316L)",
      "Medium Temperature": "-20°C to +80°C",
      "Process Pressure": "PN 16 bar"
    }
  },
  {
    id: 'prod-007',
    sku: 'VLT-FC-302P15KT5',
    name: 'Danfoss VLT AutomationDrive FC 302 15kW Heavy Duty Inverter',
    category: 'Industrial Automation',
    manufacturer: 'Danfoss',
    qualityScore: 68,
    confidenceScore: 62,
    status: 'Needs Revision',
    lastUpdated: '2026-08-14',
    specifications: {
      "Power Rating": "15 kW",
      "Mains Voltage": "380-500 V, 3-Phase",
      "Enclosure": "IP20 / Chassis",
      "Braking Chopper": "Built-in",
      "Fieldbus": "PROFINET RT",
      "Overload Capacity": "160% for 60s",
      "Ambient Temperature": "Max 50°C"
    }
  },
  {
    id: 'prod-008',
    sku: 'BV-3PC-SS-DN50',
    name: 'Habonim 3-Piece High-Pressure Ball Valve Stainless Steel DN50',
    category: 'Valves & Actuators',
    manufacturer: 'Habonim',
    qualityScore: 91,
    confidenceScore: 88,
    status: 'Validated',
    lastUpdated: '2026-08-13',
    specifications: {
      "Valve Size": "2\" (DN50)",
      "Pressure Rating": "Class 600 (100 bar)",
      "Body Material": "Forged 316L SS",
      "Seat Material": "Virgin PTFE / PEEK",
      "End Connections": "Female NPT Threaded",
      "Fire Safe": "API 607 Certified",
      "Actuator Mount": "ISO 5211 Direct Mount"
    }
  },
  {
    id: 'prod-009',
    sku: 'SKF-6205-2RS1',
    name: 'SKF Deep Groove Ball Bearing 25x52x15',
    category: 'Mechanical Components',
    manufacturer: 'SKF',
    qualityScore: 98,
    confidenceScore: 99,
    status: 'Validated',
    lastUpdated: '2026-08-12',
    specifications: {
      "Inner Diameter": "25 mm",
      "Outer Diameter": "52 mm",
      "Width": "15 mm",
      "Dynamic Load Rating": "14.8 kN",
      "Static Load Rating": "7.8 kN",
      "Seal Type": "Contact Seal (2RS1)",
      "Limiting Speed": "8500 r/min",
      "Material": "Bearing Steel"
    }
  },
  {
    id: 'prod-010',
    sku: 'FLUKE-87-V',
    name: 'Fluke 87V Industrial True-RMS Multimeter',
    category: 'Test & Measurement',
    manufacturer: 'Fluke',
    qualityScore: 94,
    confidenceScore: 96,
    status: 'Validated',
    lastUpdated: '2026-08-11',
    specifications: {
      "Display Type": "Digital (6000/20000 counts)",
      "Voltage DC/AC Max": "1000 V",
      "Current DC/AC Max": "10 A (20A for 30s max)",
      "Resistance Max": "50 MΩ",
      "Capacitance Max": "9999 µF",
      "Frequency Max": "200 kHz",
      "Safety Rating": "CAT III 1000V, CAT IV 600V",
      "Battery Life": "400 hours typical"
    }
  },
  {
    id: 'prod-011',
    sku: 'OMRON-E2E-X5MC1',
    name: 'Omron E2E Proximity Sensor M12 Unshielded NPN',
    category: 'Instrumentation & Sensors',
    manufacturer: 'Omron',
    qualityScore: 89,
    confidenceScore: 90,
    status: 'Pending Review',
    lastUpdated: '2026-08-10',
    specifications: {
      "Sensing Distance": "5 mm",
      "Installation Type": "Unshielded",
      "Output Type": "NPN Open Collector (NO)",
      "Power Supply Voltage": "12 to 24 VDC",
      "Response Frequency": "400 Hz",
      "Cable Length": "2 m",
      "Degree of Protection": "IP67"
    }
  },
  {
    id: 'prod-012',
    sku: 'FESTO-DSBC-32-100-PPVA',
    name: 'Festo DSBC ISO Cylinder 32mm Bore 100mm Stroke',
    category: 'Pneumatics',
    manufacturer: 'Festo',
    qualityScore: 82,
    confidenceScore: 85,
    status: 'In Processing',
    lastUpdated: '2026-08-09',
    specifications: {
      "Piston Diameter": "32 mm",
      "Stroke": "100 mm",
      "Cushioning": "PPVA (Pneumatic, adjustable)",
      "Operating Pressure": "0.6 to 12 bar",
      "Operating Medium": "Compressed Air ISO 8573-1:2010",
      "Theoretical Force at 6 bar": "483 N (Advance)",
      "Ambient Temperature": "-20 °C to 80 °C"
    }
  },
  {
    id: 'prod-013',
    sku: 'ABB-S203-C16',
    name: 'ABB System pro M compact Miniature Circuit Breaker S203 16A',
    category: 'Power Distribution',
    manufacturer: 'ABB',
    qualityScore: 97,
    confidenceScore: 98,
    status: 'Validated',
    lastUpdated: '2026-08-08',
    specifications: {
      "Number of Poles": "3",
      "Tripping Characteristic": "C",
      "Rated Current": "16 A",
      "Rated Operational Voltage": "400 V AC",
      "Rated Short-Circuit Capacity": "6 kA",
      "Power Loss": "7.5 W",
      "Electrical Endurance": "20000 AC cycles"
    }
  },
  {
    id: 'prod-014',
    sku: 'KEYENCE-SR-1000',
    name: 'Keyence SR-1000 Auto-Focus 1D/2D Code Reader',
    category: 'Industrial Automation',
    manufacturer: 'Keyence',
    qualityScore: 93,
    confidenceScore: 95,
    status: 'Validated',
    lastUpdated: '2026-08-07',
    specifications: {
      "Supported Codes": "QR, DataMatrix, Code39, Code128",
      "Focal Distance": "110 to 1000 mm",
      "Field of View": "120 x 90 mm (at 300mm)",
      "Lighting": "High-intensity LED (Red/White)",
      "Communication": "Ethernet/IP, PROFINET, RS-232C",
      "Input Power": "24 VDC ±10%",
      "Enclosure Rating": "IP65"
    }
  },
  {
    id: 'prod-015',
    sku: 'ATLAS-GA55-VSD',
    name: 'Atlas Copco GA55 VSD+ Rotary Screw Air Compressor',
    category: 'Compressors',
    manufacturer: 'Atlas Copco',
    qualityScore: 74,
    confidenceScore: 71,
    status: 'Needs Revision',
    lastUpdated: '2026-08-06',
    specifications: {
      "Motor Power": "55 kW (75 HP)",
      "Max Working Pressure": "13 bar",
      "FAD Capacity": "100 to 450 l/s",
      "Cooling Method": "Air Cooled",
      "Drive Type": "Variable Speed Drive (VSD)",
      "Noise Level": "67 dB(A)",
      "Weight": "1150 kg"
    }
  }
];

export const INITIAL_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Pumps & Fluid Handling',
    description: 'Industrial centrifugal, positive displacement, and submersible fluid pumps.',
    skuCount: 42,
    completeness: '96%',
    topBrands: ['Grundfos', 'KSB', 'Wilo', 'Sulzer']
  },
  {
    id: 'cat-2',
    name: 'Motors & Drives',
    description: '3-phase AC induction motors, synchronous servo motors, and gearboxes.',
    skuCount: 38,
    completeness: '94%',
    topBrands: ['Siemens', 'ABB', 'WEG', 'SEW-Eurodrive']
  },
  {
    id: 'cat-3',
    name: 'Instrumentation & Sensors',
    description: 'Pressure transmitters, electromagnetic flowmeters, and temperature sensors.',
    skuCount: 65,
    completeness: '91%',
    topBrands: ['Emerson', 'Endress+Hauser', 'Yokogawa', 'WIKA']
  },
  {
    id: 'cat-4',
    name: 'Valves & Actuators',
    description: 'High-pressure ball valves, butterfly valves, and pneumatic rotary actuators.',
    skuCount: 29,
    completeness: '89%',
    topBrands: ['Habonim', 'Flowserve', 'Bray', 'Samson']
  },
  {
    id: 'cat-5',
    name: 'Industrial Automation',
    description: 'Variable frequency drives (VFD), PLCs, and distributed I/O modules.',
    skuCount: 51,
    completeness: '95%',
    topBrands: ['Schneider Electric', 'Danfoss', 'Rockwell', 'Mitsubishi']
  },
  {
    id: 'cat-6',
    name: 'Power Distribution',
    description: 'Molded case circuit breakers (MCCB), switchgear, and power monitoring meters.',
    skuCount: 24,
    completeness: '87%',
    topBrands: ['ABB', 'Siemens', 'Eaton', 'Schneider Electric']
  }
];

export const INITIAL_BRANDS = [
  {
    id: 'brand-1',
    name: 'Grundfos',
    country: 'Denmark',
    categories: ['Pumps & Fluid Handling'],
    activeSKUs: 28,
    qualityRating: '95%',
    status: 'Verified Partner'
  },
  {
    id: 'brand-2',
    name: 'Siemens',
    country: 'Germany',
    categories: ['Motors & Drives', 'Industrial Automation', 'Power Distribution'],
    activeSKUs: 74,
    qualityRating: '96%',
    status: 'Verified Partner'
  },
  {
    id: 'brand-3',
    name: 'Emerson',
    country: 'United States',
    categories: ['Instrumentation & Sensors', 'Valves & Actuators'],
    activeSKUs: 49,
    qualityRating: '92%',
    status: 'Verified Partner'
  },
  {
    id: 'brand-4',
    name: 'Schneider Electric',
    country: 'France',
    categories: ['Industrial Automation', 'Power Distribution'],
    activeSKUs: 61,
    qualityRating: '94%',
    status: 'Verified Partner'
  },
  {
    id: 'brand-5',
    name: 'KSB',
    country: 'Germany',
    categories: ['Pumps & Fluid Handling', 'Valves & Actuators'],
    activeSKUs: 32,
    qualityRating: '88%',
    status: 'Active Supplier'
  },
  {
    id: 'brand-6',
    name: 'Danfoss',
    country: 'Denmark',
    categories: ['Industrial Automation', 'Motors & Drives'],
    activeSKUs: 26,
    qualityRating: '86%',
    status: 'Active Supplier'
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
