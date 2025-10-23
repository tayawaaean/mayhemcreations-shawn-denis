# Field Tooltips System

## Overview
The Field Tooltips system provides contextual help for all form fields across the admin panel. When users hover over a question mark icon next to a field label, they see a helpful explanation of what the field is for and how to use it.

## Components

### 1. InfoTooltip Component (`components/InfoTooltip.tsx`)
A reusable tooltip component that displays helpful information when hovered.

**Props:**
- `text` (string, required): The explanation text to display
- `position` ('top' | 'bottom' | 'left' | 'right', optional): Tooltip position relative to icon (default: 'top')

**Usage:**
```tsx
import InfoTooltip from '../InfoTooltip'

<label>
  <span className="inline-flex items-center">
    Field Name
    <InfoTooltip text="Explanation of what this field does" />
  </span>
</label>
```

### 2. Field Descriptions (`utils/fieldDescriptions.ts`)
Centralized repository of all field explanations organized by section.

**Sections:**
- `category`: Category management fields
- `product`: Product fields and variants
- `variant`: Product variant specific fields
- `order`: Order management fields
- `customer`: Customer profile fields
- `user`: Admin/staff user fields
- `embroidery`: Embroidery option fields
- `faq`: FAQ management fields
- `payment`: Payment related fields
- `general`: Common fields used across multiple forms

**Usage:**
```tsx
import { fieldDescriptions } from '../../utils/fieldDescriptions'

<InfoTooltip text={fieldDescriptions.product.title} />
<InfoTooltip text={fieldDescriptions.category.slug} />
```

## Implementation

### Current Status
**✅ FULLY IMPLEMENTED**

All admin modals now have contextual help tooltips:
- ✅ CategoryModals.tsx - Complete with tooltips
- ✅ ProductModals.tsx - Complete with tooltips
- ✅ OrderModals.tsx - Complete with tooltips
- ✅ CustomerModals.tsx - Complete with tooltips
- ✅ UserModals.tsx - Complete with tooltips
- ✅ EmbroideryModals.tsx - Complete with tooltips
- ✅ FAQModals.tsx - Complete with tooltips
- ✅ PaymentModals.tsx - Complete with tooltips

Every form field across the entire admin panel now provides helpful contextual information on hover!

### How to Add Tooltips to Other Modals

1. **Import the required dependencies:**
   ```tsx
   import InfoTooltip from '../InfoTooltip'
   import { fieldDescriptions } from '../../utils/fieldDescriptions'
   ```

2. **Update each label:**
   ```tsx
   // Before:
   <label className="block text-sm font-medium text-gray-700 mb-1">
     Field Name
   </label>

   // After:
   <label className="block text-sm font-medium text-gray-700 mb-1">
     <span className="inline-flex items-center">
       Field Name
       <InfoTooltip text={fieldDescriptions.section.fieldName} />
     </span>
   </label>
   ```

3. **For checkbox labels:**
   ```tsx
   // Before:
   <label htmlFor="fieldId" className="ml-2 block text-sm text-gray-900">
     Field Name
   </label>

   // After:
   <label htmlFor="fieldId" className="ml-2 block text-sm text-gray-900">
     <span className="inline-flex items-center">
       Field Name
       <InfoTooltip text={fieldDescriptions.section.fieldName} />
     </span>
   </label>
   ```

## Field Description Guidelines

When adding new field descriptions to `fieldDescriptions.ts`:

1. **Be Clear and Concise**: Explain what the field is for in one sentence
2. **Provide Context**: Explain when or why someone would use this field
3. **Give Examples**: Include format examples or typical values
4. **Mention Constraints**: Note any size limits, required formats, or validation rules
5. **Explain Impact**: Describe what happens when this field is changed

**Good Example:**
```typescript
slug: 'URL-friendly version of the name (e.g., "mens-shirts"). Used in website URLs. Automatically generated from name if left empty.'
```

**Bad Example:**
```typescript
slug: 'The slug field'  // Too vague, not helpful
```

## Benefits

1. **Better UX**: Users understand fields without leaving the form
2. **Reduced Support**: Fewer questions about what fields mean
3. **Consistency**: Standardized explanations across the admin panel
4. **Maintainability**: All explanations in one centralized location
5. **Onboarding**: New admin users can learn the system faster

## Future Enhancements

Potential improvements to consider:

1. **Multi-language Support**: Translate tooltips for international teams
2. **Rich Tooltips**: Add images, links, or videos to complex explanations
3. **Context-Aware Help**: Show different explanations based on user role
4. **Interactive Tutorials**: Link tooltips to step-by-step guides
5. **Tooltip Analytics**: Track which tooltips are viewed most to identify confusing areas

## Notes

- Tooltips use z-50 to appear above other elements
- Mobile users can tap the icon to show the tooltip
- Tooltips auto-hide when focus is lost
- The question mark icon is subtle (gray) but stands out on hover (darker)
- All descriptions are non-technical and user-friendly

