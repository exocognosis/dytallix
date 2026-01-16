# Design System Migration Guide

## Overview

This document outlines the migration from ad-hoc styles to the unified design system based on Home.jsx patterns. The new system provides consistent UI primitives and design tokens for a cohesive user experience.

## Feature Flag

The design system is controlled by the feature flag `USE_HOME_STYLE` (default: true).

```javascript
// Set to false to disable new design system
process.env.REACT_APP_USE_HOME_STYLE=false
```

## Design System Components

### Core Components

All components are located in `/src/components/ui/` and can be imported as:

```javascript
import { Card, Button, Input, Badge, Stat, Section, Grid, EmptyState } from '../components/ui'
```

### Component Mapping

#### Old → New Component Patterns

| Old Pattern | New Component | Usage |
|------------|---------------|--------|
| `<div className="card">` | `<Card>` | Basic card container |
| `<div className="card accent-blue">` | `<Card accent="primary" borderTop>` | Accented cards |
| `<button className="btn btn-primary">` | `<Button variant="primary">` | Primary buttons |
| `<button className="btn btn-primary glow">` | `<Button variant="primary" glow>` | CTA buttons |
| `<div className="section">` | `<Section>` | Page sections |
| `<div className="grid grid-3">` | `<Grid columns={3}>` | Grid layouts |
| `<span className="badge badge-success">` | `<Badge variant="success">` | Status indicators |

#### Class Name Mappings

| Old CSS Class | New Token/Utility | Usage |
|---------------|-------------------|--------|
| `var(--primary-400)` | `var(--color-primary-400)` | Primary colors |
| `var(--text-primary)` | `var(--color-text-primary)` | Text colors |
| `var(--surface-border)` | `var(--color-surface-border)` | Border colors |
| `.section-title` | `.text-5xl .font-extrabold` | Section headings |
| `.muted` | `.text-muted` | Muted text |

## Design Tokens

### Color System

```css
/* Primary Colors */
--color-primary-300: #93C5FD
--color-primary-400: #60A5FA  /* Main primary */
--color-primary-500: #3B82F6
--color-primary-600: #2563EB

/* Accent Colors */
--color-accent-400: #A78BFA
--color-accent-500: #8B5CF6  /* Main accent */
--color-accent-600: #7C3AED

/* Semantic Colors */
--color-success-500: #10B981
--color-warning-500: #F59E0B
--color-danger-500: #EF4444
```

### Spacing Scale

```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 24px
--spacing-2xl: 32px
--spacing-3xl: 48px
--spacing-4xl: 64px
--spacing-5xl: 80px
```

### Typography Scale

```css
--font-size-xs: 0.75rem    /* 12px */
--font-size-sm: 0.875rem   /* 14px */
--font-size-base: 1rem     /* 16px */
--font-size-lg: 1.125rem   /* 18px */
--font-size-xl: 1.25rem    /* 20px */
--font-size-2xl: 1.5rem    /* 24px */
--font-size-3xl: 1.875rem  /* 30px */
--font-size-4xl: 2.25rem   /* 36px */
--font-size-5xl: 3rem      /* 48px */
```

## Migration Examples

### Card Components

#### Before
```jsx
<div className="card accent-blue" style={{ borderTop: '3px solid var(--primary-400)' }}>
  <h3 style={{ color: 'var(--primary-400)' }}>Feature Title</h3>
  <p className="muted">Feature description</p>
</div>
```

#### After
```jsx
<Card accent="primary" borderTop>
  <h3 style={{ color: 'var(--color-primary-400)' }}>Feature Title</h3>
  <p className="text-muted">Feature description</p>
</Card>
```

### Button Components

#### Before
```jsx
<button className="btn btn-primary glow">
  Get Started
</button>
```

#### After
```jsx
<Button variant="primary" glow>
  Get Started
</Button>
```

### Section Layouts

#### Before
```jsx
<div className="section">
  <div className="container">
    <div className="section-header">
      <h2 className="section-title">Section Title</h2>
      <p className="section-subtitle">Section description</p>
    </div>
    <div className="grid grid-3">
      {/* content */}
    </div>
  </div>
</div>
```

#### After
```jsx
<Section 
  title="Section Title"
  subtitle="Section description"
>
  <Grid columns={3}>
    {/* content */}
  </Grid>
</Section>
```

## Accessibility Improvements

### Focus Management
- All interactive components include `focus-ring` utility
- Consistent focus indicators across components
- Keyboard navigation support

### Color Contrast
- WCAG AA compliant color combinations
- High contrast mode support via `@media (prefers-contrast: high)`

### Motion Preferences
- Respects `prefers-reduced-motion` setting
- Animations can be disabled via feature flag

## Responsive Design

### Breakpoints
- Mobile: 640px and below
- Tablet: 768px and below  
- Desktop: 1024px and above

### Grid Behavior
```jsx
// Automatically responsive
<Grid columns="auto">  {/* Responsive columns */}
<Grid columns={3}>     {/* Fixed 3 columns, stacks on mobile */}
```

## Performance Considerations

### CSS Bundle Size
- Design tokens add ~8KB to CSS bundle
- Utilities add ~6KB to CSS bundle
- Total increase: ~14KB (acceptable for better DX)

### Component Bundle Size
- UI components are tree-shakeable
- Only imported components are bundled
- Estimated impact: <5KB per component

## Testing Strategy

### Visual Regression
- Playwright screenshots for main routes
- Before/after comparison workflow
- Automated via CI/CD pipeline

### Accessibility Testing
- axe-core integration
- Keyboard navigation tests
- Screen reader compatibility

## Rollback Plan

### Emergency Rollback
```bash
# Disable new design system
export REACT_APP_USE_HOME_STYLE=false
npm run build
```

### Gradual Rollback
1. Set feature flag to false in production
2. Remove component imports page by page
3. Restore original CSS classes
4. Remove design system files when fully reverted

## Development Workflow

### Adding New Components
1. Follow existing component patterns in `/src/components/ui/`
2. Use design tokens from `/src/styles/design-tokens.css`
3. Include accessibility features (focus states, ARIA labels)
4. Add to exports in `/src/components/ui/index.js`

### Updating Existing Pages
1. Import UI components: `import { Card, Button } from '../components/ui'`
2. Replace ad-hoc HTML with component equivalents
3. Update color references to use design tokens
4. Test responsive behavior
5. Verify accessibility

## Support

For questions or issues with the design system migration:
1. Check this documentation first
2. Review component examples in `/src/components/ui/`
3. Test changes with `npm run build`
4. Use feature flag for rollback if needed

## Change Log

### v1.0.0 - Initial Release
- ✅ Design tokens extracted from Home.jsx
- ✅ Core UI components (Card, Button, Input, Badge, Stat, Section, EmptyState)
- ✅ Utility classes for common patterns
- ✅ Feature flag system for rollback safety
- ✅ Faucet.jsx migration completed
- 🔄 Additional page migrations in progress