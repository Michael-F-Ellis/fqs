# YTPDF Design

### Purpose
This document is intended to summarize the design of the YTPDF web application.  In particular, it is intended provide context for my AI coding assistant by describing the architecture of the application, the technologies used, and the design decisions made.

### About the Application
The app is a musician's tool for studying and performing from PDF sheet music.  Its most notable feature is allowing the user to link a YouTube video id and timestamps to specific points in the score.  This allows the user to click an icon beside a line of printed music and hear a recorded performance starting at that line. 

The app also supports building a table of contents for the score, which is useful for navigating the long scores and/or collections of scores. 

Another feature, not yet implemented, is the ability to add text annotations to the score.  Most musicians have a personal shorthand for indicating dynamics, articulations, and other markings that may not printed in the score.  This feature will allow the user to add these annotations to the score. It's common for conductors to dictate such annotations during rehearsals and it's therefore important that the musician be able to quickly and easily add them to the score.

### Application Modes
The app must support several different modes of usage.  These modes are:
1. **Performance**: In this mode, the musician is performing the score for an audience. The app must be absolutely guaranteed not to play any audio while the musician is performing. That would be a disaster. The app should hide the YouTube icons but display the markings and the table of contents should be available, but not visible unless the musician explicitly clicks a button to display it. Navigation should be easy and intuitive and reliable, particularly with regard to moving to the next page of the score.
Adding or editing annotations is not allowed in this mode. This should be the default mode when the app is launched.
2. **Group rehearsal**: In this mode, the musician is rehearsing with a group of musicians.  The app should allow the user to add and edit text annotations.  The table of contents should be visible and the YouTube icons should be hidden. As with performance mode, the app must remain silent. The app should allow the user to navigate the score with ease.
3. **Individual rehearsal**: In this mode, the musician is rehearsing alone and focused on learning the music. The table of contents should be available and the YouTube icons shown and active.  The app should allow the user to navigate the score with ease. To reduce distractions, entering an edit mode should require the user to explicitly click a button to enter it.
4. **Editing**: In this mode, the musician is editing or deleting existing annotations.  The table of contents should be available. The YouTube icons and text icons should be visible. Clicking any of them will bring up a dialog box for editing.  The app should allow the user to navigate the score with ease. Note that this may be a "spring-loaded" mode activated by a long touch or mouse-down while in "Marking" mode (see below).
5. **Marking**: In this mode, the musician is marking up the score, adding YouTube id's and timestamps for playback initiation or adding text annotations. The emphasis here should be on ease of use, i.e. the default response to a click within the score should be to add a speaker icon and pop up a dialog box for entering the timestamp and play rate.

### App Modes Summary

- **Performance Mode**: For live performance. No audio playback, hidden YouTube icons, TOC available on demand, no annotation editing. Default mode when app is launched.
- **Group Rehearsal Mode**: For group practice. Silent operation, visible TOC, hidden YouTube icons, annotation editing enabled
- **Individual Rehearsal Mode**: For solo practice. Active YouTube features, visible TOC, edit mode requires explicit activation
- **Editing Mode**: For modifying existing content. All icons visible, dialog boxes for editing, may be spring-loaded from Marking mode
- **Marking Mode**: For adding new content. Quick access to add YouTube timestamps and annotations with dialog boxes

## Mode icons
- Performance Mode: 🎭
- Group Rehearsal Mode: 👥
- Individual Rehearsal Mode: 🎧
- Editing Mode: 🖊️
- Marking Mode: ➕

## Cursors
Normal pointer cursor in Performance Mode, Group Rehearsal Mode, Individual Rehearsal Mode.

For Editing Mode, use a pencil cursor.
For Marking Mode, use a plus cursor.

# Areas for Enhancement
From code review by Cody 1/12/25

## State Management
- Implement dedicated state management system for mode transitions and UI updates
- Add pub/sub pattern or state machine for mode changes

## UI/UX Enhancements 
- Add keyboard shortcuts for page navigation and mode switching
- Implement touch gestures for mobile/tablet users
- Add visual feedback for page transitions
- Create prominent mode indicator beyond toolbar icons

## Code Organization
- Split YTPDFViewer class into focused components:
  - PDF rendering logic
  - YouTube integration 
  - Annotation management
  - Mode management
  - Dialog system

## Error Handling & Recovery
- Add error boundaries
- Implement auto-save for annotations
- Add validation for YouTube IDs and timestamps
- Improve error messages and user feedback

## Performance Optimizations
- Implement PDF page caching
- Lazy load components and features
- Optimize SVG overlay rendering
- Use requestAnimationFrame for animations

## Testing & Maintainability
- Add unit tests for core functionality
- Implement end-to-end testing
- Add TypeScript support
- Document key methods and components

## Accessibility
- Add ARIA labels and roles
- Implement keyboard navigation
- Improve color contrast
- Add screen reader support

## Modern Web Features
- Use Web Components for encapsulation
- Implement service workers for offline support
- Add PWA capabilities
- Use CSS Grid/Flexbox for layouts