# Event Tree Editor - Implementation Plan

## Existing Components Analysis

### Components to Reuse (Import As-Is)

| Component | Location | Use For |
|-----------|----------|---------|
| `Button`, `Input`, `Label`, `Badge` | `components/ui/` | All form elements |
| `AsyncSearchableSelect` | `components/async-searchable-select.tsx` | Asset search |
| `InlineTypeahead` | `components/inline-typeahead.tsx` | Topic/category selection |
| `useToast` | `components/ui/use-toast.tsx` | Notifications |
| `SortableAssetTable` | `components/sortable-asset-table.tsx` | Asset listing (if needed) |

### Existing Patterns to Follow (Reference Only, Don't Modify)

| Component | Pattern | What to Learn |
|-----------|---------|---------------|
| `ExpandableEventRow` | Expand/collapse with lazy loading | Row click toggles, fetches children on first expand |
| `SessionAssetsSection` | Inline form toggle | "Attach Asset" button shows/hides form inline |
| `TranscriptQuickAdd` | Multi-row bulk add | Search → select multiple → edit rows → bulk create |
| `BulkAddSessionsModal` | Editable row grid | Grid of inputs, add/remove rows, bulk submit |

### Key Patterns Observed

1. **Toggle Pattern**: Button toggles `isOpen` state, conditionally renders form
2. **Row State**: Array of objects with temp IDs, `updateRow(id, field, value)` helper
3. **Async Search**: Debounced search with results list + selection
4. **Bulk Submit**: Loop through rows, track success/failure count
5. **Lazy Loading**: Fetch children only when first expanded

### New Components to Create

All new components go in `components/composer/` - we do NOT modify existing components.

| Component | Purpose | Reuses |
|-----------|---------|--------|
| `CollapsibleSection` | Generic expand/collapse wrapper | None (new primitive) |
| `EntityCard` | Card with status badge + actions | Badge, Button |
| `InlineEntityForm` | Form that expands in-place | Input, Label, Button |
| `PendingChangesContext` | React context for tracking dirty state | None |
| `SessionComposer` | Session + assets + transcripts | EntityCard, CollapsibleSection |
| `EventComposer` | Event + sessions (full tree) | SessionComposer |
| `ChangesSummary` | Shows pending creates/updates/deletes | Badge |
| `ComposerPreviewModal` | Review before batch save | Modal pattern from BulkAddSessionsModal |

---

## Overview

A unified nested-section UI for creating and editing the full event content hierarchy in one screen:

```
Event
├── Session 1
│   ├── Asset A (video)
│   │   ├── Transcript EN captions
│   │   └── Transcript TI captions
│   └── Asset B (audio)
├── Session 2
│   └── Asset C (video)
│       └── Transcript EN captions
└── Session 3 (no assets yet)
```

**Goals:**
- Enter all data for an event and its children in one place
- Preview changes before committing
- Batch create/update all entities in one click
- Reusable components that work at any scope level

---

## Architecture

### Component Hierarchy (Bottom-Up)

Build from the leaf level up, ensuring each component is self-contained and reusable:

#### Level 1: Transcript Scope
```typescript
// Standalone transcript editor
<TranscriptInlineEditor
  transcript?: TranscriptData      // Existing or undefined for new
  mediaAssetId: string             // Parent asset
  onSave: (data) => void
  onDelete?: () => void
/>
```

#### Level 2: Asset Scope
```typescript
// Asset with nested transcripts
<AssetTreeNode
  asset?: AssetData
  sessionId?: string               // If linked to session
  transcripts: TranscriptData[]
  expanded?: boolean
  onAssetChange: (data) => void
  onTranscriptChange: (id, data) => void
  onTranscriptAdd: (data) => void
  onTranscriptDelete: (id) => void
/>
```

#### Level 3: Session Scope
```typescript
// Session with nested assets
<SessionTreeNode
  session?: SessionData
  eventId: string
  assets: AssetWithTranscripts[]
  expanded?: boolean
  onSessionChange: (data) => void
  onAssetChange: (id, data) => void
  // ... asset/transcript handlers
/>
```

