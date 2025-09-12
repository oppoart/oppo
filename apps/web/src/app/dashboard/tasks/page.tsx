'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ExternalLink, Calendar, MapPin, Star, Trash2, Edit, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Opportunity } from '@/types/analyst';
import { Task, getStoredTasks } from '@/utils/tasks';


const TASK_STATUSES = [
  { id: 'backlog', title: 'Backlog', description: 'Opportunities to consider', color: 'bg-gray-50 border-gray-200' },
  { id: 'planned', title: 'Planned', description: 'Ready to work on', color: 'bg-blue-50 border-blue-200' },
  { id: 'working', title: 'Working', description: 'Currently preparing', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'applied', title: 'Applied', description: 'Applications submitted', color: 'bg-green-50 border-green-200' },
  { id: 'failed', title: 'Failed', description: 'Rejected or missed', color: 'bg-red-50 border-red-200' },
] as const;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const { toast } = useToast();

  // Form state for creating/editing tasks
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    deadline: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const storedTasks = getStoredTasks();
      setTasks(storedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTasks = (newTasks: Task[]) => {
    localStorage.setItem('oppo_tasks', JSON.stringify(newTasks));
    setTasks(newTasks);
  };

  const createTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      notes: formData.notes,
      deadline: formData.deadline,
      priority: formData.priority,
      status: 'backlog',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newTasks = [...tasks, newTask];
    saveTasks(newTasks);
    setShowCreateDialog(false);
    resetForm();
    
    toast({
      title: 'Success',
      description: 'Task created successfully',
    });
  };

  const updateTask = () => {
    if (!selectedTask) return;

    const updatedTasks = tasks.map(task =>
      task.id === selectedTask.id
        ? {
            ...task,
            title: formData.title,
            description: formData.description,
            notes: formData.notes,
            deadline: formData.deadline,
            priority: formData.priority,
            updatedAt: new Date().toISOString(),
          }
        : task
    );

    saveTasks(updatedTasks);
    setShowEditDialog(false);
    setSelectedTask(null);
    resetForm();

    toast({
      title: 'Success',
      description: 'Task updated successfully',
    });
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveTasks(updatedTasks);
    
    toast({
      title: 'Success',
      description: 'Task deleted successfully',
    });
  };

  const moveTask = (taskId: string, newStatus: Task['status']) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
        : task
    );

    saveTasks(updatedTasks);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      notes: '',
      deadline: '',
      priority: 'medium',
    });
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      notes: task.notes || '',
      deadline: task.deadline || '',
      priority: task.priority,
    });
    setShowEditDialog(true);
  };

  // Drag and drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    if (draggedTask) {
      moveTask(draggedTask.id, status);
      setDraggedTask(null);
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="Tasks">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const actionButtons = (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your backlog.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Task title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={2}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createTask} disabled={!formData.title.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <DashboardLayout
      currentPage="tasks"
      title="Task Management"
      action={actionButtons}
    >
      <div className="space-y-6">
        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {TASK_STATUSES.map((status) => {
            const statusTasks = tasks.filter(task => task.status === status.id);
            
            return (
              <div
                key={status.id}
                className={`${status.color} rounded-lg p-4 min-h-[600px]`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status.id as Task['status'])}
              >
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{status.title}</h3>
                  <p className="text-sm text-muted-foreground">{status.description}</p>
                  <Badge variant="secondary" className="mt-2">
                    {statusTasks.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {statusTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-move hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={() => handleDragStart(task)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium">
                            {task.title}
                          </CardTitle>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(task)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {task.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mb-2">
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>

                        {task.deadline && (
                          <div className="flex items-center text-xs text-muted-foreground mb-2">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(task.deadline)}
                          </div>
                        )}

                        {task.opportunity && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium truncate">{task.opportunity.title}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground truncate">
                                {task.opportunity.source}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.open(task.opportunity?.url, '_blank')}
                                title="Open opportunity"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            {task.opportunity.relevanceScore && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(task.opportunity.relevanceScore * 100)}% match
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Task title"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-priority">Priority</Label>
                  <select
                    id="edit-priority"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={updateTask} disabled={!formData.title.trim()}>
                  Update Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}