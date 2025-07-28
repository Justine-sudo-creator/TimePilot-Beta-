# Skipped Sessions Handling Guide

## Overview

Skipped sessions are sessions that have been marked with `status: 'skipped'`. These sessions represent conscious decisions by the user not to complete certain study sessions.

## Key Principles

### 1. Skipped Sessions Are Treated As "Done" For Scheduling:
- **Total study hours calculations** - They count toward completed study time
- **Task completion logic** - They count toward task progress
- **Unscheduled hours calculations** - They don't count as unscheduled work
- **Session combination logic** - They are kept separate from combined sessions

### 2. Skipped Sessions Are Hidden From UI:
- **Calendar display** - They are hidden from the calendar view
- **Study plan display** - They are excluded from "work planned" calculations
- **Active session counts** - They are excluded from active session displays
- **Task progress displays** - They are included in progress calculations but not shown in UI

### 3. Skipped Sessions Should NOT Be Included In:
- **Session combination logic** - They shouldn't be combined with other sessions
- **UI displays** - They should be hidden from calendar and study plan views
- **Active session counts** - They shouldn't be included in "active sessions today"

## Implementation Details

### Scheduling Calculations:
```typescript
// Skipped sessions count as "done" for scheduling purposes
const taskScheduledHours = sessions.filter(s => s.done || s.status === 'skipped')
  .reduce((sum, session) => sum + session.allocatedHours, 0);
```

### UI Display:
```typescript
// Skipped sessions are hidden from UI
const visibleSessions = sessions.filter(s => s.status !== 'skipped');
```

### Task Completion:
```typescript
// Skipped sessions count toward task completion
const allSessionsDone = sessions.every(s => s.done || s.status === 'skipped');
```

## Edge Cases

### Task with Only One Skipped Session:
If a task has only one session and that session is skipped, the task is automatically marked as completed since skipped sessions are treated as "done" for scheduling purposes.

### Multiple Sessions with One Skipped:
If a task has multiple sessions and one is skipped:
- The skipped session counts as "done" for scheduling
- The remaining sessions are still active
- No unscheduled hours are detected for the skipped portion
- The task remains active with the remaining sessions

## Utility Functions

### `calculateTotalStudyHours(plannedTasks)`:
- Includes skipped sessions as completed hours
- Used for total study time calculations

### `filterSkippedSessions(sessions)`:
- Returns sessions excluding skipped ones
- Used for UI display purposes

### `checkAndHandleSkippedOnlyTask(taskId)`:
- Detects when a task has only skipped sessions
- Automatically marks the task as completed
- Clears current task state if needed

## Best Practices

1. **Always use the utility functions** for consistent handling
2. **Test edge cases** with tasks that have mixed session statuses
3. **Update UI components** to exclude skipped sessions from displays
4. **Include skipped sessions** in scheduling calculations
5. **Document any changes** to skipped session handling 