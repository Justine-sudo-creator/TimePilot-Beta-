# Individual Commitment Session Management

## Overview

This feature allows users to delete or edit individual occurrences of fixed commitments without affecting the recurring schedule. This provides much more flexibility for handling real-world schedule changes like cancelled classes, rescheduled meetings, or one-time modifications.

## Features

### ✅ Individual Session Deletion
- Delete specific occurrences of a commitment (e.g., cancelled class on a particular day)
- The recurring commitment remains intact for future weeks
- Deleted sessions are hidden from the calendar
- Freed time slots become available for task scheduling

### ✅ Individual Session Editing
- Modify title, time, or type for specific occurrences
- Changes only affect the selected date, not the recurring schedule
- Modified sessions show updated information in the calendar
- Preserves the original commitment for other occurrences

### ✅ Enhanced Task Scheduling
- When commitments are deleted, the freed time becomes available for tasks
- The system automatically detects available time slots
- Tasks can be rescheduled into freed time
- Existing task sessions (done/skipped) are preserved during regeneration

## Technical Implementation

### Enhanced Data Structure

```typescript
interface FixedCommitment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  type: 'class' | 'work' | 'appointment' | 'other' | 'buffer';
  location?: string;
  description?: string;
  createdAt: string;
  // New fields for individual session management
  deletedOccurrences?: string[]; // Array of date strings (YYYY-MM-DD)
  modifiedOccurrences?: {
    [date: string]: {
      startTime?: string;
      endTime?: string;
      title?: string;
      type?: 'class' | 'work' | 'appointment' | 'other' | 'buffer';
    };
  };
}
```

### Key Components

1. **CommitmentSessionManager.tsx**
   - Modal component for managing individual sessions
   - Edit and delete functionality
   - Beautiful, production-ready UI

2. **CalendarView.tsx**
   - Enhanced event handling for commitment sessions
   - Right-click/long-press to open session manager
   - Filters out deleted occurrences from display
   - Shows modified sessions with updated information

3. **App.tsx**
   - `handleDeleteCommitmentSession()` - Deletes specific occurrences
   - `handleEditCommitmentSession()` - Edits specific occurrences
   - Automatic study plan regeneration with session preservation

4. **scheduling.ts**
   - Updated `findNextAvailableTimeSlot()` to filter deleted occurrences
   - Updated `getDailyAvailableTimeSlots()` to handle modifications
   - Enhanced conflict detection for modified sessions

## User Experience

### How to Use

1. **View Calendar**: Navigate to the calendar tab
2. **Click on Commitment**: Click on any commitment event
3. **Manage Session**: Choose to edit or delete the specific occurrence
4. **Confirm Changes**: The system updates the schedule automatically

### Visual Feedback

- **Deleted Sessions**: Hidden from calendar view
- **Modified Sessions**: Show updated information (title, time, type)
- **Task Rescheduling**: Automatic redistribution into freed time slots
- **Session Preservation**: Done/skipped task sessions are maintained

## Benefits

### ✅ Flexibility
- Handle one-time schedule changes without losing recurring commitments
- Cancel specific classes or meetings without affecting future weeks
- Modify individual sessions for special circumstances

### ✅ Better Task Scheduling
- More available time slots when commitments are deleted
- Automatic task redistribution into freed time
- Improved conflict resolution for missed sessions

### ✅ Data Integrity
- Preserves recurring commitment structure
- Maintains task session status (done/skipped)
- Tracks modifications separately from original commitments

### ✅ User-Friendly
- Intuitive right-click interface
- Clear visual feedback
- Confirmation dialogs for destructive actions

## Example Use Cases

1. **Cancelled Class**: Delete a specific class occurrence, freeing up time for study
2. **Rescheduled Meeting**: Edit the time of a meeting on a particular day
3. **Special Event**: Modify a recurring commitment for a special occasion
4. **Buffer Time**: Delete buffer time on specific days when not needed

## Technical Benefits

- **Low Complexity**: Minimal changes to existing codebase
- **Backward Compatible**: Existing commitments work without modification
- **Performance**: Efficient filtering and caching of deleted/modified occurrences
- **Scalable**: Handles multiple modifications per commitment

## Future Enhancements

- **Bulk Operations**: Delete/edit multiple occurrences at once
- **Recurring Modifications**: Apply changes to multiple weeks
- **Conflict Detection**: Enhanced validation for modified sessions
- **Undo/Redo**: History of session modifications 