// src/components/product-detail/SizeGuideModal.tsx
'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  const t = useTranslations('productDetail');

  if (!isOpen) return null;

  return (
    <div
      className="size-guide-modal"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      <div
        className="size-guide-modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="size-guide-modal__header">
          <h2 id="size-guide-title" className="size-guide-modal__title">
            {t('sizeGuide') || 'Size Guide'}
          </h2>
          <button
            onClick={onClose}
            className="size-guide-modal__close"
            aria-label="Close size guide"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="size-guide-modal__body">
          {/* Size Chart */}
          <div className="size-guide-modal__section">
            <h3 className="size-guide-modal__subtitle">Size Chart</h3>
            <div className="size-guide-modal__table-wrapper">
              <table className="size-guide-modal__table">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Chest (in)</th>
                    <th>Waist (in)</th>
                    <th>Hips (in)</th>
                    <th>Length (in)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>XS</strong></td>
                    <td>31-33</td>
                    <td>24-26</td>
                    <td>34-36</td>
                    <td>26-27</td>
                  </tr>
                  <tr>
                    <td><strong>S</strong></td>
                    <td>34-36</td>
                    <td>27-29</td>
                    <td>37-39</td>
                    <td>27-28</td>
                  </tr>
                  <tr>
                    <td><strong>M</strong></td>
                    <td>37-39</td>
                    <td>30-32</td>
                    <td>40-42</td>
                    <td>28-29</td>
                  </tr>
                  <tr>
                    <td><strong>L</strong></td>
                    <td>40-43</td>
                    <td>33-36</td>
                    <td>43-46</td>
                    <td>29-30</td>
                  </tr>
                  <tr>
                    <td><strong>XL</strong></td>
                    <td>44-47</td>
                    <td>37-40</td>
                    <td>47-50</td>
                    <td>30-31</td>
                  </tr>
                  <tr>
                    <td><strong>XXL</strong></td>
                    <td>48-51</td>
                    <td>41-44</td>
                    <td>51-54</td>
                    <td>31-32</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* How to Measure */}
          <div className="size-guide-modal__section">
            <h3 className="size-guide-modal__subtitle">How to Measure</h3>
            <div className="size-guide-modal__measurements">
              <div className="size-guide-modal__measurement">
                <strong>Chest:</strong>
                <p>Measure around the fullest part of your chest, keeping the tape horizontal.</p>
              </div>
              <div className="size-guide-modal__measurement">
                <strong>Waist:</strong>
                <p>Measure around your natural waistline, keeping the tape comfortably loose.</p>
              </div>
              <div className="size-guide-modal__measurement">
                <strong>Hips:</strong>
                <p>Measure around the fullest part of your hips, keeping the tape horizontal.</p>
              </div>
              <div className="size-guide-modal__measurement">
                <strong>Length:</strong>
                <p>Measure from the highest point of the shoulder down to the desired hemline.</p>
              </div>
            </div>
          </div>

          {/* Fit Information */}
          <div className="size-guide-modal__section">
            <h3 className="size-guide-modal__subtitle">Fit Information</h3>
            <ul className="size-guide-modal__fit-info">
              <li><strong>Fit:</strong> Regular fit - not too tight, not too loose</li>
              <li><strong>Model:</strong> Model is 6'0" (183cm) and wearing size M</li>
              <li><strong>Recommendation:</strong> This item runs true to size</li>
              <li><strong>Fabric:</strong> Slight stretch for comfort</li>
            </ul>
          </div>

          {/* Tips */}
          <div className="size-guide-modal__section size-guide-modal__tips">
            <h3 className="size-guide-modal__subtitle">Size Tips</h3>
            <ul>
              <li>Between sizes? We recommend sizing up for a more relaxed fit.</li>
              <li>Check the product description for specific fit notes.</li>
              <li>All measurements are approximate and may vary slightly.</li>
              <li>Contact us if you need help finding your size!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
