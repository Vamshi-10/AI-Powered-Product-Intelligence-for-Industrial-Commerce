import { hitlService } from './hitlService';

// Helper to normalize values for equivalence comparison
export const normalizeValue = (val) => {
  if (val === undefined || val === null) return '';
  let s = String(val).trim().toLowerCase();
  
  // Strip spaces, dashes, commas, quotes, and outer parentheses
  s = s.replace(/[\s\-\"\',\(\)]/g, '');
  
  // Normalize units
  if (s.endsWith('kw')) {
    const num = parseFloat(s.slice(0, -2));
    if (!isNaN(num)) return `${num * 1000}w`;
  }
  if (s.endsWith('kilowatt')) {
    const num = parseFloat(s.slice(0, -8));
    if (!isNaN(num)) return `${num * 1000}w`;
  }
  
  return s;
};

// Check if two values are equivalent under normalization
export const areValuesEquivalent = (v1, v2) => {
  const n1 = normalizeValue(v1);
  const n2 = normalizeValue(v2);
  return n1 === n2 && n1 !== '';
};

class ConfidenceService {
  /**
   * Calculates confidence and agreement for a single attribute based on evidence
   * @param {string} attribute 
   * @param {Array} evidenceList - List of { sourceId, value }
   * @param {Array} sourcesList - List of all sources belonging to the product
   */
  calculateAttributeConfidence(attribute, evidenceList = [], sourcesList = []) {
    // Filter out missing/empty values
    const availableEvidence = evidenceList.filter(e => e.value && e.value.trim() !== '' && e.value !== '—' && e.value !== 'Not available');
    const sourcesUsedCount = availableEvidence.length;

    if (sourcesUsedCount === 0) {
      return {
        attribute,
        combinedValue: '—',
        sourcesUsed: 0,
        agreement: '0/0',
        confidence: 0,
        level: 'Low',
        reason: 'No source evidence',
        evidence: [],
        hasConflict: false
      };
    }

    if (sourcesUsedCount === 1) {
      return {
        attribute,
        combinedValue: availableEvidence[0].value,
        sourcesUsed: 1,
        agreement: 'Single source',
        confidence: 64,
        level: 'Low',
        reason: 'Single source',
        evidence: availableEvidence,
        hasConflict: false
      };
    }

    // Group values by equivalence
    const groups = [];
    availableEvidence.forEach(ev => {
      const match = groups.find(g => areValuesEquivalent(g.normValue, ev.value));
      if (match) {
        match.count += 1;
        match.rawValues.push(ev.value);
        match.items.push(ev);
      } else {
        groups.push({
          normValue: ev.value,
          count: 1,
          rawValues: [ev.value],
          items: [ev]
        });
      }
    });

    // Sort groups by count descending
    groups.sort((a, b) => b.count - a.count);

    const consensusGroup = groups[0];
    const consensusValue = consensusGroup.rawValues[0]; // Pick first matching raw value
    const agreementCount = consensusGroup.count;
    const hasConflict = agreementCount < sourcesUsedCount;

    let confidence = 50;
    let level = 'Low';
    let reason = 'Uncertain values';

    if (!hasConflict) {
      if (sourcesUsedCount === 2) {
        confidence = 94;
        level = 'High';
        reason = 'Complete agreement (2/2)';
      } else if (sourcesUsedCount === 3) {
        confidence = 96;
        level = 'High';
        reason = 'Complete agreement (3/3)';
      } else {
        confidence = 98;
        level = 'High';
        reason = `Complete agreement (${sourcesUsedCount}/${sourcesUsedCount})`;
      }
    } else {
      if (agreementCount === 2 && sourcesUsedCount === 3) {
        confidence = 82;
        level = 'Medium';
        reason = 'Minor source conflict (2/3 agree)';
      } else if (agreementCount === 3 && sourcesUsedCount === 4) {
        confidence = 85;
        level = 'Medium';
        reason = 'Minor source conflict (3/4 agree)';
      } else if (agreementCount === 2 && sourcesUsedCount === 4) {
        confidence = 60;
        level = 'Low';
        reason = 'Significant conflict (2/4 agree)';
      } else {
        confidence = 50;
        level = 'Low';
        reason = 'High disagreement among sources';
      }
    }

    return {
      attribute,
      combinedValue: consensusValue,
      sourcesUsed: sourcesUsedCount,
      agreement: `${agreementCount}/${sourcesUsedCount} agree`,
      agreeCount: agreementCount,
      conflictCount: sourcesUsedCount - agreementCount,
      confidence,
      level,
      reason,
      evidence: availableEvidence,
      hasConflict
    };
  }

  /**
   * Generates combined confidence report for a product
   * @param {Object} product 
   */
  generateCombinedProductReport(product) {
    if (!product) return null;

    const sources = product.sources || [];
    const evidence = product.evidence || {};
    const specs = product.specifications || {};

    const attributesList = Object.keys(specs);
    const evaluated = attributesList.length;

    let sumConfidence = 0;
    let conflictsCount = 0;
    let confirmedCount = 0;
    let singleSourceCount = 0;

    const attributesReport = attributesList.map(attr => {
      const evidenceList = evidence[attr] || [];
      const attrConf = this.calculateAttributeConfidence(attr, evidenceList, sources);
      
      sumConfidence += attrConf.confidence;
      if (attrConf.hasConflict) conflictsCount++;
      else if (attrConf.sourcesUsed > 1) confirmedCount++;
      else if (attrConf.sourcesUsed === 1) singleSourceCount++;

      return attrConf;
    });

    const overallConfidence = evaluated > 0 ? Math.round(sumConfidence / evaluated) : 0;
    let overallLevel = 'LOW';
    if (overallConfidence >= 90) overallLevel = 'HIGH';
    else if (overallConfidence >= 75) overallLevel = 'MEDIUM';

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      sourcesUsed: sources.length,
      attributesEvaluated: evaluated,
      confirmedAttributes: confirmedCount + singleSourceCount,
      conflicts: conflictsCount,
      overallConfidence,
      overallLevel,
      attributes: attributesReport
    };
  }

  /**
   * Audits product attributes for conflicts and flags them for human validation queue
   * @param {Object} product 
   */
  auditProductConflicts(product) {
    if (!product) return;
    const report = this.generateCombinedProductReport(product);
    if (!report) return;

    let hitlQueueChanged = false;
    let hitlQueue = [];
    const stored = localStorage.getItem('adharra_hitl_queue');
    if (stored) {
      try { hitlQueue = JSON.parse(stored); } catch (e) {}
    }

    report.attributes.forEach(attrConf => {
      if (attrConf.hasConflict) {
        // Check if conflict is already in validation queue
        const exists = hitlQueue.some(item => 
          item.productId === product.id && 
          item.attribute === attrConf.attribute
        );

        if (!exists) {
          // Format evidence comparison list for human preview
          const originalValuesStr = attrConf.evidence
            .map(e => {
              const src = product.sources.find(s => s.id === e.sourceId);
              return `${src ? src.name : 'Source'}: ${e.value}`;
            })
            .join(' | ');

          const newItem = {
            id: `hitl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            category: product.category,
            attribute: attrConf.attribute,
            originalValue: originalValuesStr,
            aiExtractedValue: attrConf.combinedValue,
            aiSuggestedValue: attrConf.combinedValue,
            aiEnrichedValue: attrConf.combinedValue,
            confidenceScore: attrConf.confidence,
            reason: 'Source Conflict',
            requiresHumanReview: true,
            status: 'Pending Review',
            correctedValue: null,
            rejectionReason: null,
            reviewedAt: null,
            reviewedBy: null
          };
          hitlQueue.push(newItem);
          hitlQueueChanged = true;
        }
      }
    });

    if (hitlQueueChanged) {
      localStorage.setItem('adharra_hitl_queue', JSON.stringify(hitlQueue));
      // Notify components
      window.dispatchEvent(new CustomEvent('adharra_hitl_updated'));
    }
  }
}

export const confidenceService = new ConfidenceService();
