# Shared UI Component Library

A comprehensive collection of reusable UI components built on top of the existing shadcn/ui foundation, designed specifically for the OPPO project's needs.

## Overview

This library extracts common patterns from across the OPPO codebase and provides consistent, well-documented, and accessible components that maintain design system standards.

## Components

### Forms

#### FormCard
A wrapper component for forms with consistent styling, validation states, and save functionality.

```tsx
import { FormCard } from '@/components/ui/shared';

<FormCard
  title="User Settings"
  description="Update your account preferences"
  icon={<Settings className="h-5 w-5" />}
  onSave={handleSave}
  loading={isLoading}
  validationState="valid"
>
  {/* Form content */}
</FormCard>
```

**Features:**
- Validation states (idle, valid, invalid)
- Loading states with spinner
- Error and success message display
- Custom actions support
- Accessibility built-in

#### FormField
Enhanced form field component with validation, help text, and consistent styling.

```tsx
import { FormField } from '@/components/ui/shared';

<FormField
  label="Email Address"
  description="We'll use this for important notifications"
  icon={<Mail className="h-4 w-4" />}
  required
  validationState="valid"
  successMessage="Email verified"
  htmlFor="email"
>
  <Input id="email" type="email" />
</FormField>
```

**Features:**
- Validation states with icons and messages
- Character count support
- Horizontal and vertical layouts
- Help text and descriptions
- Required field indicators

### Data Display

#### StatCard
Displays key statistics with optional trend indicators.

```tsx
import { StatCard } from '@/components/ui/shared';

<StatCard
  value={1234}
  label="Total Opportunities"
  icon={<Target className="h-4 w-4" />}
  change={12.5}
  changePeriod="vs last month"
  color="green"
  showTrend
/>
```

**Features:**
- Multiple value types (number, currency, percentage, time)
- Trend indicators with colors
- Color themes
- Multiple sizes
- Click handlers

#### OpportunityCard
Specialized card for displaying opportunity information with expandable details.

```tsx
import { OpportunityCard } from '@/components/ui/shared';

<OpportunityCard
  opportunity={opportunityData}
  expanded={expandedId === opportunity.id}
  onToggleExpand={() => setExpandedId(expandedId === opportunity.id ? null : opportunity.id)}
  showRelevanceScore
  showMatchingCriteria
/>
```

**Features:**
- Expandable details
- Relevance score display
- Deadline highlighting
- Matching criteria badges
- Selection support
- Custom type colors and labels

#### ServiceStatusCard
Displays service status with controls and results for research processes.

```tsx
import { ServiceStatusCard } from '@/components/ui/shared';

<ServiceStatusCard
  id="web-search"
  title="Web Search"
  description="Search for opportunities online"
  icon={<Globe className="h-5 w-5" />}
  status="running"
  progress={65}
  color="blue"
  onStart={handleStart}
  onStop={handleStop}
  results={searchResults}
/>
```

**Features:**
- Multiple status states (idle, running, completed, error, stopped)
- Progress indicators
- Result display with custom renderers
- Retry functionality
- Color themes
- Mobile-responsive

#### MetricsGrid
Responsive grid layout for displaying multiple metrics.

```tsx
import { MetricsGrid, useMetrics } from '@/components/ui/shared';

const { createCountMetric, createPercentageMetric } = useMetrics();

const metrics = [
  createCountMetric('total-opportunities', 1234, 'Total Opportunities', {
    icon: <Target className="h-4 w-4" />,
    color: 'green'
  }),
  createPercentageMetric('avg-relevance', 85, 'Avg Relevance Score', {
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'blue'
  })
];

<MetricsGrid
  metrics={metrics}
  columns={4}
  responsive={{ sm: 1, md: 2, lg: 4 }}
  showTrends
/>
```

**Features:**
- Responsive grid layouts
- Helper hooks for creating metrics
- Loading and error states
- Empty state handling
- Customizable card sizes

### Feedback

#### ProgressIndicator
Versatile progress display component with multiple types.

```tsx
import { ProgressIndicator } from '@/components/ui/shared';

// Linear progress
<ProgressIndicator
  type="linear"
  value={75}
  label="Processing data"
  showPercentage
  color="blue"
/>

// Step-based progress
<ProgressIndicator
  type="steps"
  steps={processSteps}
  currentStep={2}
  color="green"
/>

// Circular progress
<ProgressIndicator
  type="circular"
  value={60}
  showPercentage
/>
```

**Features:**
- Multiple types (linear, circular, steps, indeterminate)
- Step-based progress with individual status
- Color themes
- Size variants
- Error and completion states

#### EmptyState
Consistent empty state displays with optional actions.

```tsx
import { EmptyState } from '@/components/ui/shared';

<EmptyState
  icon={<Search className="h-12 w-12" />}
  title="No opportunities found"
  description="Try adjusting your search criteria or check back later"
  action={{
    label: "Refresh Search",
    onClick: handleRefresh
  }}
  size="lg"
/>
```

