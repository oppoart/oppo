'use client';

import { useState } from 'react';
import { Plus, Trash2, Mail, Clock, CheckCircle, XCircle, AlertTriangle, Search, CheckSquare, Square, MailOpen } from 'lucide-react';

interface Newsletter {
  id: string;
  name: string;
  email: string;
  provider: string;
  category: string;
  frequency: string;
  subscribeDate: Date;
  lastReceived: Date | null;
  status: 'active' | 'inactive' | 'checking' | 'unsubscribed';
  unreadCount: number;
}

interface NewsletterSubscriptionsProps {
  newsletters: Newsletter[];
  selectedNewsletters: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onAddNewsletter: (newsletter: Omit<Newsletter, 'id' | 'subscribeDate' | 'lastReceived' | 'status' | 'unreadCount'>) => void;
  onRemoveNewsletter: (id: string) => void;
}

export function NewsletterSubscriptions({
  newsletters,
  selectedNewsletters,
  onToggleSelection,
  onSelectAll,
  onAddNewsletter,
  onRemoveNewsletter,
}: NewsletterSubscriptionsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNewsletter, setNewNewsletter] = useState({
    name: '',
    email: '',
    provider: '',
    category: '',
    frequency: 'Weekly'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNewsletters = newsletters.filter(newsletter =>
    newsletter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    newsletter.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    newsletter.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNewsletter = () => {
    if (newNewsletter.name && newNewsletter.email && newNewsletter.provider) {
      onAddNewsletter(newNewsletter);
      setNewNewsletter({
        name: '',
        email: '',
        provider: '',
        category: '',
        frequency: 'Weekly'
      });
      setShowAddForm(false);
    }
  };

  const getStatusIcon = (status: Newsletter['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-3 w-3 text-gray-400" />;
      case 'checking':
        return <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full" />;
      case 'unsubscribed':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
    }
  };

  const categories = Array.from(new Set(newsletters.map(newsletter => newsletter.category)));
  const frequencies = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annual'];

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold mb-2">Newsletter Subscriptions</h3>
        
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search newsletters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {selectedNewsletters.length === newsletters.length ? (
              <CheckSquare className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            Select All
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" />
            Add Newsletter
          </button>
        </div>
      </div>

      {/* Add New Newsletter Form */}
      {showAddForm && (
        <div className="mb-3 p-2 bg-gray-50 rounded-md border">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Newsletter name"
              value={newNewsletter.name}
              onChange={(e) => setNewNewsletter({ ...newNewsletter, name: e.target.value })}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="email"
              placeholder="newsletter@example.com"
              value={newNewsletter.email}
              onChange={(e) => setNewNewsletter({ ...newNewsletter, email: e.target.value })}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Provider name"
              value={newNewsletter.provider}
              onChange={(e) => setNewNewsletter({ ...newNewsletter, provider: e.target.value })}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <select
                value={newNewsletter.category}
                onChange={(e) => setNewNewsletter({ ...newNewsletter, category: e.target.value })}
                className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Other">Other</option>
              </select>
              <select
                value={newNewsletter.frequency}
                onChange={(e) => setNewNewsletter({ ...newNewsletter, frequency: e.target.value })}
                className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {frequencies.map(freq => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddNewsletter}
                className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewNewsletter({
                    name: '',
                    email: '',
                    provider: '',
                    category: '',
                    frequency: 'Weekly'
                  });
                }}
                className="flex-1 px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-700">Total: {newsletters.length}</span>
          <span className="text-blue-700">Selected: {selectedNewsletters.length}</span>
          <span className="text-blue-700">Unread: {newsletters.reduce((sum, n) => sum + n.unreadCount, 0)}</span>
        </div>
      </div>

      {/* Newsletter List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {filteredNewsletters.map((newsletter) => (
            <div
              key={newsletter.id}
              className={`p-2 rounded-md border transition-colors cursor-pointer ${
                selectedNewsletters.includes(newsletter.id)
                  ? 'bg-primary/10 border-primary'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => onToggleSelection(newsletter.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={selectedNewsletters.includes(newsletter.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelection(newsletter.id);
                      }}
                      className="h-3 w-3"
                    />
                    {getStatusIcon(newsletter.status)}
                    <span className="text-sm font-medium truncate">{newsletter.name}</span>
                    {newsletter.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-4 text-center">
                        {newsletter.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{newsletter.provider}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{newsletter.category}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{newsletter.frequency}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {newsletter.lastReceived 
                        ? `Last: ${new Date(newsletter.lastReceived).toLocaleDateString()}`
                        : 'Never received'
                      }
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveNewsletter(newsletter.id);
                  }}
                  className="ml-2 p-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredNewsletters.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MailOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'No newsletters match your search' : 'No newsletters added yet'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Add your first newsletter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}