#### Level 4: Event Scope (Top-Level)
```typescript
// Full event tree editor
<EventTreeEditor
  eventId?: string                 // Undefined for new event
  initialData?: EventTree          // Pre-loaded data for edit mode
  mode: "create" | "edit"
/>
```

---

## State Management

### Nested Form State Structure

```typescript
interface EventTreeState {
  event: {
    data: Partial<EventData>;
    status: "new" | "modified" | "unchanged";
    errors: ValidationError[];
  };
  sessions: Map<string, {
    data: Partial<SessionData>;
    status: "new" | "modified" | "deleted" | "unchanged";
    errors: ValidationError[];
    assets: Map<string, {
      data: Partial<AssetData>;
      status: "new" | "modified" | "deleted" | "unchanged";
      errors: ValidationError[];
      transcripts: Map<string, {
        data: Partial<TranscriptData>;
        status: "new" | "modified" | "deleted" | "unchanged";
        errors: ValidationError[];
      }>;
    }>;
  }>;
}
```

### State Management Options

**Option A: React Context + useReducer**
- Pros: No external dependencies, good for form state
- Cons: Complex reducer logic for deeply nested updates

**Option B: Zustand with Immer**
- Pros: Simple API, immutable updates, devtools support
- Cons: Additional dependency

**Recommendation**: Zustand with Immer for easier nested state updates.

```typescript
// Example store
const useEventTreeStore = create<EventTreeStore>()(
  immer((set, get) => ({
    state: initialState,

    updateSession: (sessionId, data) => set((draft) => {
      const session = draft.sessions.get(sessionId);
      if (session) {
        Object.assign(session.data, data);
        session.status = session.status === "new" ? "new" : "modified";
      }
    }),

    addTranscript: (sessionId, assetId, data) => set((draft) => {
      // ... nested update logic
    }),

    // Computed
    getPendingChanges: () => {
      // Collect all new/modified/deleted items
    },

    hasChanges: () => {
      // Check if any item is dirty
    },
  }))
);
```

---

## UI Components

### 1. Generic Tree Components

```typescript
// Reusable collapsible tree node
<TreeNode
  label: ReactNode
  icon?: ReactNode
  status?: "new" | "modified" | "deleted"
  expanded?: boolean
  onToggle?: () => void
  actions?: ReactNode              // Buttons for add/delete/etc
  children?: ReactNode
/>

// Tree container with keyboard navigation
<TreeView
  onKeyDown: (e) => void           // Arrow keys, Enter, etc
  selectedId?: string
  onSelect: (id) => void
/>
```

### 2. Inline Form Components

```typescript
// Compact inline form that expands in place
<InlineEntityForm
  mode: "collapsed" | "expanded"
  summary: ReactNode               // What to show when collapsed
  form: ReactNode                  // Full form when expanded
  onSave: () => void
  onCancel: () => void
  isDirty: boolean
/>
```

### 3. Quick-Add Components

```typescript
// Fast entry for common patterns
<QuickAddSession
  eventId: string
  onAdd: (session) => void
/>

<QuickAddAsset
  sessionId: string
  onAdd: (asset) => void
/>

<QuickAddTranscript
  assetId: string
  existingLanguages: string[]      // To suggest what's missing
  onAdd: (transcript) => void
/>
```

### 4. Preview Panel

```typescript
<ChangePreview
  changes: PendingChanges
  onConfirm: () => void
  onCancel: () => void
>
  // Shows summary:
  // - 1 Event (new)
  // - 3 Sessions (2 new, 1 modified)
  // - 5 Assets (5 new)
  // - 8 Transcripts (8 new)
  //
  // Expandable to see details
</ChangePreview>
```

---

## Backend Requirements

### Option A: Individual Endpoints with Client-Side Orchestration

Use existing endpoints, orchestrate from frontend:

```typescript
async function saveEventTree(changes: PendingChanges) {
  // 1. Create/update event first
  const event = await saveEvent(changes.event);

  // 2. Create/update sessions (can parallelize)
  const sessions = await Promise.all(
    changes.sessions.map(s => saveSession({ ...s, eventId: event.id }))
  );

  // 3. Create/update assets
  // 4. Create/update transcripts
  // 5. Handle failures with partial rollback UI
}
```

