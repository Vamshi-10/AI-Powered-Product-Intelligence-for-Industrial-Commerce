import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  UploadCloud, 
  Globe, 
  Edit3, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  FileCheck,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { formatFileSize, validateUrl, ACCEPTED_FILE_EXTENSIONS } from '../../services/uploadService';
import { productService } from '../../services/productService';
import { confidenceService } from '../../services/confidenceService';
import './UploadPage.css';

// Helper to read File as Text
const readFileAsText = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || '');
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
};

// Helper to parse CSV products
const parseCSV = (text, fileName) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  
  // Detect headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const products = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length === 0 || !values[0]) continue;
    
    const item = {
      status: 'In Processing',
      source: { fileName, fileType: 'csv' },
      specifications: {}
    };
    
    headers.forEach((header, index) => {
      const val = values[index] || '';
      if (!val) return;
      if (header === 'name' || header === 'product name') item.name = val;
      else if (header === 'sku' || header === 'sku number') item.sku = val;
      else if (header === 'category') item.category = val;
      else if (header === 'manufacturer' || header === 'brand') item.manufacturer = val;
      else {
        const displayHeader = header.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        item.specifications[displayHeader] = val;
      }
    });
    
    if (!item.name) item.name = `CSV Row ${i} (${fileName})`;
    if (!item.sku) item.sku = `SKU-CSV-${Math.floor(100000 + Math.random() * 900000)}`;
    
    products.push(item);
  }
  return products;
};

// Helper to parse JSON products
const parseJSON = (text, fileName) => {
  try {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : [data];
    return items.map((item, index) => ({
      sku: item.sku || `SKU-JSON-${Math.floor(100000 + Math.random() * 900000)}`,
      name: item.name || `JSON Item ${index + 1} (${fileName})`,
      category: item.category || 'Instrumentation & Sensors',
      manufacturer: item.manufacturer || 'Unknown Manufacturer',
      status: 'In Processing',
      specifications: item.specifications || {},
      source: { fileName, fileType: 'json' }
    }));
  } catch (e) {
    console.error('Failed to parse JSON product file', e);
    return [];
  }
};

const TABS = [
  { id: 'files', label: 'File Upload', icon: UploadCloud, desc: 'PDF, CSV, XLSX, JSON, Images' },
  { id: 'url', label: 'Product URL', icon: Globe, desc: 'Web pages & supplier links' },
  { id: 'manual', label: 'Manual Entry', icon: Edit3, desc: 'Form fields & key specs' },
  { id: 'paste', label: 'Paste Text', icon: FileText, desc: 'Raw specs & datasheet text' },
  { id: 'images', label: 'Product Images', icon: ImageIcon, desc: 'Visual PNG/JPG assets' }
];

const UploadPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('files');

  // Mode: Create New vs Add to Existing
  const [uploadTargetMode, setUploadTargetMode] = useState('new');
  const productsList = productService.getProducts();
  const [selectedProductId, setSelectedProductId] = useState(() => productsList[0]?.id || '');

  // Multi-source state pool
  const [fileSources, setFileSources] = useState([]);
  const [urlSources, setUrlSources] = useState([]);
  const [manualSources, setManualSources] = useState([]);
  const [textSources, setTextSources] = useState([]);
  const [imageSources, setImageSources] = useState([]);

  // Enterprise Ingestion States
  const [bulkIngestions, setBulkIngestions] = useState([
    { id: 1, file: 'supplier_catalog.xlsx', records: 1250, processed: 1221, needsReview: 24, failed: 5, status: 'Completed with Issues' },
    { id: 2, file: 'motor_specifications_jan.csv', records: 80, processed: 80, needsReview: 0, failed: 0, status: 'Completed' },
    { id: 3, file: 'pump_catalog_2026.xlsx', records: 500, processed: 440, needsReview: 54, failed: 6, status: 'Completed with Issues' },
    { id: 4, file: 'valve_standard_pricing.csv', records: 120, processed: 100, needsReview: 0, failed: 20, status: 'Failed', canRetry: true }
  ]);

  const handleRetryIngestion = (id) => {
    setBulkIngestions(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'Retrying...', canRetry: false };
      }
      return item;
    }));

    setTimeout(() => {
      setBulkIngestions(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, processed: item.processed + 20, failed: 0, status: 'Completed' };
        }
        return item;
      }));
    }, 1500);
  };

  // Form states
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  const [manualForm, setManualForm] = useState({
    name: '',
    manufacturer: '',
    category: '',
    sku: '',
    modelNumber: '',
    description: '',
    specifications: '',
    productUrl: '',
    notes: ''
  });
  const [manualError, setManualError] = useState('');

  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteError, setPasteError] = useState('');

  // Global processing validation error
  const [globalError, setGlobalError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Total sources count
  const totalSourcesCount = 
    fileSources.length + 
    urlSources.length + 
    manualSources.length + 
    textSources.length + 
    imageSources.length;

  // ---- 1. File Upload Handlers ----
  const handleFilesSelected = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setGlobalError('');
    const newFiles = Array.from(filesList).map((file) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'Unknown Type',
      extension: file.name.split('.').pop().toUpperCase(),
      uploadSource: 'Direct Upload',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFileSources((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const removeFile = (id) => {
    setFileSources((prev) => prev.filter((f) => f.id !== id));
  };

  // ---- 2. Product URL Handlers ----
  const handleAddUrl = (e) => {
    e.preventDefault();
    setUrlError('');
    if (!urlInput.trim()) {
      setUrlError('Please enter a product or manufacturer URL.');
      return;
    }
    if (!validateUrl(urlInput.trim())) {
      setUrlError('Please enter a valid URL including http:// or https://');
      return;
    }

    setGlobalError('');
    let domain = '';
    try {
      domain = new URL(urlInput.trim()).hostname;
    } catch (err) {
      domain = 'Web Source';
    }

    const newUrlSource = {
      id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: urlInput.trim(),
      domain: domain.replace('www.', ''),
      status: 'Ready for processing',
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setUrlSources((prev) => [...prev, newUrlSource]);
    setUrlInput('');
  };

  const removeUrl = (id) => {
    setUrlSources((prev) => prev.filter((u) => u.id !== id));
  };

  // ---- 3. Manual Product Entry Handlers ----
  const handleAddManualEntry = (e) => {
    e.preventDefault();
    setManualError('');
    if (!manualForm.name.trim()) {
      setManualError('Product Name is required.');
      return;
    }

    setGlobalError('');
    const newManualSource = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...manualForm,
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setManualSources((prev) => [...prev, newManualSource]);
    setManualForm({
      name: '',
      manufacturer: '',
      category: '',
      sku: '',
      modelNumber: '',
      description: '',
      specifications: '',
      productUrl: '',
      notes: ''
    });
  };

  const removeManualSource = (id) => {
    setManualSources((prev) => prev.filter((m) => m.id !== id));
  };

  // ---- 4. Paste Text Handlers ----
  const handleAddPasteText = (e) => {
    e.preventDefault();
    setPasteError('');
    if (!pasteText.trim()) {
      setPasteError('Please enter or paste product specification text.');
      return;
    }

    setGlobalError('');
    const title = pasteTitle.trim() || `Pasted Specs (${pasteText.trim().slice(0, 30)}...)`;
    const newTextSource = {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      content: pasteText.trim(),
      charCount: pasteText.trim().length,
      lineCount: pasteText.trim().split('\n').length,
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTextSources((prev) => [...prev, newTextSource]);
    setPasteText('');
    setPasteTitle('');
  };

  const removeTextSource = (id) => {
    setTextSources((prev) => prev.filter((t) => t.id !== id));
  };

  // ---- 5. Image Upload Handlers ----
  const handleImagesSelected = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setGlobalError('');
    const newImages = Array.from(filesList)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file)
      }));
    setImageSources((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setImageSources((prev) => prev.filter((img) => img.id !== id));
  };

  // ---- Start Processing Navigation ----
  const handleStartProcessing = async () => {
    if (totalSourcesCount === 0) {
      setGlobalError('Add at least one product source before continuing.');
      return;
    }

    const payload = {
      files: fileSources.map(f => ({ name: f.name, size: f.size, extension: f.extension })),
      urls: urlSources,
      manual: manualSources,
      texts: textSources,
      images: imageSources.map(img => ({ name: img.name, size: img.size })),
      totalCount: totalSourcesCount,
      timestamp: new Date().toISOString()
    };

    if (uploadTargetMode === 'existing' && selectedProductId) {
      const existingProduct = productsList.find(p => p.id === selectedProductId);
      if (existingProduct) {
        const sources = [...(existingProduct.sources || [])];
        const evidence = { ...(existingProduct.evidence || {}) };
        const specifications = { ...(existingProduct.specifications || {}) };

        const addSourceEvidence = (srcName, srcType, specsObj) => {
          const srcId = `SRC-${Math.floor(1000 + Math.random() * 9000)}`;
          sources.push({ id: srcId, type: srcType, name: srcName });
          
          Object.keys(specsObj).forEach(attr => {
            if (!evidence[attr]) {
              evidence[attr] = [];
              if (specifications[attr]) {
                evidence[attr].push({ sourceId: 'SRC-ORIG', value: specifications[attr] });
              }
            }
            evidence[attr].push({ sourceId: srcId, value: specsObj[attr] });
            specifications[attr] = specsObj[attr];
          });
        };

        // 1. Files
        for (const fs of fileSources) {
          if (fs.extension === 'CSV') {
            const text = await readFileAsText(fs.file);
            const parsed = parseCSV(text, fs.name);
            const mergedSpecs = {};
            parsed.forEach(p => {
              Object.assign(mergedSpecs, p.specifications);
              if (p.name && !mergedSpecs['Name']) mergedSpecs['Name'] = p.name;
            });
            addSourceEvidence(fs.name, 'xlsx', mergedSpecs);
          } else if (fs.extension === 'JSON') {
            const text = await readFileAsText(fs.file);
            const parsed = parseJSON(text, fs.name);
            const mergedSpecs = {};
            parsed.forEach(p => {
              Object.assign(mergedSpecs, p.specifications);
              if (p.name && !mergedSpecs['Name']) mergedSpecs['Name'] = p.name;
            });
            addSourceEvidence(fs.name, 'json', mergedSpecs);
          } else {
            addSourceEvidence(fs.name, fs.extension.toLowerCase(), {});
          }
        }

        // 2. URLs
        urlSources.forEach(u => {
          addSourceEvidence(u.url, 'html', {});
        });

        // 3. Manual Entry
        manualSources.forEach(m => {
          const specObj = {};
          if (m.specifications) {
            const lines = m.specifications.split('\n');
            lines.forEach(line => {
              const parts = line.split(':');
              if (parts.length >= 2) {
                const k = parts[0].trim();
                const v = parts.slice(1).join(':').trim();
                if (k && v) specObj[k] = v;
              }
            });
          }
          if (m.name) specObj['Name'] = m.name;
          addSourceEvidence('Manual Entry', 'manual', specObj);
        });

        // 4. Pasted Text
        textSources.forEach(t => {
          const specObj = {};
          const lines = t.content.split('\n');
          lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
              const k = parts[0].trim();
              const v = parts.slice(1).join(':').trim();
              if (k && v && k.length < 50 && v.length < 100) {
                specObj[k] = v;
              }
            }
          });
          addSourceEvidence(t.title || 'Pasted Specs', 'text', specObj);
        });

        // 5. Images
        imageSources.forEach(img => {
          addSourceEvidence(img.name, 'image', {});
        });

        // Update product record
        productService.updateProduct(existingProduct.id, {
          sources,
          evidence,
          specifications,
          status: 'In Processing'
        });

        // Run local audit to flag conflicts immediately
        confidenceService.auditProductConflicts(productService.getProducts().find(p => p.id === existingProduct.id));

        navigate('/processing', { state: { sourceData: payload, newProductIds: [existingProduct.id] } });
        return;
      }
    }

    const addedProducts = [];

    // 1. Files
    for (const fs of fileSources) {
      if (fs.extension === 'CSV') {
        const text = await readFileAsText(fs.file);
        const parsed = parseCSV(text, fs.name);
        addedProducts.push(...parsed);
      } else if (fs.extension === 'JSON') {
        const text = await readFileAsText(fs.file);
        const parsed = parseJSON(text, fs.name);
        addedProducts.push(...parsed);
      } else {
        addedProducts.push({
          sku: `SKU-FILE-${Math.floor(100000 + Math.random() * 900000)}`,
          name: fs.name.replace(/\.[^/.]+$/, ""),
          category: 'Instrumentation & Sensors',
          manufacturer: 'Unknown Manufacturer',
          status: 'In Processing',
          specifications: {},
          source: { fileName: fs.name, fileType: fs.extension.toLowerCase() }
        });
      }
    }

    // 2. URLs
    urlSources.forEach(u => {
      addedProducts.push({
        sku: `SKU-URL-${Math.floor(100000 + Math.random() * 900000)}`,
        name: `Product from ${u.domain}`,
        category: 'Instrumentation & Sensors',
        manufacturer: u.domain,
        status: 'In Processing',
        specifications: {},
        source: { fileName: u.url, fileType: 'url' }
      });
    });

    // 3. Manual Entry
    manualSources.forEach(m => {
      const specObj = {};
      if (m.specifications) {
        const lines = m.specifications.split('\n');
        lines.forEach(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const k = parts[0].trim();
            const v = parts.slice(1).join(':').trim();
            if (k && v) specObj[k] = v;
          }
        });
      }
      addedProducts.push({
        sku: m.sku || `SKU-MAN-${Math.floor(100000 + Math.random() * 900000)}`,
        name: m.name,
        category: m.category || 'Instrumentation & Sensors',
        manufacturer: m.manufacturer || 'Unknown Manufacturer',
        status: 'In Processing',
        specifications: specObj,
        source: { fileName: 'Manual Entry', fileType: 'manual' }
      });
    });

    // 4. Pasted Text
    textSources.forEach(t => {
      const textProduct = {
        sku: `SKU-TXT-${Math.floor(100000 + Math.random() * 900000)}`,
        name: t.title || 'Pasted Text Datasheet',
        category: 'Instrumentation & Sensors',
        manufacturer: 'Unknown Manufacturer',
        status: 'In Processing',
        specifications: {},
        source: { fileName: t.title, fileType: 'text' }
      };
      const lines = t.content.split('\n');
      lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          const v = parts.slice(1).join(':').trim();
          if (k && v && k.length < 50 && v.length < 100) {
            textProduct.specifications[k] = v;
          }
        }
      });
      addedProducts.push(textProduct);
    });

    // 5. Images
    imageSources.forEach(img => {
      addedProducts.push({
        sku: `SKU-IMG-${Math.floor(100000 + Math.random() * 900000)}`,
        name: img.name.replace(/\.[^/.]+$/, ""),
        category: 'Instrumentation & Sensors',
        manufacturer: 'Unknown Manufacturer',
        status: 'In Processing',
        specifications: {},
        source: { fileName: img.name, fileType: 'image' }
      });
    });

    // Save to productService
    const resultProducts = productService.addProducts(addedProducts);
    const newProductIds = resultProducts.map(p => p.id);

    navigate('/processing', { state: { sourceData: payload, newProductIds } });
  };

  // Helper file icon renderer
  const renderFileIcon = (ext) => {
    switch (ext) {
      case 'PDF': return <FileText className="file-icon-pdf" size={20} />;
      case 'CSV':
      case 'XLSX':
      case 'XLS': return <FileSpreadsheet className="file-icon-sheet" size={20} />;
      case 'JSON': return <FileCode className="file-icon-code" size={20} />;
      case 'PNG':
      case 'JPG':
      case 'JPEG':
      case 'WEBP': return <ImageIcon className="file-icon-img" size={20} />;
      default: return <FileCheck className="file-icon-generic" size={20} />;
    }
  };

  return (
    <div className="upload-page-root">
      <div className="upload-max-wrapper">

        {/* Page Hero Header */}
        <header className="upload-header">
          <div className="upload-header-left">
            <div className="upload-badge">
              <Sparkles size={13} className="upload-badge-icon" />
              <span>Multi-Source Ingestion Pipeline</span>
            </div>
            <h1 className="upload-title">Upload Product Data</h1>
            <p className="upload-subtitle">
              Add product information from files, links, documents, images, or manual input.
            </p>
          </div>

          <div className="upload-header-right">
            <div className="sources-counter-pill">
              <Layers size={15} />
              <span>{totalSourcesCount} {totalSourcesCount === 1 ? 'Source' : 'Sources'} Ready</span>
            </div>
          </div>
        </header>

        {/* Global Error Banner if 0 sources when submitting */}
        {globalError && (
          <div className="upload-global-alert" role="alert">
            <AlertCircle size={18} />
            <span>{globalError}</span>
          </div>
        )}

        {/* Upload Mode Selector (Add Sources to Existing Product) */}
        <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <input 
                type="radio" 
                name="uploadTargetMode" 
                value="new" 
                checked={uploadTargetMode === 'new'} 
                onChange={() => setUploadTargetMode('new')}
                style={{ accentColor: 'var(--accent)' }}
              />
              Create New Product Record
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <input 
                type="radio" 
                name="uploadTargetMode" 
                value="existing" 
                checked={uploadTargetMode === 'existing'} 
                onChange={() => setUploadTargetMode('existing')}
                style={{ accentColor: 'var(--accent)' }}
              />
              Add Sources to Existing Product
            </label>
          </div>

          {uploadTargetMode === 'existing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Existing Product:</span>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: 6, 
                  background: 'var(--surface-primary)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                {productsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Input Methods Tab Selector */}
        <nav className="input-method-tabs" aria-label="Input Methods">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            let count = 0;
            if (tab.id === 'files') count = fileSources.length;
            if (tab.id === 'url') count = urlSources.length;
            if (tab.id === 'manual') count = manualSources.length;
            if (tab.id === 'paste') count = textSources.length;
            if (tab.id === 'images') count = imageSources.length;

            return (
              <button
                key={tab.id}
                type="button"
                className={`input-tab-btn ${isActive ? 'tab-active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setGlobalError('');
                }}
              >
                <div className="tab-icon-wrap">
                  <Icon size={18} />
                </div>
                <div className="tab-text-wrap">
                  <div className="tab-title-row">
                    <span className="tab-title">{tab.label}</span>
                    {count > 0 && <span className="tab-count-badge">{count}</span>}
                  </div>
                  <span className="tab-desc">{tab.desc}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Active Tab Workspace Container */}
        <div className="upload-workspace-card">

          {/* ========================================================
              TAB 1: FILE UPLOAD
              ======================================================== */}
          {activeTab === 'files' && (
            <div className="tab-content-panel">
              <div 
                className={`drag-drop-zone ${isDragging ? 'is-dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".pdf,.csv,.xlsx,.xls,.json,.txt,.png,.jpg,.jpeg,.webp"
                  className="hidden-file-input"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <div className="dropzone-icon-halo">
                  <UploadCloud size={40} />
                </div>
                <h3 className="dropzone-title">Drag & Drop Product Files Here</h3>
                <p className="dropzone-subtitle">or click to browse local files</p>

                <div className="accepted-formats-chips">
                  {ACCEPTED_FILE_EXTENSIONS.map((ext) => (
                    <span key={ext} className="ext-chip">{ext}</span>
                  ))}
                </div>
              </div>

              {/* Selected Files List */}
              {fileSources.length > 0 && (
                <div className="selected-items-section">
                  <div className="selected-items-header">
                    <h4 className="selected-items-title">Selected Files ({fileSources.length})</h4>
                    <button 
                      type="button" 
                      className="btn-add-more"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      <Plus size={14} />
                      <span>Add More Files</span>
                    </button>
                  </div>

                  <div className="file-items-list">
                    {fileSources.map((item) => (
                      <div key={item.id} className="file-item-card">
                        <div className="file-item-left">
                          <div className="file-icon-box">
                            {renderFileIcon(item.extension)}
                          </div>
                          <div className="file-meta">
                            <span className="file-name" title={item.name}>{item.name}</span>
                            <div className="file-sub-meta">
                              <span className="file-ext-badge">{item.extension}</span>
                              <span className="meta-sep">•</span>
                              <span>{formatFileSize(item.size)}</span>
                              <span className="meta-sep">•</span>
                              <span className="file-source-text">{item.uploadSource}</span>
                            </div>
                          </div>
                        </div>

                        <div className="file-item-actions">
                          <button 
                            type="button" 
                            className="btn-item-action"
                            title="Remove file"
                            onClick={() => removeFile(item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2: PRODUCT URL
              ======================================================== */}
          {activeTab === 'url' && (
            <div className="tab-content-panel">
              <form onSubmit={handleAddUrl} className="url-input-form">
                <div className="form-group-wrap">
                  <label className="input-label" htmlFor="product-url-input">
                    Product / Manufacturer URL
                  </label>
                  <div className="url-input-bar">
                    <Globe size={18} className="url-bar-icon" />
                    <input 
                      id="product-url-input"
                      type="text"
                      className={`url-input-field ${urlError ? 'field-error' : ''}`}
                      placeholder="https://manufacturer.com/product/industrial-pump"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (urlError) setUrlError('');
                      }}
                    />
                    <button type="submit" className="btn-add-url">
                      <Plus size={16} />
                      <span>Add URL</span>
                    </button>
                  </div>
                  {urlError && (
                    <span className="inline-field-error" role="alert">
                      <AlertCircle size={14} />
                      {urlError}
                    </span>
                  )}
                  <p className="input-helper-text">
                    Add direct supplier URLs, e-commerce catalog pages, or specification web endpoints.
                  </p>
                </div>
              </form>

              {/* Added URLs List */}
              {urlSources.length > 0 && (
                <div className="selected-items-section">
                  <h4 className="selected-items-title">Added Product URLs ({urlSources.length})</h4>
                  <div className="url-items-list">
                    {urlSources.map((item) => (
                      <div key={item.id} className="url-item-card">
                        <div className="url-item-left">
                          <div className="url-icon-box">
                            <Globe size={18} />
                          </div>
                          <div className="url-meta">
                            <div className="url-domain-row">
                              <span className="url-domain">{item.domain}</span>
                              <span className="url-status-badge">
                                <CheckCircle2 size={12} />
                                <span>{item.status}</span>
                              </span>
                            </div>
                            <span className="url-href" title={item.url}>{item.url}</span>
                          </div>
                        </div>

                        <div className="url-item-actions">
                          <button 
                            type="button" 
                            className="btn-item-action"
                            title="Remove URL"
                            onClick={() => removeUrl(item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 3: MANUAL ENTRY
              ======================================================== */}
          {activeTab === 'manual' && (
            <div className="tab-content-panel">
              <form onSubmit={handleAddManualEntry} className="manual-entry-form">
                
                {manualError && (
                  <div className="form-error-banner" role="alert">
                    <AlertCircle size={16} />
                    <span>{manualError}</span>
                  </div>
                )}

                <div className="form-grid-2col">
                  
                  {/* Product Name (Required) */}
                  <div className="form-field-item field-full">
                    <label className="field-label" htmlFor="manual-name">
                      Product Name <span className="req-star">*</span>
                    </label>
                    <input 
                      id="manual-name"
                      type="text"
                      className="form-text-input"
                      placeholder="e.g. Heavy-Duty Stainless Centrifugal Pump 5HP"
                      value={manualForm.name}
                      onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                    />
                  </div>

                  {/* Manufacturer */}
                  <div className="form-field-item">
                    <label className="field-label" htmlFor="manual-manufacturer">
                      Manufacturer / Brand
                    </label>
                    <input 
                      id="manual-manufacturer"
                      type="text"
                      className="form-text-input"
                      placeholder="e.g. Grundfos, Siemens, KSB"
                      value={manualForm.manufacturer}
                      onChange={(e) => setManualForm({ ...manualForm, manufacturer: e.target.value })}
                    />
                  </div>

                  {/* Category */}
                  <div className="form-field-item">
                    <label className="field-label" htmlFor="manual-category">
                      Category
                    </label>
                    <input 
                      id="manual-category"
                      type="text"
                      className="form-text-input"
                      placeholder="e.g. Industrial Pumps & Fluids"
                      value={manualForm.category}
                      onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    />
                  </div>

                  {/* SKU / Product ID */}
                  <div className="form-field-item">
                    <label className="field-label" htmlFor="manual-sku">
                      Product ID / SKU
                    </label>
                    <input 
                      id="manual-sku"
                      type="text"
                      className="form-text-input"
                      placeholder="e.g. SKU-84920-IND"
                      value={manualForm.sku}
                      onChange={(e) => setManualForm({ ...manualForm, sku: e.target.value })}
                    />
                  </div>

                  {/* Model Number */}
                  <div className="form-field-item">
                    <label className="field-label" htmlFor="manual-model">
                      Model Number
                    </label>
                    <input 
                      id="manual-model"
                      type="text"
                      className="form-text-input"
                      placeholder="e.g. CR-15-04-A-A-E-HQQE"
                      value={manualForm.modelNumber}
                      onChange={(e) => setManualForm({ ...manualForm, modelNumber: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="form-field-item field-full">
                    <label className="field-label" htmlFor="manual-desc">
                      Description
                    </label>
                    <textarea 
                      id="manual-desc"
                      rows={3}
                      className="form-textarea-input"
                      placeholder="Enter a comprehensive technical summary of the product..."
                      value={manualForm.description}
                      onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    />
                  </div>

                  {/* Specifications */}
                  <div className="form-field-item field-full">
                    <label className="field-label" htmlFor="manual-specs">
                      Specifications (Key-Value or Multiline)
                    </label>
                    <textarea 
                      id="manual-specs"
                      rows={3}
                      className="form-textarea-input"
                      placeholder={`Flow Rate: 120 L/min\nPressure: 8 bar\nVoltage: 415 V\nMaterial: Stainless Steel 316`}
                      value={manualForm.specifications}
                      onChange={(e) => setManualForm({ ...manualForm, specifications: e.target.value })}
                    />
                  </div>

                  {/* Product URL */}
                  <div className="form-field-item">
                    <label className="field-label" htmlFor="manual-url">
                      Product URL (Optional)
                    </label>
                    <input 
                      id="manual-url"
                      type="text"
                      className="form-text-input"
                      placeholder="https://..."
                      value={manualForm.productUrl}
                      onChange={(e) => setManualForm({ ...manualForm, productUrl: e.target.value })}
                    />
                  </div>

                  {/* Notes */}
                  <div className="form-field-item">
                    <label className="field-label" htmlFor="manual-notes">
                      Additional Notes
                    </label>
                    <input 
                      id="manual-notes"
                      type="text"
                      className="form-text-input"
                      placeholder="Special handling or compliance notes"
                      value={manualForm.notes}
                      onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    />
                  </div>

                </div>

                <div className="form-actions-row">
                  <button type="submit" className="btn-dash-primary">
                    <Plus size={16} />
                    <span>Add Manual Product to Sources</span>
                  </button>
                </div>
              </form>

              {/* Added Manual Products List */}
              {manualSources.length > 0 && (
                <div className="selected-items-section">
                  <h4 className="selected-items-title">Manual Product Entries ({manualSources.length})</h4>
                  <div className="manual-items-list">
                    {manualSources.map((item) => (
                      <div key={item.id} className="manual-item-card">
                        <div className="manual-item-left">
                          <div className="manual-icon-box">
                            <Edit3 size={18} />
                          </div>
                          <div className="manual-meta">
                            <div className="manual-title-row">
                              <span className="manual-name">{item.name}</span>
                              {item.manufacturer && <span className="manual-brand-tag">{item.manufacturer}</span>}
                            </div>
                            <div className="manual-sub-meta">
                              {item.sku && <span>SKU: {item.sku}</span>}
                              {item.category && <span>• {item.category}</span>}
                              {item.modelNumber && <span>• Model: {item.modelNumber}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="manual-item-actions">
                          <button 
                            type="button" 
                            className="btn-item-action"
                            title="Remove entry"
                            onClick={() => removeManualSource(item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 4: PASTE TEXT
              ======================================================== */}
          {activeTab === 'paste' && (
            <div className="tab-content-panel">
              <form onSubmit={handleAddPasteText} className="paste-text-form">
                
                <div className="form-field-item">
                  <label className="field-label" htmlFor="paste-title-input">
                    Snippet Label / Title (Optional)
                  </label>
                  <input 
                    id="paste-title-input"
                    type="text"
                    className="form-text-input"
                    placeholder="e.g. Pump Datasheet Section 4.2"
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                  />
                </div>

                <div className="form-field-item">
                  <div className="paste-heading-row">
                    <label className="field-label" htmlFor="paste-area">
                      Paste Product Information
                    </label>
                    <button 
                      type="button" 
                      className="btn-insert-sample"
                      onClick={() => {
                        setPasteTitle('Industrial Centrifugal Pump Specs');
                        setPasteText(`Industrial centrifugal pump - Model CR-15\nFlow rate: 120 L/min\nMaximum pressure: 8 bar\nMotor power: 5 HP\nMaterial: Stainless Steel 316\nOperating temperature: -20°C to +120°C\nProtection class: IP55\nVoltage: 415 V, 3-Phase`);
                        setPasteError('');
                      }}
                    >
                      Insert Sample Specs
                    </button>
                  </div>

                  <textarea 
                    id="paste-area"
                    rows={8}
                    className={`form-textarea-input ${pasteError ? 'field-error' : ''}`}
                    placeholder={`Industrial centrifugal pump\nFlow rate: 120 L/min\nMaximum pressure: 8 bar\nMotor power: 5 HP\nMaterial: Stainless Steel`}
                    value={pasteText}
                    onChange={(e) => {
                      setPasteText(e.target.value);
                      if (pasteError) setPasteError('');
                    }}
                  />
                  {pasteError && (
                    <span className="inline-field-error" role="alert">
                      <AlertCircle size={14} />
                      {pasteError}
                    </span>
                  )}
                </div>

                <div className="form-actions-row">
                  <button type="submit" className="btn-dash-primary">
                    <Plus size={16} />
                    <span>Add Pasted Text to Sources</span>
                  </button>
                </div>
              </form>

              {/* Added Text Blocks List */}
              {textSources.length > 0 && (
                <div className="selected-items-section">
                  <h4 className="selected-items-title">Pasted Text Blocks ({textSources.length})</h4>
                  <div className="text-items-list">
                    {textSources.map((item) => (
                      <div key={item.id} className="text-item-card">
                        <div className="text-item-left">
                          <div className="text-icon-box">
                            <FileText size={18} />
                          </div>
                          <div className="text-meta">
                            <span className="text-source-title">{item.title}</span>
                            <span className="text-snippet-preview">{item.content.slice(0, 100)}...</span>
                            <div className="text-sub-meta">
                              <span>{item.charCount} characters</span>
                              <span className="meta-sep">•</span>
                              <span>{item.lineCount} lines</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-item-actions">
                          <button 
                            type="button" 
                            className="btn-item-action"
                            title="Remove text snippet"
                            onClick={() => removeTextSource(item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 5: PRODUCT IMAGES
              ======================================================== */}
          {activeTab === 'images' && (
            <div className="tab-content-panel">
              <div 
                className="image-drop-zone"
                onClick={() => imageInputRef.current && imageInputRef.current.click()}
              >
                <input 
                  type="file"
                  ref={imageInputRef}
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden-file-input"
                  onChange={(e) => handleImagesSelected(e.target.files)}
                />
                <div className="dropzone-icon-halo">
                  <ImageIcon size={36} />
                </div>
                <h3 className="dropzone-title">Upload Product Visual Assets</h3>
                <p className="dropzone-subtitle">Supported: PNG, JPG, JPEG, WEBP</p>
                <button type="button" className="btn-browse-inline">
                  <span>Browse Images</span>
                </button>
              </div>

              {/* Image Previews Grid */}
              {imageSources.length > 0 && (
                <div className="selected-items-section">
                  <div className="selected-items-header">
                    <h4 className="selected-items-title">Selected Images ({imageSources.length})</h4>
                    <button 
                      type="button" 
                      className="btn-add-more"
                      onClick={() => imageInputRef.current && imageInputRef.current.click()}
                    >
                      <Plus size={14} />
                      <span>Add More Images</span>
                    </button>
                  </div>

                  <div className="image-thumbnails-grid">
                    {imageSources.map((item) => (
                      <div key={item.id} className="image-thumb-card">
                        <div className="image-thumb-preview-wrap">
                          <img src={item.previewUrl} alt={item.name} className="image-thumb-img" />
                          <button 
                            type="button" 
                            className="btn-remove-thumb"
                            title="Remove image"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(item.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="image-thumb-info">
                          <span className="image-thumb-name" title={item.name}>{item.name}</span>
                          <span className="image-thumb-size">{formatFileSize(item.size)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================
            GLOBAL SUMMARY: SOURCES ADDED
            ======================================================== */}
        <section className="sources-summary-card">
          <div className="summary-header-row">
            <div>
              <h3 className="summary-title">Sources Added ({totalSourcesCount})</h3>
              <p className="summary-subtitle">Review all staged items before triggering AI processing.</p>
            </div>

            <div className="summary-breakdown-badges">
              {fileSources.length > 0 && (
                <span className="breakdown-badge badge-violet">
                  <UploadCloud size={13} />
                  <span>{fileSources.length} {fileSources.length === 1 ? 'File' : 'Files'}</span>
                </span>
              )}
              {urlSources.length > 0 && (
                <span className="breakdown-badge badge-blue">
                  <Globe size={13} />
                  <span>{urlSources.length} {urlSources.length === 1 ? 'URL' : 'URLs'}</span>
                </span>
              )}
              {manualSources.length > 0 && (
                <span className="breakdown-badge badge-green">
                  <Edit3 size={13} />
                  <span>{manualSources.length} Manual</span>
                </span>
              )}
              {textSources.length > 0 && (
                <span className="breakdown-badge badge-cyan">
                  <FileText size={13} />
                  <span>{textSources.length} Text</span>
                </span>
              )}
              {imageSources.length > 0 && (
                <span className="breakdown-badge badge-amber">
                  <ImageIcon size={13} />
                  <span>{imageSources.length} {imageSources.length === 1 ? 'Image' : 'Images'}</span>
                </span>
              )}
              {totalSourcesCount === 0 && (
                <span className="breakdown-badge badge-empty">0 Sources Staged</span>
              )}
            </div>
          </div>

          {/* Master Sources Compact List */}
          {totalSourcesCount > 0 ? (
            <div className="master-sources-compact-list">
              {fileSources.map((f) => (
                <div key={f.id} className="compact-source-row">
                  <div className="compact-source-left">
                    <span className="compact-type-tag tag-file">FILE</span>
                    <span className="compact-name">{f.name}</span>
                    <span className="compact-meta">({f.extension} • {formatFileSize(f.size)})</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-compact-remove"
                    onClick={() => removeFile(f.id)}
                    title="Remove source"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {urlSources.map((u) => (
                <div key={u.id} className="compact-source-row">
                  <div className="compact-source-left">
                    <span className="compact-type-tag tag-url">URL</span>
                    <span className="compact-name">{u.url}</span>
                    <span className="compact-meta">({u.domain})</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-compact-remove"
                    onClick={() => removeUrl(u.id)}
                    title="Remove source"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {manualSources.map((m) => (
                <div key={m.id} className="compact-source-row">
                  <div className="compact-source-left">
                    <span className="compact-type-tag tag-manual">MANUAL</span>
                    <span className="compact-name">{m.name}</span>
                    <span className="compact-meta">({m.sku || m.manufacturer || 'Direct Entry'})</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-compact-remove"
                    onClick={() => removeManualSource(m.id)}
                    title="Remove source"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {textSources.map((t) => (
                <div key={t.id} className="compact-source-row">
                  <div className="compact-source-left">
                    <span className="compact-type-tag tag-text">TEXT</span>
                    <span className="compact-name">{t.title}</span>
                    <span className="compact-meta">({t.charCount} chars)</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-compact-remove"
                    onClick={() => removeTextSource(t.id)}
                    title="Remove source"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {imageSources.map((img) => (
                <div key={img.id} className="compact-source-row">
                  <div className="compact-source-left">
                    <span className="compact-type-tag tag-img">IMAGE</span>
                    <span className="compact-name">{img.name}</span>
                    <span className="compact-meta">({formatFileSize(img.size)})</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-compact-remove"
                    onClick={() => removeImage(img.id)}
                    title="Remove source"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="summary-empty-notice">
              <Layers size={20} className="summary-empty-icon" />
              <span>No product sources added yet. Select an input method above to begin.</span>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="summary-action-footer">
            <button 
              type="button" 
              className={`btn-start-processing ${totalSourcesCount > 0 ? 'btn-glow' : 'btn-disabled-state'}`}
              onClick={handleStartProcessing}
            >
              <Sparkles size={18} />
              <span>Start AI Processing</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        {/* Enterprise Ingestion & Bulk Processing Status */}
        <section className="sources-summary-card" style={{ marginTop: 24 }}>
          <div className="summary-header-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 16 }}>
            <div>
              <h3 className="summary-title" style={{ color: 'var(--text-primary)' }}>Recent Bulk Ingestions</h3>
              <p className="summary-subtitle">Real-time enterprise metrics for catalog ingestion batches.</p>
            </div>
            
            {/* KPI grid row */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Uploaded', value: 500, color: 'var(--text-primary)' },
                { label: 'Processed', value: 470, color: 'var(--success)' },
                { label: 'Needs Review', value: 24, color: 'var(--warning)' },
                { label: 'Failed', value: 6, color: 'var(--danger)' }
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 6, textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>{stat.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: stat.color, marginTop: 2 }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk Ingestions Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="epage-table" style={{ fontSize: '0.8rem', width: '100%' }}>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Records</th>
                  <th>Processed</th>
                  <th>Needs Review</th>
                  <th>Failed</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bulkIngestions.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.file}</td>
                    <td>{item.records}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{item.processed}</td>
                    <td style={{ color: item.needsReview > 0 ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: item.needsReview > 0 ? 600 : 400 }}>
                      {item.needsReview}
                    </td>
                    <td style={{ color: item.failed > 0 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: item.failed > 0 ? 600 : 400 }}>
                      {item.failed}
                    </td>
                    <td>
                      <span className={`badge ${
                        item.status === 'Completed' ? 'badge-validated' : 
                        item.status === 'Failed' ? 'badge-critical' : 
                        item.status === 'Retrying...' ? 'badge-processing' : 'badge-pending'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.canRetry ? (
                        <button 
                          type="button" 
                          className="btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
                          onClick={() => handleRetryIngestion(item.id)}
                        >
                          Retry
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
};

export default UploadPage;
