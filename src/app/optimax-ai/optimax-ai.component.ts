import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from "../../../node_modules/@angular/common/index";

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

@Component({
  selector: 'app-optimaxai',
  templateUrl: './optimax-ai.component.html',
  styleUrls: ['./optimax-ai.component.scss'],
})
export class OptimaxaiComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  userInfo: any = {};
  newChatMessage = '';
  aiTyping = false;
  activeChatId = 'session-1';

  chatSessions: ChatSession[] = [
    {
      id: 'session-1',
      title: 'ERP-HR',
      messages: [
        { sender: 'ai', text: 'Hello Sheba! How can I assist you with your administrative tasks today?', time: 'AI Assistant • 09:12 AM' },
        { sender: 'user', text: 'Show me my task overview for this week.', time: 'You • 09:15 AM' },
        { sender: 'ai', text: 'Here are your tasks overview for this week, based on everything already in motion:\nThis Week Focus:\nFinalize UI direction for Communication\nFinalize UI direction for OptimaXAI\nGet design approval before moving to build', time: 'AI Assistant • 09:15 AM' },
        { sender: 'user', text: 'How are you', time: 'You • 09:18 AM' },
        { sender: 'ai', text: "I'm functioning properly. What are you working on today?", time: 'AI Assistant • 09:18 AM' },
      ]
    },
    { id: 'session-2', title: 'Best ERP Software in the market', messages: [] },
    { id: 'session-3', title: 'Market research', messages: [] },
    { id: 'session-4', title: 'ERP-HR', messages: [] },
  ];

  aiSuggestions = ['Summarize tasks', 'Draft email', 'Check schedule'];

  private aiResponsePool = [
    'Sure! I can help you with that. Let me pull up the relevant information for you.',
    'You have 3 priority tasks remaining today: a sales report review, staff attendance check, and a monthly report.',
    "Your attendance record for this week looks great — you've been present all 3 days so far.",
    "I've drafted a quick email summary. Would you like me to adjust the tone or add any details?",
    'Based on your schedule, your next event is the Quarterly Review Meeting on March 10, 2025.',
    'Your payslips for January and February are available. March is still pending processing.',
  ];

  ngOnInit() {
    this.loadUserInfo();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadUserInfo() {
    const raw = sessionStorage.getItem('userprimaryinfodata');
    if (raw) { try { this.userInfo = JSON.parse(raw); } catch {} }
  }

  getUserInitials(): string {
    const name = this.userInfo.username || this.userInfo.fullname || '';
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  get activeSession(): ChatSession | undefined {
    return this.chatSessions.find(s => s.id === this.activeChatId);
  }

  get activeMessages(): ChatMessage[] {
    return this.activeSession?.messages || [];
  }

  selectSession(id: string) {
    this.activeChatId = id;
  }

  newChat() {
    const id = 'session-' + Date.now();
    this.chatSessions.unshift({ id, title: 'New Chat', messages: [] });
    this.activeChatId = id;
  }

  sendMessage(text: string) {
    if (!text?.trim()) return;
    const session = this.activeSession;
    if (!session) return;

    const now = new Date();
    const timeStr = `You • ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // Auto-title session on first message
    if (session.messages.length === 0) {
      session.title = text.trim().substring(0, 30) + (text.length > 30 ? '...' : '');
    }

    session.messages.push({ sender: 'user', text: text.trim(), time: timeStr });
    this.newChatMessage = '';
    this.aiTyping = true;

    setTimeout(() => {
      this.aiTyping = false;
      const response = this.getAIResponse(text);
      const aiTime = `AI Assistant • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      session.messages.push({ sender: 'ai', text: response, time: aiTime });
    }, 1200 + Math.random() * 800);
  }

  private getAIResponse(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes('task') || m.includes('summarize')) return 'Here are your tasks overview for this week:\nFinalize UI direction for Communication\nFinalize UI direction for OptimaXAI\nGet design approval before moving to build';
    if (m.includes('attendance')) return 'Your attendance record looks great this week. You have been marked Present for Monday, Tuesday, and Wednesday.';
    if (m.includes('payslip') || m.includes('salary')) return 'Your payslips for January and February 2025 are available. March is still pending processing.';
    if (m.includes('email') || m.includes('draft')) return 'I can help you draft an email. Could you provide more details — who is it for and what is the main message?';
    return this.aiResponsePool[Math.floor(Math.random() * this.aiResponsePool.length)];
  }

  private scrollToBottom() {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
}