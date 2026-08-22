import React from 'react';
import { Package, ArrowUpRight, FolderPlus } from 'lucide-react';

const RecentProducts = ({ products = [], onUploadClick }) => {
  return (
    <div className="dash-panel recent-products-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap">
            <Package size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">Recent Products</h3>
            <p className="dash-panel-subtitle">Catalog items and ingestion history</p>
          </div>
        </div>
        <button 
          type="button" 
          className="dash-link-action-btn"
          onClick={onUploadClick}
        >
          <FolderPlus size={14} />
          <span>Upload File</span>
        </button>
      </div>

      <div className="dash-panel-body p-0">
        <div className="recent-products-table-wrap">
          <table className="recent-products-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Quality Score</th>
                <th>Confidence Score</th>
                <th>Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-td">
                    <div className="table-empty-state">
                      <div className="table-empty-icon-wrap">
                        <Package size={30} />
                      </div>
                      <h4 className="table-empty-heading">No products uploaded yet.</h4>
                      <p className="table-empty-subtext">
                        Add product information from files, documents, images, product links, pasted specifications, or manual entry to populate your catalog.
                      </p>
                      <button 
                        type="button" 
                        className="empty-action-btn"
                        onClick={onUploadClick}
                      >
                        <span>Upload Product Data</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.qualityScore}</td>
                    <td>{item.confidenceScore}</td>
                    <td>{item.status}</td>
                    <td>{item.lastUpdated}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-panel-footer">
        <div className="footer-metric-item">
          <span className="footer-metric-label">Total Catalog Items</span>
          <span className="footer-metric-val">0 Items</span>
        </div>
        <div className="footer-metric-item">
          <span className="footer-metric-label">Active Categories</span>
          <span className="footer-metric-val">0</span>
        </div>
        <div className="footer-metric-item">
          <span className="footer-metric-label">Enriched Ratio</span>
          <span className="footer-metric-val">0%</span>
        </div>
      </div>
    </div>
  );
};

export default RecentProducts;
