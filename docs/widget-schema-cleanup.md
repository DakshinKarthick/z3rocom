# Widget Schema Cleanup - Fixed

## Issues Fixed

### 1. **Invalid Widget ID Error** ✅
**Problem**: Code was trying to access `w.widget_instance_id` but the database returns `w.id`
- `widgets.widget_instances` table has primary key column named `id`, not `widget_instance_id`
- The loading code was incorrectly accessing `w.widget_instance_id`

**Solution**: Updated all references to use `w.id` consistently:
- `app/session/page.tsx` lines 181, 192, 208, 214 - Changed from `w.widget_instance_id` to `w.id`
- Subscription callback now correctly uses `newWidget.id` directly

### 2. **Redundant widget_index Table** ✅
**Problem**: Two tables serving the same purpose caused confusion
- `public.widget_index` - Legacy table with `widget_instance_id` column
- `widgets.widget_instances` - Actual source of truth with `id` column

**Solution**: 
- Removed all references to `widget_index` from active code
- Removed dual-insert logic from `createWidget()` function
- Created migration script `remove-widget-index.sql` to drop the table

## Changes Made

### Code Changes

#### `app/session/page.tsx`
```typescript
// BEFORE (incorrect)
const baseWidget = {
  id: w.widget_instance_id,  // ❌ Wrong column name
  type: w.widget_type,
  // ...
}
const tasks = await getTaskItems(w.widget_instance_id)  // ❌

// AFTER (correct)
const baseWidget = {
  id: w.id,  // ✅ Correct column name
  type: w.widget_type,
  // ...
}
const tasks = await getTaskItems(w.id)  // ✅
```

#### `lib/supabase/widgets.ts`
```typescript
// REMOVED redundant code:
// - Insert to public.widget_index after creating widget_instances
// - Only widgets.widget_instances is used now

// BEFORE
if (!instance) throw new Error("...")
console.log('[createWidget] Widget instance created:', instance.id)

// Also add to public.widget_index for quick lookups  ❌ REMOVED
const { error: indexErr } = await supabase
  .from("widget_index")
  .insert({ ... })
// ... error handling ...

console.log('[createWidget] Widget created successfully:', instance.id)
return instance

// AFTER
if (!instance) throw new Error("...")
console.log('[createWidget] Widget created successfully:', instance.id)
return instance  // ✅ Cleaner, single source of truth
```

### Database Migration

Created `remove-widget-index.sql`:
- Removes table from realtime publication
- Drops all RLS policies
- Drops the table
- Includes verification query

## Database Schema (After Cleanup)

### Single Source of Truth: `widgets.widget_instances`
```sql
CREATE TABLE widgets.widget_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ✅ Used everywhere
  session_id UUID NOT NULL,
  widget_type TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Child Tables (all reference `widget_instances.id`)
- `widgets.task_items` - Tasks widget data
- `widgets.decisions` - Decision log data
- `widgets.issues` - Issues tracker data
- `widgets.code_snippet` - Code widget data
- `widgets.progress_prompts` - Progress check questions
- `widgets.progress_responses` - Progress check answers
- `widgets.next_session_seed` - Next steps suggestions
- `widgets.next_seed_issues` - Next steps issues

## Realtime Subscription Flow

1. **Widget Creation**: 
   - INSERT into `widgets.widget_instances` returns row with `id`
   - Realtime broadcast sends `payload.new.id`
   - Subscription callback uses `newWidget.id` ✅

2. **Widget Loading**:
   - Query `widgets.widget_instances` returns rows with `id` column
   - Map using `w.id` to load child data ✅

3. **Child Data Subscriptions**:
   - Use widget `id` to subscribe to task_items, decisions, issues
   - All working with consistent ID references ✅

## Testing Checklist

- [ ] Run `remove-widget-index.sql` in Supabase SQL Editor
- [ ] Create new widget (tasks/decisions/issues) - should work
- [ ] Refresh page - widgets should load with data
- [ ] Add items to widgets - should sync realtime
- [ ] Open in 2 browsers - changes should sync between users
- [ ] Check console - no "Invalid widget ID" errors

## Files Modified

1. ✅ `app/session/page.tsx` - Fixed widget ID references (4 locations)
2. ✅ `lib/supabase/widgets.ts` - Removed widget_index code
3. ✅ `remove-widget-index.sql` - Created migration to drop table

## Files to Update (User Action Required)

1. ⚠️ Run `remove-widget-index.sql` in Supabase SQL Editor
2. ⚠️ Optional: Clean up `client/client/` folder (old unused code)
3. ⚠️ Optional: Update `supabase.sql` and `supabase-widgets-migration.sql` to remove widget_index definitions

## Summary

The issue was a **column name mismatch**:
- Database table `widget_instances` has primary key `id`
- Code was incorrectly trying to access `widget_instance_id`
- This was caused by confusion with the redundant `widget_index` table

Now there's a **single source of truth** (`widgets.widget_instances`) with consistent `id` references throughout the codebase. Widget creation, loading, and realtime sync all use the same column name.
