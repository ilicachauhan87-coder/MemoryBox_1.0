**Add your own guidelines here**
# MemoryBox Guidelines - Indian Emotional Family Memory Vault

## Core Design Philosophy
MemoryBox is a mobile-first, culturally authentic digital sanctuary for Indian families to preserve, share, and celebrate emotional memories across generations. Every interaction should feel respectful, warm, and deeply connected to Indian family values.

## General Guidelines

### Mobile-First & Elder-Friendly Design (25-70 years)
* Always design for mobile screens first, then scale up
* Ensure minimum 48px touch targets for accessibility
* Use larger font sizes (18px base, 20px+ for main content) for comfortable reading
* Maintain high contrast ratios for better visibility
* Never use small text below 16px on mobile devices
* Provide clear visual feedback for all interactions

### Cultural Authenticity for Indian Families
* Respect Indian cultural values in UI copy and interactions
* Use warm, respectful language that honors family bonds
* Include proper cultural context for rituals, festivals, and traditions

### Non-Cluttered & Clean Design
* Prioritize white space and breathing room
* Limit information density per screen
* Use clear visual hierarchy with proper spacing
* Avoid overwhelming users with too many options at once
* Progressive disclosure for complex features

## Color Palette (Vibrant MemoryBox)
* **Lively Cream**: #FDFCDC (Primary background)
* **Bold Violet**: #6A0572 (Primary brand color)
* **Coral Highlight**: #FF6F61 (Secondary accents)
* **Aqua Spark**: #17BEBB (Success/positive actions)
* **Strong Ink**: #22223B (Text/dark elements)

