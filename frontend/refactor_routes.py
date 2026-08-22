import re

file_path = "C:/Users/GUNASHREE S/OneDrive/Desktop/AI/AI-Powered-Product-Intelligence-for-Industrial-Commerce/frontend/src/pages/dashboard/DashboardSectionView.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Products Updates
content = content.replace("1.3 Categories (/dashboard/products/categories)", "1.3 Comparison (/dashboard/products/comparison)")
content = content.replace("{path === '/dashboard/products/categories' && (", "{path === '/dashboard/products/comparison' && (")
content = content.replace("Products / Categories", "Products / Comparison")
content = content.replace("Category Taxonomy", "Product Comparison")

content = content.replace("1.4 Brands (/dashboard/products/brands)", "1.4 Documents (/dashboard/products/documents)")
content = content.replace("{path === '/dashboard/products/brands' && (", "{path === '/dashboard/products/documents' && (")
content = content.replace("Products / Brands", "Products / Documents")
content = content.replace("Manufacturer Directory", "Product Documents")

# AI Intelligence Updates
content = content.replace("SECTION 2: AI INTELLIGENCE\n            ======================================================== */}", "SECTION 2: AI INTELLIGENCE\n            ======================================================== */}\n        {path === '/dashboard/ai' && (\n          <div className=\"placeholder-view\">\n             <h2>Products AI Status</h2>\n             <p>AI processing status by product</p>\n          </div>\n        )}")

# Quality Updates - Remove missing
content = re.sub(r"\{\s*/\*\s*3\.5 Missing Values.*?\}\s*\{path === '/dashboard/quality/missing' && \([\s\S]*?\}\)\s*\}", "", content)

# Validation Updates
content = content.replace("4.1 Validation Queue (/dashboard/validation)", "4.1 Review Queue (/dashboard/validation)")
content = content.replace("Validation Queue", "Review Queue")
content = content.replace("4.4 Validation Rules (/dashboard/validation/rules)", "4.3 Validation Rules (/dashboard/validation/rules)")

# Remove approval 
content = re.sub(r"\{\s*/\*\s*4\.2 Approve.*?\}\s*\{path === '/dashboard/validation/approval' && \([\s\S]*?\}\)\s*\}", "", content)

# Rename review to audit
content = content.replace("4.3 Manual Review (/dashboard/validation/review)", "4.4 Audit History (/dashboard/validation/audit)")
content = content.replace("path === '/dashboard/validation/review'", "path === '/dashboard/validation/audit'")
content = content.replace("Manual Review", "Audit History")


# Insights Updates
content = re.sub(r"\{\s*/\*\s*5\.1 AI Insights \(/dashboard/insights\).*?\}\s*\{path === '/dashboard/insights' && \([\s\S]*?\}\)\s*\}", "", content)

# Sources Updates
content = re.sub(r"\{\s*/\*\s*6\.1 Data Sources \(/dashboard/sources\).*?\}\s*\{path === '/dashboard/sources' && \([\s\S]*?\}\)\s*\}", "", content)

# Settings Updates
content = re.sub(r"\{\s*/\*\s*7\.1 Settings Overview \(/dashboard/settings\).*?\}\s*\{path === '/dashboard/settings' && \([\s\S]*?\}\)\s*\}", "", content)

# Support Updates
content = re.sub(r"\{\s*/\*\s*8\.2 Documentation \(/dashboard/support/documentation\).*?\}\s*\{path === '/dashboard/support/documentation' && \([\s\S]*?\}\)\s*\}", "", content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
