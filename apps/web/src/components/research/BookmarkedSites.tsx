'use client';

import { useState } from 'react';
import { Plus, Trash2, Link, Clock, CheckCircle, XCircle, AlertCircle, Search, CheckSquare, Square } from 'lucide-react';

interface BookmarkedSite {
  id: string;
  name: string;
  url: string;
  category: string;
  addedDate: Date;
  lastChecked: Date | null;
  status: 'active' | 'inactive' | 'checking';
}

interface BookmarkedSitesProps {
  bookmarkedSites: BookmarkedSite[];
  selectedSites: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onAddBookmark: (site: Omit<BookmarkedSite, 'id' | 'addedDate' | 'lastChecked' | 'status'>) => void;
  onRemoveBookmark: (id: string) => void;
}

export function BookmarkedSites({
  bookmarkedSites,
  selectedSites,
  onToggleSelection,
  onSelectAll,
  onAddBookmark,
  onRemoveBookmark,
}: BookmarkedSitesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', url: '', category: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSites = bookmarkedSites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSite = () => {
    if (newSite.name && newSite.url) {
      onAddBookmark(newSite);
      setNewSite({ name: '', url: '', category: '' });
      setShowAddForm(false);
    }
  };

  const getStatusIcon = (status: BookmarkedSite['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-3 w-3 text-gray-400" />;
      case 'checking':
        return <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full" />;
    }
  };

  const categories = Array.from(new Set(bookmarkedSites.map(site => site.category)));

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold mb-2">Bookmarked Sites</h3>
        
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bookmarks..."
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
            {selectedSites.length === bookmarkedSites.length ? (
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
            Add Site
          </button>
        </div>
      </div>

      {/* Add New Site Form */}
      {showAddForm && (
        <div className="mb-3 p-2 bg-gray-50 rounded-md border">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Site name"
              value={newSite.name}
              onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={newSite.url}
              onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={newSite.category}
              onChange={(e) => setNewSite({ ...newSite, category: e.target.value })}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="Other">Other</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAddSite}
                className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewSite({ name: '', url: '', category: '' });
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
          <span className="text-blue-700">Total Sites: {bookmarkedSites.length}</span>
          <span className="text-blue-700">Selected: {selectedSites.length}</span>
          <span className="text-blue-700">Active: {bookmarkedSites.filter(s => s.status === 'active').length}</span>
        </div>
      </div>

      {/* Sites List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              className={`p-2 rounded-md border transition-colors cursor-pointer ${
                selectedSites.includes(site.id)
                  ? 'bg-primary/10 border-primary'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => onToggleSelection(site.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(site.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelection(site.id);
                      }}
                      className="h-3 w-3"
                    />
                    {getStatusIcon(site.status)}
                    <span className="text-sm font-medium truncate">{site.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link className="h-3 w-3" />
                    <span className="truncate">{site.url}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{site.category}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {site.lastChecked 
                        ? new Date(site.lastChecked).toLocaleDateString()
                        : 'Never checked'
                      }
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBookmark(site.id);
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
      {filteredSites.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'No bookmarks match your search' : 'No bookmarks added yet'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Add your first bookmark
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}