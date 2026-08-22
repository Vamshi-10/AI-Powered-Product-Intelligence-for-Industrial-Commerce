/**
 * ADHARRA — Validation Rules Service
 * 
 * Defines local validation rules for product records (e.g. required fields, range checks, category rules)
 * and evaluates products for data consistency, routing failures to human review.
 */

class ValidationRulesService {
  /**
   * Defines rules for a given product based on its category/attributes
   * @param {Object} product 
   * @returns {Array} List of rule objects
   */
  getRulesForProduct(product) {
    const rules = [];

    // 1. Required Field — SKU
    rules.push({
      category: 'Required Field',
      rule: 'SKU must not be empty',
      check: (p) => p.sku && p.sku.trim() !== '',
      getCheckedValue: (p) => p.sku || 'Missing',
      failureReason: 'Required field SKU is missing'
    });

    // 2. Required Field — Product Name
    rules.push({
      category: 'Required Field',
      rule: 'Product Name is required',
      check: (p) => p.name && p.name.trim() !== '',
      getCheckedValue: (p) => p.name || 'Missing',
      failureReason: 'Required field Product Name is missing'
    });

    // 3. Duplicate SKU
    rules.push({
      category: 'Duplicate SKU',
      rule: 'SKU must be unique',
      check: (p, allProducts) => {
        if (!p.sku) return true;
        const matches = allProducts.filter(other => 
          other.id !== p.id && 
          other.sku && 
          other.sku.trim().toLowerCase() === p.sku.trim().toLowerCase()
        );
        return matches.length === 0;
      },
      getCheckedValue: (p) => p.sku || 'N/A',
      failureReason: 'Duplicate SKU detected in catalog'
    });

    // 4. Value Range — Price
    rules.push({
      category: 'Value Range',
      rule: 'Price must be greater than or equal to 0',
      check: (p) => {
        const val = p.specifications?.['Price'] || p.specifications?.['price'];
        if (val === undefined || val === null || val === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      getCheckedValue: (p) => p.specifications?.['Price'] || p.specifications?.['price'] || 'Not specified',
      failureReason: 'Value range validation failed (negative value)'
    });

    // 5. Category Requirement — Motor products require Rated Power
    const isMotor = (product.category && product.category.toLowerCase().includes('motor')) ||
                    (product.name && product.name.toLowerCase().includes('motor'));
    if (isMotor) {
      rules.push({
        category: 'Category Requirement',
        rule: 'Motor products require Rated Power',
        check: (p) => {
          const specs = p.specifications || {};
          return !!(specs['Power Rating'] || specs['Motor Power'] || specs['power'] || specs['Power'] || specs['powerRating'] || specs['ratedPower']);
        },
        getCheckedValue: (p) => {
          const specs = p.specifications || {};
          return specs['Power Rating'] || specs['Motor Power'] || specs['power'] || specs['Power'] || specs['powerRating'] || specs['ratedPower'] || 'Missing';
        },
        failureReason: 'Required attribute missing'
      });
    }

    // 6. Category Requirement — Pump products require Flow Rate
    const isPump = (product.category && product.category.toLowerCase().includes('pump')) ||
                   (product.name && product.name.toLowerCase().includes('pump'));
    if (isPump) {
      rules.push({
        category: 'Category Requirement',
        rule: 'Pump products require Flow Rate',
        check: (p) => {
          const specs = p.specifications || {};
          return !!(specs['Flow Rate'] || specs['flowRate'] || specs['Flow']);
        },
        getCheckedValue: (p) => {
          const specs = p.specifications || {};
          return specs['Flow Rate'] || specs['flowRate'] || specs['Flow'] || 'Missing';
        },
        failureReason: 'Required attribute missing'
      });
    }

    // 7. Format & Allowed Unit — Voltage format valid (ends with V)
    rules.push({
      category: 'Format',
      rule: 'Voltage format valid',
      check: (p) => {
        const specs = p.specifications || {};
        const v = specs['Voltage'] || specs['Supply Voltage'] || specs['voltage'];
        if (!v) return true;
        return /v/i.test(String(v));
      },
      getCheckedValue: (p) => {
        const specs = p.specifications || {};
        return specs['Voltage'] || specs['Supply Voltage'] || specs['voltage'] || 'N/A';
      },
      failureReason: 'Required unit missing'
    });

    return rules;
  }

  /**
   * Runs all validation rules on a product record
   * @param {Object} product 
   * @param {Array} allProducts 
   * @returns {Object} { isValid, results: Array<{ category, rule, value, result, reason }> }
   */
  runValidation(product, allProducts = []) {
    const rules = this.getRulesForProduct(product);
    const results = rules.map(r => {
      const passed = r.check(product, allProducts);
      return {
        category: r.category,
        rule: r.rule,
        value: r.getCheckedValue(product),
        result: passed ? 'PASSED' : 'FAILED',
        reason: passed ? 'Passed' : r.failureReason
      };
    });

    const isValid = results.every(r => r.result === 'PASSED');
    return { isValid, results };
  }
}

export const validationRulesService = new ValidationRulesService();
