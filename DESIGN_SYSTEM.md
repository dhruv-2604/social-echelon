# Social Echelon Design System

## Overview
This design system uses CSS custom properties (variables) to make future UI overhauls simple. Just update the variables in `globals.css` to change the entire app's appearance.

## How to Use

### Colors
Instead of hardcoding colors, use our design tokens:

```jsx
// ❌ Don't do this:
<div className="bg-purple-600 text-gray-600">

// ✅ Do this:
<div className="bg-primary text-text-secondary">
```

### Available Color Classes

**Brand Colors:**
- `bg-primary`, `text-primary` - Main purple
- `bg-primary-dark`, `text-primary-dark` - Darker purple
- `bg-primary-light`, `text-primary-light` - Lighter purple
- `bg-secondary`, `text-secondary` - Pink accent
- `bg-secondary-dark`, `text-secondary-dark` - Darker pink
- `bg-secondary-light`, `text-secondary-light` - Lighter pink

**Text Colors:**
- `text-text-primary` - Main text (black/white)
- `text-text-secondary` - Secondary text (gray)
- `text-text-tertiary` - Disabled/placeholder text

**Semantic Colors:**
- `bg-success`, `bg-success-light` - Green for success
- `bg-warning`, `bg-warning-light` - Yellow for warnings
- `bg-error`, `bg-error-light` - Red for errors
- `bg-info`, `bg-info-light` - Blue for info

**Backgrounds & Borders:**
- `bg-background` - Main background
- `bg-background-secondary` - Secondary background
- `border-border` - Default border
- `border-border-hover` - Hover state border

### Spacing
Use consistent spacing variables:
- `p-xs` - 0.5rem
- `p-sm` - 1rem
- `p-md` - 1.5rem
- `p-lg` - 2rem
- `p-xl` - 3rem

### Border Radius
- `rounded-sm` - Small radius
- `rounded-md` - Medium radius
- `rounded-lg` - Large radius
- `rounded-xl` - Extra large radius
- `rounded-full` - Fully rounded

### Shadows
- `shadow-sm` - Subtle shadow
- `shadow-md` - Medium shadow
- `shadow-lg` - Large shadow

### Transitions
- `duration-fast` - 150ms
- `duration-base` - 200ms
- `duration-slow` - 300ms

## Quick UI Overhaul Guide

To completely change the app's appearance, just update these values in `globals.css`:

```css
:root {
  /* Change these to rebrand the entire app */
  --primary: #8B5CF6; /* Your new primary color */
  --secondary: #EC4899; /* Your new secondary color */
  
  /* Adjust the overall tone */
  --background: #ffffff;
  --text-primary: #111827;
}
```

## Examples

### Button with consistent styling:
```jsx
<button className="px-md py-sm bg-primary hover:bg-primary-dark text-white rounded-lg shadow-md transition-colors duration-base">
  Click Me
</button>
```

### Card component:
```jsx
<div className="bg-surface border border-border rounded-xl p-lg shadow-sm">
  <h3 className="text-text-primary font-bold">Title</h3>
  <p className="text-text-secondary">Description</p>
</div>
```

### Alert component:
```jsx
<div className="bg-success-light border border-success text-success p-sm rounded-md">
  Success message
</div>
```

## Migration Strategy

When doing the UI overhaul:

1. Find all hardcoded colors (search for `bg-purple-`, `text-gray-`, etc.)
2. Replace with design system classes
3. Update the CSS variables to your new color scheme
4. The entire app updates instantly!

## Dark Mode

The design system automatically supports dark mode. Just make sure to use the semantic color classes rather than specific colors.