import { Component, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Channel {
  id: string;
  name: string;
  unread?: number;
}

interface FeedPost {
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
  commentCount: number;
  comments: Comment[];
}

interface Comment {
  id: number;
  author: string;
  authorInitials: string;
  avatarColor: string;
  text: string;
  timeAgo: string;
}

@Component({
  selector: 'app-communication',
  templateUrl: './communication.component.html',
  styleUrls: ['./communication.component.scss']
})
export class CommunicationComponent implements OnInit {
  // User info
  userInfo: any = {};
  getUserInitials(): string {
    const name = this.userInfo.username || this.userInfo.fullname || '';
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  // Channels
  channels: Channel[] = [
    { id: 'erp-hr', name: 'ERP-HR', unread: 2 },
    { id: 'sales', name: 'SALES' },
    { id: 'media', name: 'MEDIA' },
    { id: 'announcements', name: 'ANNOUNCEMENTS', },
    { id: 'casual', name: 'CASUAL' },
  ];
  newChannelName = '';
  activeChannelId = 'erp-hr';

  get activeChannel(): Channel | undefined {
    return this.channels.find(c => c.id === this.activeChannelId);
  }

  // Feed posts per channel (keyed by channel id)
  channelPosts: Record<string, FeedPost[]> = {};

  get activePosts(): FeedPost[] {
    return this.channelPosts[this.activeChannelId] || [];
  }

  // New post
  newPostText = '';

  // Right panel (comment thread)
  selectedPost: FeedPost | null = null;
  newCommentText = '';
  showCommentPanel = false;

  ngOnInit() {
    this.loadUserInfo();
    this.initPosts();
  }

  loadUserInfo() {
    const raw = sessionStorage.getItem('userprimaryinfodata');
    if (raw) {
      try { this.userInfo = JSON.parse(raw); } catch {}
    }
  }

  initPosts() {
    this.channelPosts = {
      'erp-hr': [
        {
          id: 1,
          author: 'Bukayo Saka',
          authorInitials: 'BS',
          avatarColor: '#6366f1',
          role: 'HR Manager',
          timeAgo: '2 hours ago',
          content: 'Exciting news! We are happy to announce the new health benefit packages available for all employees starting next month. Check your internal portal for details.',
          likes: 24, shares: 8, liked: false, commentCount: 12,
          comments: [
            { id: 1, author: 'Aitana Bonmati', authorInitials: 'AB', avatarColor: '#f59e0b', text: 'Good work on that and congratulations on your achievement', timeAgo: '1 hour ago' },
            { id: 2, author: 'Mikel Obi', authorInitials: 'MO', avatarColor: '#10b981', text: 'Good work on that and congratulations on your achievement', timeAgo: '5 mins ago' },
          ]
        },
        {
          id: 2,
          author: 'Aitana Bonmati',
          authorInitials: 'AB',
          avatarColor: '#f59e0b',
          role: 'Product Lead',
          timeAgo: '5 hours ago',
          content: 'Great session today on the Q3 roadmap! Thanks to everyone for the valuable feedback. 🚀',
          image: 'assets/images/meeting-placeholder.jpg',
          likes: 45, shares: 3, liked: false, commentCount: 5,
          comments: []
        },
        {
          id: 3,
          author: 'Ademola Lookman',
          authorInitials: 'AL',
          avatarColor: '#10b981',
          role: 'HR Manager',
          timeAgo: '2 hours ago',
          content: 'Exciting news! We are happy to announce the new health benefit packages available for all employees starting next month. Check your internal portal for details.',
          likes: 24, shares: 8, liked: false, commentCount: 12,
          comments: []
        }
      ],
      'sales': [
        {
          id: 1,
          author: 'Michael Okafor',
          authorInitials: 'MO',
          avatarColor: '#10b981',
          role: 'Sales Lead',
          timeAgo: '1 day ago',
          content: 'Q1 numbers are looking strong! We are on track to exceed our targets by 15%. Great work team.',
          likes: 31, shares: 4, liked: false, commentCount: 3,
          comments: []
        }
      ],
      'media': [],
      'announcements': [
        {
          id: 1,
          author: 'Admin',
          authorInitials: 'AD',
          avatarColor: '#6366f1',
          role: 'System Admin',
          timeAgo: '3 hours ago',
          content: 'System maintenance scheduled for Friday 8 PM. Please save all your work before then.',
          likes: 8, shares: 1, liked: false, commentCount: 0,
          comments: []
        }
      ],
      'casual': []
    };
  }

  selectChannel(id: string) {
    this.activeChannelId = id;
    const ch = this.channels.find(c => c.id === id);
    if (ch) ch.unread = 0;
    this.selectedPost = null;
    this.showCommentPanel = false;
  }

  addChannel() {
    const name = this.newChannelName.trim().toUpperCase();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (this.channels.find(c => c.id === id)) return;
    this.channels.push({ id, name });
    this.channelPosts[id] = [];
    this.newChannelName = '';
  }

  removeChannel(id: string) {
    this.channels = this.channels.filter(c => c.id !== id);
    if (this.activeChannelId === id) {
      this.activeChannelId = this.channels[0]?.id || '';
    }
  }

  submitPost() {
    const text = this.newPostText.trim();
    if (!text) return;
    const post: FeedPost = {
      id: Date.now(),
      author: this.userInfo.fullname || this.userInfo.username || 'You',
      authorInitials: this.getUserInitials(),
      avatarColor: '#6366f1',
      role: this.userInfo.role || 'User',
      timeAgo: 'Just now',
      content: text,
      likes: 0, shares: 0, liked: false, commentCount: 0,
      comments: []
    };
    if (!this.channelPosts[this.activeChannelId]) {
      this.channelPosts[this.activeChannelId] = [];
    }
    this.channelPosts[this.activeChannelId].unshift(post);
    this.newPostText = '';
  }

  toggleLike(post: FeedPost) {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
  }

  openComments(post: FeedPost) {
    if (this.selectedPost?.id === post.id && this.showCommentPanel) {
      this.showCommentPanel = false;
      this.selectedPost = null;
    } else {
      this.selectedPost = post;
      this.showCommentPanel = true;
      this.newCommentText = '';
    }
  }

  submitComment() {
    if (!this.newCommentText.trim() || !this.selectedPost) return;
    const comment: Comment = {
      id: Date.now(),
      author: this.userInfo.fullname || 'You',
      authorInitials: this.getUserInitials(),
      avatarColor: '#6366f1',
      text: this.newCommentText.trim(),
      timeAgo: 'Just now'
    };
    this.selectedPost.comments.push(comment);
    this.selectedPost.commentCount++;
    this.newCommentText = '';
  }

  autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  onPostEnter(e: Event) {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { e.preventDefault(); this.submitPost(); }
  }

  closeCommentPanel() {
    this.showCommentPanel = false;
    this.selectedPost = null;
  }
}