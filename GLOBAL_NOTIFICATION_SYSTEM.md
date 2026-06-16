# Global Notification System Architecture

## Overview
The OptimaX application uses a centralized notification system managed by the `HeaderStateService` that collects notifications and message previews from various sources across the application and displays them in the top navigation bar.

---

## Key Components

### 1. **HeaderStateService** (`src/app/ui/shared/service/header-state.service.ts`)
Central hub for managing all notifications and messages shown in the header.

**Key Responsibilities:**
- Maintains a `BehaviorSubject` (`state$`) with the current notification state
- Stores notifications in `sessionStorage` for persistence across page reloads
- Exposes `view$` observable for subscribers to listen to notification changes
- Manages unread counts and badges

**Core Methods:**
```typescript
pushNotification(item): void                    // Add new notification to header
pushMessagePreview(item): void                   // Add message preview
markNotificationRead(notificationId): void       // Mark single notification as read
markAllNotificationsRead(): void                 // Mark all as read
clearAllNotifications(): void                    // Clear all notifications
```

**Data Model:**
```typescript
interface HeaderNotificationItem {
  id: string;                           // Auto-generated ID
  title: string;                        // Notification title
  body: string;                         // Notification body
  category: 'chat' | 'feed' | 'module' | 'system';  // Type
  createdAt: number;                    // Timestamp
  read: boolean;                        // Read status
  route?: string;                       // Navigation route
  avatarUrl?: string;                   // User/source avatar
  contextLabel?: string;                // Context (e.g., "Direct message")
  workspaceMode?: 'feed' | 'chat';     // Workspace context
  // Additional fields for routing chat/task notifications...
}
```

---

## How Notifications Flow

### **1. ChatRealtimeNotifierService** (WebSocket-based)
**File:** `src/app/ui/shared/service/chat-realtime-notifier.service.ts`

- **Listens for:** Real-time chat messages via STOMP WebSocket
- **When message arrives:**
  1. Parses incoming message from WebSocket frame
  2. Validates message against channel snapshot
  3. Calls `publishIncomingNotification()` → **calls `headerStateService.pushMessagePreview()`**

**Example Flow:**
```
WebSocket Message → parseIncoming() → loadVerifiedIncomingMessage() 
→ publishIncomingNotification() → headerStateService.pushMessagePreview()
```

**Toast Display:** If user is on app but not in communications page, also shows PrimeNG toast:
```typescript
this.messageService.add({
  key: 'tf',
  severity: 'info',
  summary: resolved.title,
  detail: resolved.detail,
  life: 4000,
});
```

### **2. CommunicationComponent** (Feed notifications)
**File:** `projects/dashboard/src/app/communication/communication.component.ts`

- **Listens for:** Feed notifications from collaboration service
- **When notification arrives:**
  1. Filters out already-seen notifications (tracked in `seenFeedNotificationIds`)
  2. Calls `publishFeedNotification()` → **calls `headerStateService.pushNotification()`**

**Example:**
```typescript
private publishFeedNotification(notification: CollabFeedNotification): void {
  this.headerStateService.pushNotification({
    title: `${this.feedAuthorName(notification.actor)} mentioned everyone`,
    body: notification.body || notification.title || '@all notification',
    category: 'feed',
    route: `/admin/dashboard/communications/${this.me.userId}`,
    avatarUrl: this.feedAuthorAvatarUrl(notification.actor),
    contextLabel: 'Enterprise feed',
    workspaceMode: 'feed',
  });
}
```

### **3. FeedComponent** (Manual feed notifications)
**File:** `projects/dashboard/src/app/feed/feed.component.ts`

- Various feed actions push notifications directly via `headerStateService.pushNotification()`
- Examples: mentions, comments, share activity, etc.

---

## Display in Top Nav Header

### **NavbarComponent** (`src/app/ui/shared/view/navbar/navbar.component.ts`)

**Initialization:**
```typescript
ngOnInit() {
  // Subscribe to header state changes
  this.headerSub = this.headerStateService.view$.subscribe((state) => {
    this.notifications = state.notifications;           // All notifications
    this.messagePreviews = state.messagePreviews;       // Message previews
    this.unreadMessages = state.messagePreviews.filter((entry) => !entry.read).length;
    this.unreadNotifications = state.unreadNotifications;
  });
}
```

**Getters for UI:**
```typescript
get latestNotifications(): HeaderNotificationItem[]      // Last 5 notifications
get unreadNotificationItems(): HeaderNotificationItem[]  // Only unread ones
get latestMessagePreviews(): HeaderMessagePreviewItem[]  // Last 5 messages
```

**UI Elements:**
- **Bell icon** with badge showing `unreadNotifications` count
- **Overlay panel** with two tabs:
  1. **Messages** - Recent direct/channel messages (max 5 + "Open chat workspace" button)
  2. **Notifications** - Live updates across collaboration and modules (max 5 + "View all updates" button)

---

## Key Features

### **Deduplication for Messages**
Messages with same channel, DM user, and message ID are deduplicated:
```typescript
const key = `${nextItem.channelBackendId || 'dm'}-${nextItem.dmUserId || 'user'}-${nextItem.messageBackendId || nextItem.id}`;
const deduped = existing.filter((entry) => {
  const entryKey = `${entry.channelBackendId || 'dm'}-${entry.dmUserId || 'user'}-${entry.messageBackendId || entry.id}`;
  return entryKey !== key;
});
```

### **Storage Persistence**
- Notifications stored in `sessionStorage` under key `'optimax_header_state'`
- Survives page reloads during same session
- Auto-sanitized when retrieved

### **Unread Tracking**
- Calculated dynamically: `unreadNotifications = notifications.filter(n => !n.read).length`
- Updates in real-time as notifications are marked read

### **Browser Notifications**
- If user is away (document not visible) and permission granted:
  - Desktop notification shown via Notification API
  - Clicking notification opens app and navigates to target

### **Max Items**
- **Notifications:** Max 25 stored in state (shown 5 in header)
- **Messages:** Max 20 stored in state (shown 5 in header)

---

## Notification Categories

1. **chat** - Real-time chat messages
2. **feed** - Enterprise feed mentions/updates
3. **module** - Module-specific events (HR, accounting, etc.)
4. **system** - System-wide notifications

---

## How to Add New Notifications

From any service/component, inject `HeaderStateService` and call:

```typescript
this.headerStateService.pushNotification({
  title: 'Your title here',
  body: 'Your message here',
  category: 'module',  // or 'chat', 'feed', 'system'
  route: '/path/to/navigate',
  avatarUrl: 'url/to/avatar.jpg',
  contextLabel: 'Context name',
  workspaceMode: 'feed',  // optional
});
```

The notification will:
1. Immediately appear in the header bell icon
2. Be stored in sessionStorage
3. Show up in the notification panel
4. Increment unread count badge
5. Persist until marked as read or cleared