**Pros**: No backend changes needed
**Cons**: Not atomic, complex error handling, multiple round trips

### Option B: Batch Endpoint (Recommended)

New endpoint that accepts the full tree:

```
POST /api/v1/events/batch
{
  "event": { ... },
  "sessions": [
    {
      "tempId": "session-1",        // Client-generated temp ID
      "data": { ... },
      "assets": [
        {
          "tempId": "asset-1",
          "data": { ... },
          "transcripts": [...]
        }
      ]
    }
  ]
}
```

Response maps temp IDs to real IDs:

```json
{
  "event": { "id": "uuid-1", ... },
  "idMap": {
    "session-1": "uuid-2",
    "asset-1": "uuid-3"
  }
}
```

**Pros**: Atomic, single round trip, server-side validation
**Cons**: New endpoint needed, more complex backend logic

---

## Implementation Phases

### Phase 1: Core Primitives (New Components Only)

**Files to create:**
```
components/composer/
├── collapsible-section.tsx    # Expand/collapse wrapper with header
├── entity-card.tsx            # Card with status badge + inline actions
├── status-badge.tsx           # New/modified/deleted indicator
└── index.ts                   # Barrel export
```

**What it does:**
- `CollapsibleSection`: Wraps children, shows header with expand arrow
- `EntityCard`: Bordered card with title, status badge, action buttons
- `StatusBadge`: Small pill showing "New", "Modified", "Deleted"

**Deliverables:**
- [ ] CollapsibleSection with smooth animation
- [ ] EntityCard with configurable actions
- [ ] StatusBadge variants
- [ ] Unit tests

### Phase 2: Transcript & Asset Composers

**Files to create:**
```
components/composer/
├── transcript-row.tsx         # Single transcript inline editor row
├── transcript-composer.tsx    # List of transcript rows + add button
├── asset-section.tsx          # Asset card with nested transcripts
└── asset-composer.tsx         # List of asset sections + add asset
```

**Pattern**: Follow `TranscriptQuickAdd` for row editing, `SessionAssetsSection` for inline toggle

**Deliverables:**
- [ ] TranscriptRow: language/kind/speaker selects, delete button
- [ ] TranscriptComposer: wraps multiple TranscriptRows
- [ ] AssetSection: collapsible, contains TranscriptComposer
- [ ] AssetComposer: list of AssetSections

### Phase 3: Session Composer

**Files to create:**
```
components/composer/
├── session-section.tsx        # Session form + nested AssetComposer
└── session-composer.tsx       # List of sessions + add session
```

**Deliverables:**
- [ ] SessionSection: session fields + collapsible AssetComposer
- [ ] SessionComposer: manages multiple sessions
- [ ] Can be used standalone on event page

### Phase 4: State Management

**Files to create:**
```
components/composer/
├── composer-context.tsx       # React Context for pending changes
└── use-composer.ts            # Hook for add/update/delete operations

lib/types/
└── composer-types.ts          # TypeScript interfaces
```

**Deliverables:**
- [ ] ComposerProvider context
- [ ] useComposer hook with `addSession`, `updateAsset`, `deleteTranscript`, etc.
- [ ] `getPendingChanges()` to collect all dirty items
- [ ] `hasChanges` computed property

### Phase 5: Preview & Batch Save

**Files to create:**
```
components/composer/
├── changes-summary.tsx        # Shows count of pending changes
├── preview-modal.tsx          # Full preview before save
└── batch-save-button.tsx      # Save button with progress
```

**Deliverables:**
- [ ] ChangesSummary: "3 new, 1 modified" inline display
- [ ] PreviewModal: expandable list of all pending changes
- [ ] BatchSaveButton: calls API, shows progress, handles errors

### Phase 6: Full Event Composer