**Features:**
- Multiple illustrations
- Primary and secondary actions
- Size variants
- Color themes
- Card wrapper option

### Layout

#### PageHeader
Consistent page header with navigation and actions.

```tsx
import { PageHeader } from '@/components/ui/shared';

<PageHeader
  title="Dashboard"
  description="Monitor your opportunities and research progress"
  icon={<BarChart3 className="h-6 w-6" />}
  badge={{ label: "Beta", variant: "secondary" }}
  breadcrumbs={[
    { label: "Home", href: "/" },
    { label: "Dashboard" }
  ]}
  primaryAction={{
    label: "New Analysis",
    onClick: handleNewAnalysis,
    icon: <Plus className="h-4 w-4" />
  }}
  tabs={navigationTabs}
/>
```

**Features:**
- Breadcrumb navigation
- Primary and secondary actions
- Tab navigation
- Badge support
- Back button
- More actions menu
- Responsive design

## Design Principles

### Consistency
All components follow the same design patterns, color schemes, and spacing conventions established by the shadcn/ui library.

### Accessibility
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliance
- Focus management

### Responsive Design
- Mobile-first approach
- Flexible layouts
- Touch-friendly interactions
- Appropriate sizing across devices

### TypeScript Support
- Full TypeScript definitions
- Exported interfaces for all props
- Generic type support where applicable
- Strict type checking

### Customization
- Consistent prop APIs
- Color theme support
- Size variants
- Custom render functions
- CSS class overrides

## Usage Guidelines

### Import Pattern
```tsx
// Individual imports (recommended)
import { FormCard, FormField } from '@/components/ui/shared/forms';

// Category imports
import { StatCard, MetricsGrid } from '@/components/ui/shared/data-display';

// All shared components
import { FormCard, StatCard, EmptyState } from '@/components/ui/shared';
```

### Color Themes
Most components support these color themes:
- `default` - Uses theme colors
- `blue` - Blue accent
- `green` - Green accent (success)
- `red` - Red accent (error/destructive)
- `yellow` - Yellow accent (warning)
- `purple` - Purple accent
- `indigo` - Indigo accent

### Size Variants
Components typically support these sizes:
- `sm` - Small variant
- `md` - Medium variant (default)
- `lg` - Large variant

### Validation States
Form components support these validation states:
- `idle` - No validation state
- `valid` - Validation passed
- `invalid` - Validation failed
- `warning` - Warning state

## Migration Guide

### From SettingsCard to FormCard
```tsx
// Before
<SettingsCard
  title="API Settings"
  description="Configure your API keys"
  onSave={handleSave}
  loading={loading}
>
  {/* content */}
</SettingsCard>

// After
<FormCard
  title="API Settings"
  description="Configure your API keys"
  onSave={handleSave}
  loading={loading}
  validationState="valid"
>
  {/* content */}
</FormCard>
```

### From Custom Stat Cards to StatCard
```tsx
// Before
<Card>
  <CardContent className="pt-6">
    <div className="flex items-center space-x-2">
      <BarChart3 className="h-4 w-4 text-muted-foreground" />
      <div className="text-2xl font-bold">{total}</div>
    </div>
    <p className="text-xs text-muted-foreground">Total Analyses</p>
  </CardContent>
</Card>

// After
<StatCard
  value={total}
  label="Total Analyses"
  icon={<BarChart3 className="h-4 w-4" />}
  color="blue"
/>
```

### From Custom Empty States to EmptyState
```tsx
// Before
<div className="text-center py-12">
  <div className="text-gray-500">
    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
    <h3 className="text-lg font-medium mb-2">No Data Available</h3>
    <p className="text-sm">Run an analysis to see data here.</p>
  </div>
</div>

// After
<EmptyState
  icon={<BarChart3 className="h-16 w-16" />}
  title="No Data Available"
  description="Run an analysis to see data here."
  illustration="data"
  size="lg"
/>
```

## Best Practices

1. **Use semantic HTML** - Components include proper semantic elements
2. **Provide meaningful labels** - Always include descriptive labels and help text
3. **Handle loading states** - Use loading props to show appropriate feedback
4. **Validate user input** - Use validation states to guide users
5. **Consider mobile users** - Test components on mobile devices
6. **Keep content concise** - Use clear, concise language in labels and descriptions
7. **Test with screen readers** - Ensure accessibility compliance

## Contributing

When adding new shared components:

1. Follow existing patterns and conventions
2. Include comprehensive TypeScript types
3. Add JSDoc documentation
4. Support accessibility features
5. Include usage examples
6. Test across different screen sizes
7. Update this documentation

## Future Enhancements

- Storybook integration for component documentation
- Visual regression testing
- Theme customization system
- Animation and transition support
- Advanced accessibility features
- Component composition utilities