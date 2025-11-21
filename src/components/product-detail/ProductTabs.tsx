// src/components/product-detail/ProductTabs.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Package, Heart, Ruler, Truck } from 'lucide-react';

interface ProductTabsProps {
  description?: string;
  material?: string;
  careInstructions?: string;
}

export default function ProductTabs({ description, material, careInstructions }: ProductTabsProps) {
  const t = useTranslations('productDetail');
  const [activeTab, setActiveTab] = useState<'description' | 'materials' | 'sizeGuide' | 'shipping'>('description');

  const tabs = [
    {
      id: 'description' as const,
      label: t('tabs.description') || 'Description',
      icon: Package,
    },
    {
      id: 'materials' as const,
      label: t('tabs.materials') || 'Materials & Care',
      icon: Heart,
    },
    {
      id: 'sizeGuide' as const,
      label: t('tabs.sizeGuide') || 'Size Guide',
      icon: Ruler,
    },
    {
      id: 'shipping' as const,
      label: t('tabs.shipping') || 'Shipping Info',
      icon: Truck,
    },
  ];

  return (
    <div className="product-tabs">
      {/* Tab Headers */}
      <div className="product-tabs__headers">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`product-tabs__header ${
                activeTab === tab.id ? 'product-tabs__header--active' : ''
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-panel-${tab.id}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="product-tabs__content">
        {/* Description Tab */}
        {activeTab === 'description' && (
          <div
            className="product-tabs__panel"
            role="tabpanel"
            id="tab-panel-description"
            aria-labelledby="tab-description"
          >
            {description ? (
              <div className="product-tabs__description">
                <p className="whitespace-pre-line">{description}</p>

                {/* You can add key features here */}
                <div className="product-tabs__features">
                  <h4 className="product-tabs__subtitle">Key Features</h4>
                  <ul className="product-tabs__list">
                    <li>Premium quality materials</li>
                    <li>Modern, comfortable fit</li>
                    <li>Durable construction</li>
                    <li>Easy care and maintenance</li>
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No description available.</p>
            )}
          </div>
        )}

        {/* Materials & Care Tab */}
        {activeTab === 'materials' && (
          <div
            className="product-tabs__panel"
            role="tabpanel"
            id="tab-panel-materials"
            aria-labelledby="tab-materials"
          >
            <div className="product-tabs__materials">
              {material && (
                <div className="product-tabs__section">
                  <h4 className="product-tabs__subtitle">Material Composition</h4>
                  <p>{material}</p>
                </div>
              )}

              {careInstructions && (
                <div className="product-tabs__section">
                  <h4 className="product-tabs__subtitle">Care Instructions</h4>
                  <p className="whitespace-pre-line">{careInstructions}</p>
                </div>
              )}

              {!material && !careInstructions && (
                <p className="text-muted-foreground">No material information available.</p>
              )}

              {/* General care tips */}
              <div className="product-tabs__section">
                <h4 className="product-tabs__subtitle">Care Tips</h4>
                <ul className="product-tabs__list">
                  <li>Machine wash cold with like colors</li>
                  <li>Tumble dry low or hang to dry</li>
                  <li>Do not bleach</li>
                  <li>Iron on low heat if needed</li>
                  <li>Do not dry clean</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Size Guide Tab */}
        {activeTab === 'sizeGuide' && (
          <div
            className="product-tabs__panel"
            role="tabpanel"
            id="tab-panel-sizeGuide"
            aria-labelledby="tab-sizeGuide"
          >
            <div className="product-tabs__size-guide">
              <h4 className="product-tabs__subtitle">Size Chart</h4>

              <div className="product-tabs__table-wrapper">
                <table className="product-tabs__table">
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>Chest (in)</th>
                      <th>Length (in)</th>
                      <th>Sleeve (in)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>S</td>
                      <td>34-36</td>
                      <td>27-28</td>
                      <td>33-34</td>
                    </tr>
                    <tr>
                      <td>M</td>
                      <td>38-40</td>
                      <td>28-29</td>
                      <td>34-35</td>
                    </tr>
                    <tr>
                      <td>L</td>
                      <td>42-44</td>
                      <td>29-30</td>
                      <td>35-36</td>
                    </tr>
                    <tr>
                      <td>XL</td>
                      <td>46-48</td>
                      <td>30-31</td>
                      <td>36-37</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="product-tabs__section">
                <h4 className="product-tabs__subtitle">Fit Information</h4>
                <ul className="product-tabs__list">
                  <li><strong>Fit:</strong> Regular fit</li>
                  <li><strong>Model:</strong> Model is 6&apos;0&quot; and wearing size M</li>
                  <li><strong>Recommendation:</strong> True to size</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === 'shipping' && (
          <div
            className="product-tabs__panel"
            role="tabpanel"
            id="tab-panel-shipping"
            aria-labelledby="tab-shipping"
          >
            <div className="product-tabs__shipping">
              <div className="product-tabs__section">
                <h4 className="product-tabs__subtitle">Delivery Times</h4>
                <ul className="product-tabs__list">
                  <li><strong>Standard Shipping:</strong> 5-7 business days</li>
                  <li><strong>Express Shipping:</strong> 2-3 business days</li>
                  <li><strong>Free Shipping:</strong> Orders over $150</li>
                </ul>
              </div>

              <div className="product-tabs__section">
                <h4 className="product-tabs__subtitle">Returns & Exchanges</h4>
                <p>We offer a 30-day return policy on all items. Items must be unworn, unwashed, and in original condition with tags attached.</p>
                <ul className="product-tabs__list">
                  <li>Free returns on all orders</li>
                  <li>Easy return process</li>
                  <li>Full refund or exchange</li>
                </ul>
              </div>

              <div className="product-tabs__section">
                <h4 className="product-tabs__subtitle">Order Tracking</h4>
                <p>You&apos;ll receive a tracking number via email once your order ships. Track your package in real-time from our warehouse to your door.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
