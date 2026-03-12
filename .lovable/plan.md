

# Add URL Validation to Payment Link Field

## Problem
The `payment_link` field in `NostrProfile.tsx` has no URL validation, unlike the `website` field which checks for `http://` or `https://` prefix.

## Fix — `src/pages/NostrProfile.tsx`

1. **Add validation** (near line 123, alongside the website check):
```typescript
if (formData.payment_link && !/^https?:\/\/.+/.test(formData.payment_link)) {
  newErrors.payment_link = t('validation.invalidUrl', { ns: 'common' });
}
```

2. **Add error display** to the Payment Link input (line ~428-433):
- Add `className={errors.payment_link ? "border-destructive" : ""}` to the Input
- Add error message `<p>` below the Input, same pattern as the website field

No translation changes needed — reuses existing `common:validation.invalidUrl`.

