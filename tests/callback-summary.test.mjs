import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loader } from './shopping-loader.mjs';

const Controls = loader()('components/shopping/ShoppingControls.tsx').default;
test('saved callback displays all confirmed details without offering a false cancellation', () => {
  const shop = {
    flow: { handoff: 'SCHEDULED', phase: 'PRODUCT_EXPLORATION' },
    callback: { id: 'saved-request', date: '2026-11-20', time: '15:30', timezone: 'Asia/Kolkata', productName: 'Walnut Studio Headphones' },
    explore() {},
  };
  const html = renderToStaticMarkup(React.createElement(Controls, { shop }));
  for (const value of ['2026-11-20', '15:30', 'Asia/Kolkata', 'Walnut Studio Headphones', 'not a confirmed appointment', 'Continue exploring']) assert.ok(html.includes(value));
  assert.ok(!html.includes('Cancel request'));
  shop.callback.productName = null;
  assert.match(renderToStaticMarkup(React.createElement(Controls, { shop })), /General showroom assistance/);
});

test('pending callback renders a confirmation dialog with editable details and cancel', () => {
 const shop={flow:{handoff:'SCHEDULE_REQUESTED',phase:'PRODUCT_EXPLORATION',productId:'headphones'},draft:{date:'2026-11-20',time:'10:30',timezone:'Asia/Kolkata'},editDraft(){},schedule(){},cancel(){}};
 const html=renderToStaticMarkup(React.createElement(Controls,{shop}));
 for(const value of ['<dialog','2026-11-20','10:30','Asia/Kolkata','Headphones','Okay, confirm','Cancel']) assert.ok(html.includes(value),value);
 assert.ok(!html.includes('Demo callback request saved'));
});
