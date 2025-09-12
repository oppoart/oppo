'use client';

import { useState } from 'react';
import { ReceivedEmails } from '@/components/research/ReceivedEmails';
import { EmailAnalyzer } from '@/components/research/EmailAnalyzer';
import { ServiceLayout } from '@/components/research/ServiceLayout';
import { useResearchServices } from '@/hooks/useResearchServices';

export default function NewsletterPage() {
  const [receivedEmails, setReceivedEmails] = useState<Array<{
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
  }>>([
    {
      id: '1',
      subject: 'Artforum: New Opportunities for Emerging Artists - March 2024',
      sender: 'Artforum',
      senderEmail: 'newsletter@artforum.com',
      receivedDate: new Date('2024-03-10'),
      isRead: true,
      hasAttachments: false,
      category: 'Art News',
      status: 'opportunities_found',
      snippet: 'Discover new grants, residencies, and exhibition opportunities for contemporary artists...',
      opportunityCount: 3
    },
    {
      id: '2',
      subject: 'Contemporary Art Review - Open Call for Contributors',
      sender: 'Contemporary Art Review',
      senderEmail: 'updates@contemporaryartreview.la',
      receivedDate: new Date('2024-03-09'),
      isRead: true,
      hasAttachments: true,
      category: 'Art Magazine',
      status: 'opportunities_found',
      snippet: 'We are seeking writers and critics for our upcoming issues. Deadline: April 15...',
      opportunityCount: 2
    },
    {
      id: '3',
      subject: 'Weekly Art News - Exhibitions & Deadlines',
      sender: 'Hyperallergic',
      senderEmail: 'weekly@hyperallergic.com',
      receivedDate: new Date('2024-03-11'),
      isRead: false,
      hasAttachments: false,
      category: 'Art Criticism',
      status: 'unprocessed',
      snippet: 'This week in art: gallery openings, grant deadlines, and artist opportunities...'
    },
    {
      id: '4',
      subject: 'Art Basel 2024 - Application Now Open',
      sender: 'Art Basel',
      senderEmail: 'insider@artbasel.com',
      receivedDate: new Date('2024-03-08'),
      isRead: true,
      hasAttachments: true,
      category: 'Art Fair',
      status: 'opportunities_found',
      snippet: 'Applications for Art Basel 2024 are now open. Early bird deadline: May 1st...',
      opportunityCount: 1
    },
    {
      id: '5',
      subject: 'Frieze Week - Gallery Partnerships Available',
      sender: 'Frieze',
      senderEmail: 'newsletter@frieze.com',
      receivedDate: new Date('2024-03-07'),
      isRead: false,
      hasAttachments: false,
      category: 'Art Fair',
      status: 'unprocessed',
      snippet: 'Partner with leading galleries for Frieze Week events and exhibitions...'
    },
    {
      id: '6',
      subject: 'Gagosian Gallery - Upcoming Artist Talks & Events',
      sender: 'Gagosian Gallery',
      senderEmail: 'quarterly@gagosian.com',
      receivedDate: new Date('2024-03-05'),
      isRead: true,
      hasAttachments: false,
      category: 'Gallery',
      status: 'processed',
      snippet: 'Join us for exclusive artist talks and gallery events this month...'
    },
    {
      id: '7',
      subject: 'Creative Applications - Technology Arts Grants Available',
      sender: 'Creative Applications',
      senderEmail: 'newsletter@creativeapplications.net',
      receivedDate: new Date('2024-03-06'),
      isRead: false,
      hasAttachments: true,
      category: 'Digital Art',
      status: 'unprocessed',
      snippet: 'New funding opportunities for artists working with technology and digital media...'
    },
    {
      id: '8',
      subject: 'MoMA - Open Call for Digital Art Exhibition',
      sender: 'Museum of Modern Art',
      senderEmail: 'digital@moma.org',
      receivedDate: new Date('2024-03-12'),
      isRead: false,
      hasAttachments: true,
      category: 'Museum',
      status: 'unprocessed',
      snippet: 'Submit your digital artworks for our upcoming exhibition. Deadline: April 30...'
    }
  ]);

  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  const serviceIds = ['email-analyzer'];
  const serviceNames = {
    'email-analyzer': 'Email Analyzer'
  };

  const {
    profiles,
    selectedProfile,
    loading,
    services,
    refreshing,
    exporting,
    pollingIntervalRef,
    handleProfileChange,
    handleServiceStart,
    handleServiceStop,
    handleRefreshAll,
    handleExportResults,
  } = useResearchServices({ serviceIds, serviceNames });

  const handleToggleSelection = (id: string) => {
    if (selectedEmails.includes(id)) {
      setSelectedEmails(selectedEmails.filter(emailId => emailId !== id));
    } else {
      setSelectedEmails([...selectedEmails, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmails.length === receivedEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(receivedEmails.map(email => email.id));
    }
  };

  const handleUpdateEmailStatus = (id: string, status: any, opportunityCount?: number) => {
    setReceivedEmails(receivedEmails.map(email => 
      email.id === id ? { 
        ...email, 
        status,
        opportunityCount: opportunityCount || email.opportunityCount
      } : email
    ));
  };

  if (loading) {
    return (
      <ServiceLayout
        currentPage="research-newsletter"
        title="Email Analysis"
        profiles={profiles}
        selectedProfile={selectedProfile}
        onProfileChange={handleProfileChange}
        services={services}
        refreshing={refreshing}
        exporting={exporting}
        pollingIntervalRef={pollingIntervalRef}
        onRefresh={handleRefreshAll}
        onExport={() => handleExportResults('json')}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading newsletter dashboard...</p>
          </div>
        </div>
      </ServiceLayout>
    );
  }

  return (
    <ServiceLayout
      currentPage="research-newsletter"
      title="Newsletter"
      profiles={profiles}
      selectedProfile={selectedProfile}
      onProfileChange={handleProfileChange}
      services={services}
      refreshing={refreshing}
      exporting={exporting}
      pollingIntervalRef={pollingIntervalRef}
      onRefresh={handleRefreshAll}
      onExport={() => handleExportResults('json')}
    >
      <div className="absolute inset-0 -mx-4 sm:-mx-6 lg:-mx-8 -my-8 flex">
        {/* Left side - Received Emails */}
        <div className="w-1/4 border-r-2 border-border flex flex-col">
          <ReceivedEmails
            emails={receivedEmails}
            selectedEmails={selectedEmails}
            onToggleSelection={handleToggleSelection}
            onSelectAll={handleSelectAll}
          />
        </div>

        {/* Right side - Email Analyzer */}
        <EmailAnalyzer 
          emails={receivedEmails}
          selectedEmails={selectedEmails}
          onUpdateEmailStatus={handleUpdateEmailStatus}
        />
      </div>
    </ServiceLayout>
  );
}
