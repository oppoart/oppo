'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Calendar } from '@/components/dashboard/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Task, getStoredTasks } from '@/utils/tasks';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'deadline' | 'meeting' | 'exhibition' | 'submission' | 'task' | 'other';
  description?: string;
  location?: string;
  attendees?: string[];
  time?: string;
  taskId?: string;
  taskStatus?: Task['status'];
  priority?: Task['priority'];
  opportunityUrl?: string;
}

const eventTypes = [
  { value: 'deadline', label: 'Deadline', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'meeting', label: 'Meeting', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'exhibition', label: 'Exhibition', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'submission', label: 'Submission', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'task', label: 'Task', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

const taskStatusColors = {
  planned: 'bg-blue-100 text-blue-800 border-blue-200',
  working: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  applied: 'bg-green-100 text-green-800 border-green-200',
  backlog: 'bg-gray-100 text-gray-800 border-gray-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    type: 'other',
    description: '',
    location: '',
    time: '',
    attendees: []
  });
  const { toast } = useToast();

  // Load events and tasks
  const loadEventsAndTasks = () => {
      // Sample calendar events
      const sampleEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Gallery Submission Deadline',
          date: new Date(2025, 0, 15),
          type: 'deadline',
          description: 'Submit portfolio for spring exhibition',
          time: '11:59 PM'
        },
        {
          id: '2',
          title: 'Artist Meetup',
          date: new Date(2025, 0, 20),
          type: 'meeting',
          description: 'Monthly artist networking event',
          location: 'Downtown Art Center',
          time: '7:00 PM',
          attendees: ['John Doe', 'Jane Smith']
        },
        {
          id: '3',
          title: 'Solo Exhibition Opening',
          date: new Date(2025, 0, 25),
          type: 'exhibition',
          description: 'Opening night for "Urban Landscapes" series',
          location: 'Metropolitan Gallery',
          time: '6:00 PM'
        },
        {
          id: '4',
          title: 'Grant Application Due',
          date: new Date(2025, 1, 1),
          type: 'submission',
          description: 'Creative Arts Foundation grant application',
          time: '5:00 PM'
        }
      ];

      // Load tasks from storage and convert to calendar events
      const tasks = getStoredTasks();
      const taskEvents: CalendarEvent[] = tasks
        .filter(task => {
          // Only show tasks that are planned, working, or applied
          return ['planned', 'working', 'applied'].includes(task.status) && task.deadline;
        })
        .map(task => {
          const deadline = new Date(task.deadline!);
          return {
            id: `task-${task.id}`,
            title: task.title,
            date: deadline,
            type: 'task' as const,
            description: task.description || task.opportunity?.description,
            location: task.opportunity?.location,
            time: '11:59 PM', // Default deadline time
            taskId: task.id,
            taskStatus: task.status,
            priority: task.priority,
            opportunityUrl: task.opportunity?.url
          };
        });

      // Combine sample events with task events
      setEvents([...sampleEvents, ...taskEvents]);
    };

  // Load events and tasks on component mount and when page becomes visible
  useEffect(() => {
    loadEventsAndTasks();

    // Refresh when page becomes visible (user might have updated tasks)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadEventsAndTasks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddDialog(true);
    setNewEvent({
      title: '',
      type: 'other',
      description: '',
      location: '',
      time: '',
      attendees: [],
      date
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: newEvent.date,
      type: newEvent.type as CalendarEvent['type'],
      description: newEvent.description,
      location: newEvent.location,
      time: newEvent.time,
      attendees: newEvent.attendees || []
    };

    setEvents(prev => [...prev, event]);
    setShowAddDialog(false);
    setNewEvent({
      title: '',
      type: 'other',
      description: '',
      location: '',
      time: '',
      attendees: []
    });
    
    toast({
      title: "Success",
      description: "Event added successfully!",
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
    setShowEventDialog(false);
    setSelectedEvent(null);
    
    toast({
      title: "Success",
      description: "Event deleted successfully!",
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    return events
      .filter(event => event.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  };

  const getTodaysEvents = () => {
    const today = new Date();
    return events.filter(event => 
      event.date.toDateString() === today.toDateString()
    );
  };

  const upcomingEvents = getUpcomingEvents();
  const todaysEvents = getTodaysEvents();

  return (
    <DashboardLayout
      currentPage="calendar"
      title="Calendar"
      subtitle="Manage your artistic schedule and deadlines"
      action={
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Today's Events */}
        {todaysEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Today's Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysEvents.map(event => {
                  const eventType = eventTypes.find(et => et.value === event.type);
                  const statusColor = event.taskStatus ? taskStatusColors[event.taskStatus] : eventType?.color;
                  const displayLabel = event.taskStatus ? `${event.taskStatus.charAt(0).toUpperCase()}${event.taskStatus.slice(1)}` : eventType?.label;
                  
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn("w-3 h-3 rounded-full", statusColor?.split(' ')[0])} />
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <div className="flex items-center gap-2">
                            {event.time && (
                              <p className="text-sm text-muted-foreground">{event.time}</p>
                            )}
                            {event.priority && (
                              <Badge variant="outline" className="text-xs">
                                {event.priority} priority
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={statusColor}>
                          {displayLabel}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Calendar */}
        <Calendar
          events={events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onAddEvent={() => setShowAddDialog(true)}
        />

        {/* Upcoming Events Sidebar */}
        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Your next 5 scheduled events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map(event => {
                  const eventType = eventTypes.find(et => et.value === event.type);
                  const statusColor = event.taskStatus ? taskStatusColors[event.taskStatus] : eventType?.color;
                  const displayLabel = event.taskStatus ? `${event.taskStatus.charAt(0).toUpperCase()}${event.taskStatus.slice(1)}` : eventType?.label;
                  
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn("w-3 h-3 rounded-full", statusColor?.split(' ')[0])} />
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              {event.date.toLocaleDateString()}
                              {event.time && ` • ${event.time}`}
                            </span>
                            {event.priority && (
                              <Badge variant="outline" className="text-xs">
                                {event.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={statusColor}>
                        {displayLabel}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Event Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Create a new calendar event for your artistic schedule.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={newEvent.title || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEvent.date ? newEvent.date.toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewEvent(prev => ({ 
                      ...prev, 
                      date: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newEvent.time || ''}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="type">Event Type</Label>
                <Select
                  value={newEvent.type || 'other'}
                  onValueChange={(value) => setNewEvent(prev => ({ ...prev, type: value as CalendarEvent['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.filter(type => type.value !== 'task').map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEvent.location || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEvent}>
                  Add Event
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Event Details Dialog */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.title}</DialogTitle>
              <DialogDescription>
                Event details and information
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.date.toLocaleDateString()}</span>
                  {selectedEvent.time && (
                    <>
                      <Clock className="h-4 w-4 text-muted-foreground ml-4" />
                      <span>{selectedEvent.time}</span>
                    </>
                  )}
                </div>

                {/* Task Status and Priority */}
                {selectedEvent.taskStatus && (
                  <div className="flex items-center gap-2">
                    <Badge className={taskStatusColors[selectedEvent.taskStatus]}>
                      {selectedEvent.taskStatus.charAt(0).toUpperCase()}{selectedEvent.taskStatus.slice(1)}
                    </Badge>
                    {selectedEvent.priority && (
                      <Badge variant="outline">
                        {selectedEvent.priority.charAt(0).toUpperCase()}{selectedEvent.priority.slice(1)} Priority
                      </Badge>
                    )}
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.attendees.join(', ')}</span>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    {selectedEvent.opportunityUrl && (
                      <Button 
                        variant="outline"
                        onClick={() => window.open(selectedEvent.opportunityUrl, '_blank')}
                      >
                        View Opportunity
                      </Button>
                    )}
                    {selectedEvent.taskId && (
                      <Button 
                        variant="outline"
                        onClick={() => window.location.href = '/dashboard/tasks'}
                      >
                        View in Tasks
                      </Button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                      Close
                    </Button>
                    {!selectedEvent.taskId && (
                      <Button 
                        variant="destructive" 
                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                      >
                        Delete Event
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
