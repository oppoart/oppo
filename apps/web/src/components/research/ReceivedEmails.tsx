'use client';

import { useState } from 'react';
import { Mail, MailOpen, Paperclip, Clock, Search, CheckSquare, Square, Target, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface ReceivedEmail {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  receivedDate: Date;
  isRead: boolean;
  hasAttachments: boolean;
  category: string;
  status: 'unprocessed' | 'processing' | 'processed' | 'opportunities_found';
  snippet: string;
  opportunityCount?: number;
}

interface ReceivedEmailsProps {
  emails: ReceivedEmail[];
  selectedEmails: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
}

export function ReceivedEmails({
  emails,
  selectedEmails,
  onToggleSelection,
  onSelectAll,
}: ReceivedEmailsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.snippet.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || email.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || email.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusIcon = (status: ReceivedEmail['status']) => {
    switch (status) {
      case 'opportunities_found':
        return <Target className="h-3 w-3 text-green-500" />;
      case 'processed':
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'processing':
        return <RefreshCw className="animate-spin h-3 w-3 text-blue-500" />;
      case 'unprocessed':
        return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = (status: ReceivedEmail['status']) => {
    switch (status) {
      case 'opportunities_found':
        return 'Opportunities Found';
      case 'processed':
        return 'Processed';
      case 'processing':
        return 'Processing...';
      case 'unprocessed':
        return 'Unprocessed';
    }
  };

  const categories = Array.from(new Set(emails.map(email => email.category)));
  const unprocessedCount = emails.filter(e => e.status === 'unprocessed').length;
  const opportunitiesCount = emails.reduce((sum, e) => sum + (e.opportunityCount || 0), 0);

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold mb-2">Received Emails</h3>
        
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 text-xs border rounded px-2 py-1"
          >
            <option value="all">All Status</option>
            <option value="unprocessed">Unprocessed</option>
            <option value="processing">Processing</option>
            <option value="processed">Processed</option>
            <option value="opportunities_found">With Opportunities</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 text-xs border rounded px-2 py-1"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {selectedEmails.length === emails.length ? (
              <CheckSquare className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            Select All
          </button>
          <span className="text-xs text-muted-foreground">
            {filteredEmails.length} emails
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="font-semibold text-blue-800">Total</div>
            <div className="text-blue-600">{emails.length}</div>
          </div>
          <div>
            <div className="font-semibold text-blue-800">Unprocessed</div>
            <div className="text-blue-600">{unprocessedCount}</div>
          </div>
          <div>
            <div className="font-semibold text-blue-800">Opportunities</div>
            <div className="text-blue-600">{opportunitiesCount}</div>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {filteredEmails.map((email) => (
            <div
              key={email.id}
              className={`p-2 rounded-md border transition-colors cursor-pointer ${
                selectedEmails.includes(email.id)
                  ? 'bg-primary/10 border-primary'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => onToggleSelection(email.id)}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedEmails.includes(email.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelection(email.id);
                  }}
                  className="h-3 w-3 mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-1 mb-1">
                    {email.isRead ? (
                      <MailOpen className="h-3 w-3 text-gray-400" />
                    ) : (
                      <Mail className="h-3 w-3 text-primary" />
                    )}
                    {email.hasAttachments && (
                      <Paperclip className="h-3 w-3 text-gray-400" />
                    )}
                    {email.opportunityCount && email.opportunityCount > 0 && (
                      <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-4 text-center">
                        {email.opportunityCount}
                      </span>
                    )}
                  </div>

                  {/* Subject */}
                  <div className={`text-sm mb-1 truncate ${!email.isRead ? 'font-medium' : ''}`}>
                    {email.subject}
                  </div>

                  {/* Sender */}
                  <div className="text-xs text-muted-foreground mb-1 truncate">
                    {email.sender}
                  </div>

                  {/* Snippet */}
                  <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {email.snippet}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                        {email.category}
                      </span>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(email.status)}
                        <span className="text-xs text-muted-foreground">
                          {getStatusText(email.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{email.receivedDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredEmails.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterStatus !== 'all' || filterCategory !== 'all' 
                ? 'No emails match your filters' 
                : 'No emails received yet'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}