**Files to create:**
```
components/composer/
└── event-composer.tsx         # Top-level: event form + SessionComposer

app/events/[id]/compose/
└── page.tsx                   # Edit existing event in composer mode

app/events/new/compose/
└── page.tsx                   # Create new event with composer
```

**Deliverables:**
- [ ] EventComposer component
- [ ] Routes for compose mode
- [ ] Entry point buttons on existing event pages

### Phase 7: Polish & Future

- [ ] Keyboard shortcuts
- [ ] Duplicate/copy functionality
- [ ] Templates (e.g., "7-day retreat")
- [ ] Import from CSV/spreadsheet
- [ ] Undo/redo (optional)

---

## UI Mockup (ASCII)

### Nested Cards Layout (Not Strict Tree)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Event Composer                    [3 new, 1 modified] [Preview] [Save]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─ Event Details ─────────────────────────────────────────────────┐ │
│ │  Name: [Summer Retreat 2024          ]                          │ │
│ │  Dates: [Jun 15, 2024] to [Jun 22, 2024]   Format: [Retreat ▼]  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Sessions ─────────────────────────────────────────── [+ Add Session]│
│                                                                     │
│ ┌─ Day 1 - Morning ──────────────────────────────── 🟢 New ── [▼] ┐ │
│ │                                                                 │ │
│ │  Name: [Day 1 - Morning Session    ]  Date: [Jun 15, 2024]      │ │
│ │                                                                 │ │
│ │  Assets ───────────────────────────────────────── [+ Add Asset] │ │
│ │                                                                 │ │
│ │  ┌─ Day1_Morning_Video.mp4 ───────────── 🟢 New ─────── [▼] ──┐ │ │
│ │  │  Type: video │ Variant: source │ Duration: 2:45:00         │ │ │
│ │  │                                                            │ │ │
│ │  │  Transcripts ─────────────────────────── [+ Add Transcript] │ │
│ │  │  ┌────────────────────────────────────────────────────────┐│ │ │
│ │  │  │ 🟢 [EN ▼] [transcript ▼] [teacher ▼] [approved ▼]  [×] ││ │ │
│ │  │  │ 🟢 [TI ▼] [transcript ▼] [teacher ▼] [approved ▼]  [×] ││ │ │
│ │  │  └────────────────────────────────────────────────────────┘│ │ │
│ │  └────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Day 1 - Afternoon ────────────────────────── 🟡 Modified ─ [▶] ┐ │
│ │  (collapsed - click to expand)                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Day 2 - Morning ──────────────────────────────────────── [▶] ──┐ │
│ │  (collapsed)                                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Preview Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Review Changes Before Saving                              [×]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Summary                                                        │
│  ────────────────────────────────────────────                   │
│  🟢 Create:  2 sessions, 3 assets, 6 transcripts                │
│  🟡 Update:  1 event, 1 session                                 │
│  🔴 Delete:  0 items                                            │
│                                                                 │
│  ▼ Details                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ + Session: Day 1 - Morning                                  ││
│  │   + Asset: Day1_Morning_Video.mp4                           ││
│  │     + Transcript: EN transcript (teacher)                   ││
│  │     + Transcript: TI transcript (teacher)                   ││
│  │ ~ Session: Day 1 - Afternoon (modified: time changed)       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                    [Cancel]  [Save All Changes] │
└─────────────────────────────────────────────────────────────────┘
```

---

## Open Questions

1. **Scope**: Start with session-level tree (simpler) or full event-level?
2. **Asset Creation**: Upload new assets inline, or only link existing assets?
3. **Offline Support**: Cache pending changes in localStorage?
4. **Collaboration**: Conflict detection if multiple users edit same event?

---

## Dependencies

- `zustand` + `immer` - State management
- `@radix-ui/react-collapsible` - Tree expand/collapse (already have Radix)
- Existing UI components (Button, Input, Badge, etc.)

---

## Success Criteria

1. User can create a full event with 3 sessions, 3 assets, 6 transcripts in under 5 minutes
2. Preview shows accurate summary of all pending changes
3. Batch save is atomic - all or nothing
4. Components are reusable at individual scope levels
5. No regression in existing individual entity pages
