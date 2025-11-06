'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Pencil, Trash2, Save, X, ChevronDown } from 'lucide-react';
import { QueryTemplateGroup, QueryTemplate } from '@/types/query-template';
import { queryTemplatesApi } from '@/lib/api';
import { extractPlaceholders } from '@/lib/query-template-utils';

interface QueryTemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function QueryTemplateManager({ open, onOpenChange, onUpdate }: QueryTemplateManagerProps) {
  const [groups, setGroups] = useState<QueryTemplateGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // New template state
  const [newTemplate, setNewTemplate] = useState('');
  const [newTemplateGroupId, setNewTemplateGroupId] = useState('');

  // New group state
  const [newGroupName, setNewGroupName] = useState('');

  // Editing state
  const [editingTemplate, setEditingTemplate] = useState<QueryTemplate | null>(null);
  const [editedTemplateText, setEditedTemplateText] = useState('');

  const [editingGroup, setEditingGroup] = useState<QueryTemplateGroup | null>(null);
  const [editedGroupName, setEditedGroupName] = useState('');

  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await queryTemplatesApi.getGroups();
      setGroups(data);
      if (data.length > 0 && !newTemplateGroupId) {
        setNewTemplateGroupId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  // Template management
  const handleAddTemplate = async () => {
    if (!newTemplate.trim() || !newTemplateGroupId) return;

    try {
      const placeholders = extractPlaceholders(newTemplate);
      await queryTemplatesApi.createTemplate({
        groupId: newTemplateGroupId,
        template: newTemplate,
        placeholders,
      });

      setNewTemplate('');
      await loadGroups();
      onUpdate();
    } catch (err) {
      console.error('Error adding template:', err);
    }
  };

  const handleStartEditTemplate = (template: QueryTemplate) => {
    setEditingTemplate(template);
    setEditedTemplateText(template.template);
  };

  const handleSaveEditTemplate = async () => {
    if (!editingTemplate || !editedTemplateText.trim()) return;

    try {
      const placeholders = extractPlaceholders(editedTemplateText);
      await queryTemplatesApi.updateTemplate(editingTemplate.id, {
        template: editedTemplateText,
        placeholders,
      });

      setEditingTemplate(null);
      setEditedTemplateText('');
      await loadGroups();
      onUpdate();
    } catch (err) {
      console.error('Error updating template:', err);
    }
  };

  const handleCancelEditTemplate = () => {
    setEditingTemplate(null);
    setEditedTemplateText('');
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await queryTemplatesApi.deleteTemplate(templateId);
      await loadGroups();
      onUpdate();
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  // Group management
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await queryTemplatesApi.createGroup({
        name: newGroupName,
        order: groups.length + 1,
      });

      setNewGroupName('');
      await loadGroups();
      onUpdate();
    } catch (err) {
      console.error('Error adding group:', err);
    }
  };

  const handleStartEditGroup = (group: QueryTemplateGroup) => {
    setEditingGroup(group);
    setEditedGroupName(group.name);
  };

  const handleSaveEditGroup = async () => {
    if (!editingGroup || !editedGroupName.trim()) return;

    try {
      await queryTemplatesApi.updateGroup(editingGroup.id, {
        name: editedGroupName,
      });

      setEditingGroup(null);
      setEditedGroupName('');
      await loadGroups();
      onUpdate();
    } catch (err) {
      console.error('Error updating group:', err);
    }
  };

  const handleCancelEditGroup = () => {
    setEditingGroup(null);
    setEditedGroupName('');
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    if (
      !confirm(
        `Are you sure you want to delete "${group.name}"? This will also delete all ${group.templates.length} templates in this group.`
      )
    )
      return;

    try {
      await queryTemplatesApi.deleteGroup(groupId);
      await loadGroups();
      onUpdate();
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Query Templates</DialogTitle>
          <DialogDescription>
            Add, edit, or remove query template groups and templates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new group */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Add New Group</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Group name (e.g., Time-based Queries)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                className="flex-1"
              />
              <Button
                onClick={handleAddGroup}
                disabled={!newGroupName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </div>
          </div>

          <Separator />

          {/* Add new template */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Add New Template</h3>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border rounded-md"
                value={newTemplateGroupId}
                onChange={(e) => setNewTemplateGroupId(e.target.value)}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Template (e.g., Latest [medium] Open Calls [month] [year])"
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTemplate()}
                className="flex-1"
              />
              <Button
                onClick={handleAddTemplate}
                disabled={!newTemplate.trim() || !newTemplateGroupId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              Use [placeholder] syntax for dynamic values. Supported: [medium], [month], [year], [location],
              [opportunity-type], [amount], [theme]
            </p>
          </div>

          <Separator />

          {/* Existing groups and templates */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              Existing Groups ({groups.length})
            </h3>

            <Accordion type="single" collapsible className="w-full">
              {groups.map((group) => (
                <AccordionItem key={group.id} value={group.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      {editingGroup?.id === group.id ? (
                        <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editedGroupName}
                            onChange={(e) => setEditedGroupName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEditGroup();
                            }}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEditGroup();
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="text-left">
                            <div className="font-medium">{group.name}</div>
                            <div className="text-xs text-gray-600">{group.templates.length} templates</div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditGroup(group);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroup(group.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pl-4">
                      {group.templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          {editingTemplate?.id === template.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editedTemplateText}
                                onChange={(e) => setEditedTemplateText(e.target.value)}
                                className="flex-1"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleSaveEditTemplate}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEditTemplate}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <code className="text-xs flex-1">{template.template}</code>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEditTemplate(template)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {group.templates.length === 0 && (
                        <p className="text-xs text-gray-500 italic">No templates yet</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Note:</strong> Changes to templates affect all users. Deleted templates will
              be removed from user selections.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