### Color Usage Rules
* Use Bold Violet (#6A0572) for primary actions and branding
* Use Coral Highlight (#FF6F61) for secondary actions and highlights
* Use Aqua Spark (#17BEBB) for success states and positive feedback
* Maintain Lively Cream (#FDFCDC) as the primary background for warmth
* Use Strong Ink (#22223B) for text to ensure readability

## Typography
* **Titles**: Playfair Display (serif) - for elegant, traditional feel
* **Body Text**: Nunito (sans-serif) - for modern readability
* **Base Font Size**: 18px minimum
* **Line Height**: 1.6-1.7 for comfortable reading
* **Font Weights**: Regular (400), Medium (500), Semibold (600)

## Component Guidelines

### Navigation
* Bottom navigation with maximum 4 items for mobile
* Always include: Home, Add Memory, Vault, Family Tree, 
* Use clear icons with descriptive labels
* Implement safe area insets for modern mobile devices

### Memory Cards
* Use the `.memory-card` class for consistent styling
* Include proper shadows and hover effects
* Maintain 16:9 or 4:3 aspect ratios for images
* Always provide alt text for accessibility

### Buttons
* Use `.vibrant-button` class for primary actions
* Use `.aqua-button` class for secondary actions
* Ensure minimum 48px height for touch accessibility
* Provide clear loading states for async actions

### Forms & Inputs
* Use proper labels and placeholders in English only. 
* Implement client-side validation with clear error messages
* Provide visual feedback for form state changes
* Use appropriate input types (email, tel, date, etc.)

## Family Tree Specific Rules

## Data Privacy & Security
* Complete user data isolation with Row Level Security
* No data sharing between families unless explicitly permitted
* Secure file upload handling for photos/videos/audio
* Proper authentication flow with both email/password and mobile/OTP
* **CRITICAL:** Never create demo accounts or hardcoded user data in production code
* **CRITICAL:** All users must sign up through Supabase Auth (no localStorage-only accounts)
* **CRITICAL:** Each user gets a unique UUID from Supabase (never reuse or hardcode UUIDs)

## Database-First Architecture (MANDATORY FOR ALL FEATURES)
* **PRIMARY RULE:** ALL features MUST save to Supabase database as primary storage
* **localStorage role:** ONLY as cache for performance, NEVER as primary storage
* **If database save fails:** Auto-retry 3 times, then show error with manual retry button
* **Cross-device sync:** Database-first ensures data syncs across all user devices
* **Data safety:** Database provides backup, recovery, and permanent storage

### Database-First Implementation Pattern (With Auto-Retry)
```typescript
// ✅ CORRECT: Database-first with auto-retry
const saveData = async (data) => {
  try {
    // 1. Save to DATABASE FIRST with automatic retries
    await DatabaseService.saveData(userId, data, { 
      retries: 3,  // Try 3 times with exponential backoff
      showToast: true 
    });
    
    // 2. Update UI state (only after database success)
    setData(data);
    
    // 3. Cache in localStorage (only after database success)
    localStorage.setItem(`cache_${userId}`, JSON.stringify(data));
    
    toast.success('Saved successfully!');
  } catch (error) {
    // ❌ NEVER save to localStorage if database fails after all retries
    // User will see error toast with "Retry Now" button
    toast.error('Failed to save. Please check connection.');
    throw error;
  }
};
```

### Auto-Retry Strategy (For Critical Data):
- **Attempt 1:** Immediate
- **Attempt 2:** Wait 2 seconds (exponential backoff)
- **Attempt 3:** Wait 4 seconds (exponential backoff)
- **If all fail:** Show error with manual "Retry Now" button
- **Why:** 90% of database failures are temporary network hiccups that auto-resolve

### NEVER Do This:
```typescript
// ❌ WRONG: Silent fallback to localStorage
try {
  await DatabaseService.save(data);
} catch {
  localStorage.setItem(...); // ❌ Gives false sense of security!
  // User thinks data is saved but database is empty
  // Data will be lost on browser clear or device switch
}
```

### Current Status (✅ 100% PRODUCTION READY):
* ✅ **Memory Upload**: Database-first ✅ (Supabase Storage + Database)
* ✅ **Memory Vault**: Database-first ✅ (Loads from Supabase)
* ✅ **Life Journeys**: Database-first ✅ (Couple & Pregnancy)
* ✅ **Family Tree**: Database-first ✅
* ✅ **Time Capsules**: Database-first ✅
* ✅ **Family Wall**: Database-first ✅
* ✅ **User Profiles**: Database-first ✅
* ✅ **Journal (My Journal)**: Database-first ✅ **PRODUCTION READY** ✨

**🎉 All 9 core features are now database-first! App is 100% production-ready!**

## Database Field Naming Convention (CRITICAL)
* **Database:** Uses snake_case (`first_name`, `last_name`, `date_of_birth`)
* **Frontend:** Uses camelCase (`firstName`, `lastName`, `dateOfBirth`)
* **ALWAYS use the name normalizer:** Import `normalizeNameFields` from `/utils/nameFieldNormalizer.ts`
* **When reading from database:** Use `mapDbProfileToUser()` or `normalizeUserFromDatabase()`
* **When writing to database:** Map camelCase → snake_case (`firstName` → `first_name`)
* **Never access raw database fields directly** - always normalize first
* **Full name storage:** Store BOTH `name` (full name) AND `first_name`/`last_name` (parsed)
* **Parsing names:** Use `parseName()` utility to split full names into components

## Performance & Accessibility
* Lazy load images and heavy components
* Implement proper loading states for all async operations
* Use semantic HTML for screen readers
* Support keyboard navigation
* Provide alternative text for all media
* Test with screen readers and accessibility tools

## Content Guidelines
* Use warm, respectful language that honors family relationships
* Avoid technical jargon - use simple, clear explanations
* Respect cultural sensitivities around family matters
* Provide helpful tooltips and guidance for new users

## Error Handling
* Provide clear, actionable error messages
* Use gentle language that doesn't blame the user
* Include specific steps to resolve issues
* Maintain consistent error styling across the application
* Log errors properly for debugging while protecting user privacy
<!--

System Guidelines

Use this file to provide the AI with rules and guidelines you want it to follow.
This template outlines a few examples of things you can add. You can add your own sections and format it to suit your needs

TIP: More context isn't always better. It can confuse the LLM. Try and add the most important rules you need

# General guidelines

Any general rules you want the AI to follow.
For example:

* Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default
* Refactor code as you go to keep code clean
* Keep file sizes small and put helper functions and components in their own files.

--------------

# Design system guidelines
Rules for how the AI should make generations look like your company's design system

Additionally, if you select a design system to use in the prompt box, you can reference
your design system's components, tokens, variables and components.
For example:

* Use a base font-size of 14px
* Date formats should always be in the format “Jun 10”
* The bottom toolbar should only ever have a maximum of 4 items
* Never use the floating action button with the bottom toolbar
* Chips should always come in sets of 3 or more
* Don't use a dropdown if there are 2 or fewer options

You can also create sub sections and add more specific details
For example:


## Button
The Button component is a fundamental interactive element in our design system, designed to trigger actions or navigate
users through the application. It provides visual feedback and clear affordances to enhance user experience.

### Usage
Buttons should be used for important actions that users need to take, such as form submissions, confirming choices,
or initiating processes. They communicate interactivity and should have clear, action-oriented labels.

### Variants
* Primary Button
  * Purpose : Used for the main action in a section or page
  * Visual Style : Bold, filled with the primary brand color
  * Usage : One primary button per section to guide users toward the most important action
* Secondary Button
  * Purpose : Used for alternative or supporting actions
  * Visual Style : Outlined with the primary color, transparent background
  * Usage : Can appear alongside a primary button for less important actions
* Tertiary Button
  * Purpose : Used for the least important actions
  * Visual Style : Text-only with no border, using primary color
  * Usage : For actions that should be available but not emphasized
-->
