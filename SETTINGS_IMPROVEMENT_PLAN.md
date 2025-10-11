# Settings Section Improvement Plan

## Overview
This document outlines the comprehensive plan to improve the settings section based on the following requirements:
1. Add a back button within the settings section that takes users back to their previous page
2. Remove UI & Accessibility section as it's not needed
3. Update Account Security to focus only on email changes for magic link authentication

## Current Settings Structure Analysis

### Existing Sections
- **Profile** - User display name and avatar management ✅ Keep
- **Playback & Subtitles** - Comprehensive playback and subtitle customization ✅ Keep
- **UI & Accessibility** - Theme and reduced motion settings ❌ Remove
- **Privacy** - Watch progress tracking and history clearing ✅ Keep
- **Devices** - Session management and device tracking ✅ Keep
- **Account Security** - Email and password changes 🔄 Simplify
- **Billing** - Subscription management (placeholder) ✅ Keep

### Navigation Flow
Users access settings via ProfileMenu → `/settings` page. Currently no back navigation exists.

## Implementation Plan

### 1. Add Back Button Navigation
**Location**: Top of the settings page, before the "Settings" heading
**Functionality**: Use `window.history.back()` to return to previous page
**Design**: Left arrow icon with "Back" text, styled consistently with app theme

**Implementation Details**:
```typescript
// Add ArrowLeft import from lucide-react
import { ArrowLeft } from "lucide-react"

// Add back button component before settings heading
<div className="flex items-center gap-4 mb-8">
  <button 
    onClick={() => window.history.back()} 
    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
  >
    <ArrowLeft className="h-5 w-5" />
    <span>Back</span>
  </button>
  <h1 className="text-3xl font-bold">Settings</h1>
</div>
```

### 2. Remove UI & Accessibility Section
**Changes Required**:
- Remove `UISection` component function (lines 365-390)
- Remove `{ id: 'ui', label: 'UI & Accessibility' }` from sections array (line 22)
- Remove conditional rendering `{active === 'ui' && <UISection />}` (line 41)
- Update default active section logic if needed

**Files to Modify**:
- `src/app/settings/page.tsx` - Main settings component

### 3. Simplify Account Security Section
**Current Functionality to Remove**:
- Password change fields (pw1, pw2 state)
- Password validation logic
- Password update functionality
- All password-related UI elements

**Functionality to Keep/Enhance**:
- Email change with verification
- Magic link integration messaging
- Current email display

**Updated SecuritySection Implementation**:
```typescript
function SecuritySection() {
  const { session } = useAuth()
  const [newEmail, setNewEmail] = useState('')
  const { push } = useToast()
  const [loading, setLoading] = useState(false)
  
  const submitEmail = async () => {
    if (!newEmail) return
    setLoading(true)
    try {
      const { error } = await (await import('@/lib/supabaseClient')).supabase!.auth.updateUser({ email: newEmail })
      if (error) {
        push({ type:'error', message:error.message })
      } else {
        push({ type:'success', message:'Verification email sent to your new address' })
        setNewEmail('')
      }
    } catch (e:any) { 
      push({ type:'error', message:e.message }) 
    } finally { 
      setLoading(false) 
    }
  }
  
  return <PlaceholderCard title="Account Security">
    <div className="space-y-6 text-sm">
      <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4">
        <div className="text-blue-300 text-sm font-medium mb-2">Magic Link Authentication</div>
        <div className="text-blue-200/80 text-xs">
          This account uses magic link authentication. You'll receive a secure login link via email instead of using passwords.
        </div>
      </div>
      
      <div>
        <div className="font-medium mb-3">Change Email Address</div>
        <div className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Current Email</label>
            <input 
              disabled 
              value={session?.user?.email || ''} 
              className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm opacity-70" 
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">New Email</label>
            <input 
              type="email" 
              placeholder="Enter new email address" 
              value={newEmail} 
              onChange={e=>setNewEmail(e.target.value)} 
              className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600" 
            />
          </div>
          <Button 
            size="sm" 
            onClick={submitEmail} 
            disabled={!newEmail || loading}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Update Email'}
          </Button>
          <div className="text-xs text-neutral-500">
            A verification email will be sent to your new address. Click the magic link to confirm the change.
          </div>
        </div>
      </div>
    </div>
  </PlaceholderCard>
}
```

## Technical Implementation Steps

### Step 1: Update Settings Page Structure
1. Add ArrowLeft import from lucide-react
2. Add back button component before settings heading
3. Remove UI section from sections array
4. Remove UISection component and its conditional rendering

### Step 2: Simplify Security Section
1. Remove all password-related state variables
2. Remove password change functionality
3. Add magic link authentication messaging
4. Enhance email change UI with better labels and feedback

### Step 3: Clean Up
1. Remove unused UISection component function
2. Verify no broken references to removed sections
3. Test navigation flow

## User Experience Flow

```
Previous Page → Settings (with back button) → Click Back → Previous Page

Settings Navigation:
- Profile ✅
- Playback & Subtitles ✅  
- Privacy ✅
- Devices ✅
- Account Security (simplified) ✅
- Billing ✅
```

## Files to Modify

1. **`src/app/settings/page.tsx`** - Main settings page component
   - Add back button with ArrowLeft icon
   - Remove UI & Accessibility section
   - Simplify SecuritySection component
   - Update sections array

## Testing Checklist

- [ ] Back button navigates to previous page correctly
- [ ] UI & Accessibility section is completely removed
- [ ] Account Security section only shows email change functionality
- [ ] Email change sends verification email properly
- [ ] Magic link authentication messaging is clear
- [ ] No broken references or console errors
- [ ] Responsive design works on mobile/desktop
- [ ] All remaining sections function properly

## Benefits

1. **Improved Navigation**: Users can easily return to their previous context
2. **Simplified Authentication**: Focuses on magic link flow, removing password complexity  
3. **Cleaner Interface**: Removes unnecessary UI/Accessibility options
4. **Better UX**: Streamlined security section with clear email management
5. **Consistent Design**: Back button follows app's design patterns

## Implementation Priority

1. **High Priority**: Add back button (immediate UX improvement)
2. **High Priority**: Remove UI & Accessibility section (cleanup)
3. **High Priority**: Simplify Account Security (align with auth strategy)
4. **Medium Priority**: Enhanced email change messaging
5. **Low Priority**: Additional polish and testing