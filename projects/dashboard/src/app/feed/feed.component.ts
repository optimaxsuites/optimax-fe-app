import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit {
  @Input() userInfo: any = {};

  newTask: string = '';
  tasks: Array<{
    id: number;
    title: string;
    time?: string;
    description?: string;
    status?: string;
  }> = [];

  events: Array<{
    title: string;
    date: string;
    color?: string;
    iconColor?: string;
  }> = [];

  newPostText: string = '';
  feedPosts: Array<{
    id: number;
    author: string;
    authorInitials: string;
    avatarColor: string;
    role: string;
    timeAgo: string;
    content: string;
    image?: string;
    likes: number;
    shares: number;
    liked: boolean;
    showComments: boolean;
    newCommentText: string;
    commentList: Array<{
      id: number;
      author: string;
      authorInitials: string;
      avatarColor: string;
      text: string;
      timeAgo: string;
    }>;
  }> = [];

  // Outputs — emit upward so parent can open modals
  openPayslipModal() {
    // Parent listens via (openPayslipModal) output or you can use EventEmitter
  }

  openAttendanceModal() {
    // Parent listens via (openAttendanceModal) output or you can use EventEmitter
  }

  openTaskModal(task: any) {
    // Parent listens via (openTaskModal) output or you can use EventEmitter
  }

  ngOnInit(): void {
    this.loadTasks();
    this.loadEvents();
    this.loadFeedPosts();
  }

  // ===== TASKS =====

  loadTasks() {
    this.tasks = [
      {
        id: 1,
        title: 'Review daily sales report',
        time: '09:00',
        description: 'Check and validate daily sales figures',
        status: 'Pending',
      },
      {
        id: 2,
        title: 'Verify staff attendance',
        time: '10:30',
        description: 'Review attendance records for the week',
        status: 'Pending',
      },
      {
        id: 3,
        title: 'Prepare monthly report',
        time: '14:00',
        description: 'Compile data for monthly performance review',
        status: 'In Progress',
      },
    ];
  }

  addTask(title: string) {
    if (!title.trim()) return;
    const nextId = this.tasks.length
      ? Math.max(...this.tasks.map((t) => t.id)) + 1
      : 1;
    this.tasks.push({
      id: nextId,
      title: title.trim(),
      time: '09:00',
      description: '',
      status: 'Pending',
    });
    this.newTask = '';
  }

  removeTaskById(id: number) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }

  // ===== EVENTS =====

  loadEvents() {
    this.events = [
      {
        title: 'Quarterly Review Meeting',
        date: 'March 10, 2025',
        color: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Team Building Event',
        date: 'March 15, 2025',
        color: 'bg-orange-100',
        iconColor: 'text-orange-500',
      },
      {
        title: 'Monthly Audit',
        date: 'March 25, 2025',
        color: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
      },
    ];
  }

  // ===== FEED =====

  loadFeedPosts() {
    this.feedPosts = [
      {
        id: 1,
        author: 'Oyelere Olatoye',
        authorInitials: 'OO',
        avatarColor: '#6366f1',
        role: 'HR Manager',
        timeAgo: '2 hours ago',
        content:
          'Exciting news! We are happy to announce the new health benefit packages available for all employees starting next month. Check your internal portal for details.',
        likes: 24,
        shares: 8,
        liked: false,
        showComments: false,
        newCommentText: '',
        commentList: [
          {
            id: 1,
            author: 'Ogah Steve',
            authorInitials: 'OS',
            avatarColor: '#f59e0b',
            text: 'This is great news! Thanks for sharing, Toye.',
            timeAgo: '1 hour ago',
          },
          {
            id: 2,
            author: 'Michael Okafor',
            authorInitials: 'MO',
            avatarColor: '#10b981',
            text: 'Looking forward to reviewing the new packages!',
            timeAgo: '45 min ago',
          },
        ],
      },
      {
        id: 2,
        author: 'Akin Johnson',
        authorInitials: 'AJ',
        avatarColor: '#f59e0b',
        role: 'Product Lead',
        timeAgo: '5 hours ago',
        content:
          'Great session today on the Q3 roadmap! Thanks to everyone for the valuable feedback. 🚀',
        image: 'assets/images/meeting-placeholder.jpg',
        likes: 45,
        shares: 3,
        liked: false,
        showComments: false,
        newCommentText: '',
        commentList: [
          {
            id: 1,
            author: 'Jessica Damilola',
            authorInitials: 'JD',
            avatarColor: '#6366f1',
            text: 'Excellent work Akin! The roadmap looks solid.',
            timeAgo: '4 hours ago',
          },
        ],
      },
      {
        id: 3,
        author: 'Michael Okafor',
        authorInitials: 'MO',
        avatarColor: '#10b981',
        role: 'Finance Officer',
        timeAgo: '1 day ago',
        content:
          'Reminder: Q1 budget submissions are due this Friday. Please ensure all department heads have submitted their reports. Reach out if you need any assistance.',
        likes: 18,
        shares: 2,
        liked: false,
        showComments: false,
        newCommentText: '',
        commentList: [],
      },
    ];
  }

  onPostEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.submitPost();
    }
  }

  onCommentEnter(event: Event, post: any) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.submitComment(post);
    }
  }

  toggleLike(post: any) {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
  }

  toggleComments(post: any) {
    post.showComments = !post.showComments;
  }

  submitPost() {
    const text = this.newPostText.trim();
    if (!text) return;

    const name = this.userInfo?.username || this.userInfo?.fullname || 'You';
    const role = this.userInfo?.role || 'User';

    this.feedPosts.unshift({
      id: Date.now(),
      author: name,
      authorInitials: this.getUserInitials(),
      avatarColor: '#6366f1',
      role: role,
      timeAgo: 'Just now',
      content: text,
      likes: 0,
      shares: 0,
      liked: false,
      showComments: false,
      newCommentText: '',
      commentList: [],
    });
    this.newPostText = '';
  }

  submitComment(post: any) {
    const text = (post.newCommentText || '').trim();
    if (!text) return;

    const name = this.userInfo?.username || this.userInfo?.fullname || 'You';
    post.commentList.push({
      id: Date.now(),
      author: name,
      authorInitials: this.getUserInitials(),
      avatarColor: '#6366f1',
      text: text,
      timeAgo: 'Just now',
    });
    post.newCommentText = '';
  }

  getUserInitials(): string {
    const name = this.userInfo?.username || this.userInfo?.fullname || '';
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  autoGrow(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }
}
