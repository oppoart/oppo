'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/test')
      .then(res => res.json())
      .then(data => {
        console.log('API Response:', data);
        setApiStatus('connected');
      })
      .catch(err => {
        console.error('API Error:', err);
        setApiStatus('error');
      });
  }, []);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to <span className="text-blue-600">OPPO</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Autonomous Opportunity Agent for Artists
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Frontend:</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                ✓ Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Backend API:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                apiStatus === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                apiStatus === 'connected' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {apiStatus === 'loading' ? '⏳ Connecting...' :
                 apiStatus === 'connected' ? '✓ Connected' :
                 '✗ Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">🤖 AI-Powered</h3>
            <p className="text-gray-600">
              Intelligent opportunity matching and automated applications
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">🔒 Privacy-First</h3>
            <p className="text-gray-600">
              On-device processing and local data storage
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">⚡ Automated</h3>
            <p className="text-gray-600">
              Event-driven workflow automation system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}