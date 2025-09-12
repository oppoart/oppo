import { Opportunity } from '@/types/analyst';

export interface Task {
  id: string;
  opportunityId?: string;
  title: string;
  description?: string;
  status: 'backlog' | 'planned' | 'working' | 'applied' | 'failed';
  opportunity?: Opportunity;
  notes?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export const getStoredTasks = (): Task[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('oppo_tasks');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const storeTask = (task: Task): void => {
  if (typeof window === 'undefined') return;
  
  const tasks = getStoredTasks();
  const updatedTasks = [...tasks, task];
  localStorage.setItem('oppo_tasks', JSON.stringify(updatedTasks));
};

export const updateStoredTask = (taskId: string, updates: Partial<Task>): void => {
  if (typeof window === 'undefined') return;
  
  const tasks = getStoredTasks();
  const updatedTasks = tasks.map(task =>
    task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
  );
  localStorage.setItem('oppo_tasks', JSON.stringify(updatedTasks));
};

export const removeStoredTask = (taskId: string): void => {
  if (typeof window === 'undefined') return;
  
  const tasks = getStoredTasks();
  const updatedTasks = tasks.filter(task => task.id !== taskId);
  localStorage.setItem('oppo_tasks', JSON.stringify(updatedTasks));
};

export const addOpportunityToTasks = (opportunity: Opportunity): boolean => {
  if (typeof window === 'undefined') return false;
  
  const tasks = getStoredTasks();
  
  // Check if opportunity already exists as a task
  const existingTask = tasks.find(task => task.opportunityId === opportunity.id);
  if (existingTask) {
    return false; // Already exists
  }

  const newTask: Task = {
    id: `opp-${opportunity.id}-${Date.now()}`,
    opportunityId: opportunity.id,
    title: `Apply to ${opportunity.title}`,
    description: opportunity.description,
    notes: '',
    deadline: opportunity.deadline,
    priority: opportunity.relevanceScore && opportunity.relevanceScore > 0.8 ? 'high' : 'medium',
    status: 'backlog',
    opportunity: opportunity,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  storeTask(newTask);
  return true; // Successfully added
};

export const isOpportunityInTasks = (opportunityId: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  const tasks = getStoredTasks();
  return tasks.some(task => task.opportunityId === opportunityId);
};

export const getTaskByOpportunityId = (opportunityId: string): Task | null => {
  if (typeof window === 'undefined') return null;
  
  const tasks = getStoredTasks();
  return tasks.find(task => task.opportunityId === opportunityId) || null;
};