import { Component, ViewEncapsulation, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-crm-ui-shell',
  templateUrl: './crm-ui-shell.component.html',
  styleUrls: ['./crm-ui-shell.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CrmUiShellComponent implements AfterViewInit, OnDestroy {
  private readonly SCRIPT_ID = 'crm-ui-shell-js';

  ngAfterViewInit(): void {
    this._injectScript();
  }

  ngOnDestroy(): void {
    document.getElementById(this.SCRIPT_ID)?.remove();
  }

  private _injectScript(): void {
    document.getElementById(this.SCRIPT_ID)?.remove();
    const script = document.createElement('script');
    script.id = this.SCRIPT_ID;
    script.textContent = CRM_UI_SHELL_JS;
    document.body.appendChild(script);
  }
}

const CRM_UI_SHELL_JS = `
// =========================================================
// OptimaX CRM — Interactive JavaScript
// =========================================================

// --- State ---
let currentTab = 'dashboard';
let currentGovTab = 'citizens';
let currentSettingsPanel = 'pipeline-config';
let sidebarOpen = true;
let dragSrcCard = null;

// --- Tab Navigation ---
function switchTab(tabId, btn) {
  // Hide all panels
  document.querySelectorAll('.crm-panel').forEach(p => p.style.display = 'none');
  // Deactivate all sidebar sub-items and top tabs
  document.querySelectorAll('.crm-sub-item').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.crm-tab').forEach(t => t.classList.remove('active'));
  // Show the target panel
  const panel = document.getElementById('panel-' + tabId);
  if (panel) panel.style.display = 'block';
  // Mark the sidebar sub-item active
  if (btn && btn.classList) {
    btn.classList.add('active');
  } else {
    const subBtn = document.getElementById('sub-' + tabId);
    if (subBtn) subBtn.classList.add('active');
  }
  // Also mark matching top tab if visible
  const topTab = document.querySelector('.crm-tab[onclick*="' + tabId + '"]');
  if (topTab) topTab.classList.add('active');
  currentTab = tabId;
}

function toggleCrmMenu() {
  const submenu = document.getElementById('crm-submenu');
  const chevron = document.getElementById('crm-chevron');
  if (submenu) submenu.classList.toggle('collapsed');
  if (chevron) chevron.style.transform = submenu.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
}

// --- Government Sub-tabs ---
function switchGovTab(tabId, btn) {
  document.querySelectorAll('.gov-tab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.gov-tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('gov-' + tabId);
  if (panel) panel.style.display = 'block';
  if (btn && btn.classList) btn.classList.add('active');
  currentGovTab = tabId;
}

// --- Settings Panel ---
function switchSettings(btn, panelId) {
  document.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('settings-' + panelId);
  if (panel) panel.style.display = 'block';
  if (btn && btn.classList) btn.classList.add('active');
  currentSettingsPanel = panelId;
}

// --- Contact 360° Sub-tabs ---
function switchC360Tab(btn, panelId) {
  document.querySelectorAll('.c360-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.c360-panel').forEach(p => p.style.display = 'none');
  btn.classList.add('active');
  const panel = document.getElementById(panelId);
  if (panel) panel.style.display = 'block';
}

// --- Drawer Management ---
function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (drawer) {
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (drawer) {
    drawer.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// --- Modal Management ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// --- Toast Notifications ---
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
  toast.className = 'toast toast-' + type;
  toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span><span class="toast-msg">' + message + '</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>';
  container.appendChild(toast);
  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));
  // Auto-dismiss
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// --- Sidebar Toggle ---
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const shell = document.getElementById('crmShell');
  sidebarOpen = !sidebarOpen;
  if (sidebarOpen) {
    sidebar.classList.remove('collapsed');
    shell.classList.remove('sidebar-collapsed');
  } else {
    sidebar.classList.add('collapsed');
    shell.classList.add('sidebar-collapsed');
  }
}

// --- Notification Dropdown ---
function toggleNotif() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

function markAllRead() {
  document.querySelectorAll('.notif-item.unread').forEach(n => n.classList.remove('unread'));
  const badge = document.querySelector('.notif-badge');
  if (badge) badge.style.display = 'none';
  showToast('All notifications marked as read', 'success');
}

// --- Global Search ---
function toggleSearch(input) {
  const dropdown = document.getElementById('searchDropdown');
  if (dropdown) {
    dropdown.style.display = (input.value.length > 0) ? 'block' : 'none';
  }
}

function closeSearch() {
  setTimeout(() => {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) dropdown.style.display = 'none';
  }, 200);
}

// --- Kanban Drag & Drop ---
function drag(event) {
  dragSrcCard = event.target.closest('.deal-card');
  if (dragSrcCard) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragSrcCard.innerHTML);
    dragSrcCard.style.opacity = '0.5';
  }
}

function allowDrop(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const col = event.target.closest('.kanban-col');
  if (col) col.style.background = '#f0fdf4';
}

function dragLeave(event) {
  const col = event.target.closest('.kanban-col');
  if (col) col.style.background = '';
}

function drop(event) {
  event.preventDefault();
  const targetCol = event.target.closest('.kanban-col');
  if (targetCol && dragSrcCard) {
    const cardList = targetCol.querySelector('.kanban-cards');
    if (cardList) {
      dragSrcCard.style.opacity = '1';
      cardList.appendChild(dragSrcCard);
      targetCol.style.background = '';
      // Update stage count
      updateKanbanCounts();
      showToast('Deal moved successfully!', 'success');
    }
  }
  dragSrcCard = null;
}

function dragEnd(event) {
  if (dragSrcCard) dragSrcCard.style.opacity = '1';
  document.querySelectorAll('.kanban-col').forEach(c => c.style.background = '');
  dragSrcCard = null;
}

function updateKanbanCounts() {
  document.querySelectorAll('.kanban-col').forEach(col => {
    const cards = col.querySelectorAll('.deal-card').length;
    const countEl = col.querySelector('.kanban-count');
    if (countEl) countEl.textContent = cards;
  });
}

// --- Filter & View toggles ---
function setView(view) {
  // Table/Card/Map toggle for Contacts
  document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('[data-view="' + view + '"]');
  if (btn) btn.classList.add('active');
  showToast('Switched to ' + view + ' view', 'info');
}

// --- Pipeline selector ---
function selectPipeline(btn) {
  document.querySelectorAll('.pipeline-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// --- Activity Type selector ---
function setActivityType(btn, type) {
  document.querySelectorAll('.activity-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// --- Campaign channel selector ---
function selectChannel(card, channel) {
  document.querySelectorAll('.channel-card').forEach(c => {
    c.style.border = '2px solid #e5e7eb';
    c.style.background = '';
  });
  card.style.border = '2px solid #25925B';
  card.style.background = '#f0fdf4';
}

// --- AI Assistant Chat ---
function sendAiMsg() {
  const input = document.getElementById('aiInput');
  if (!input || !input.value.trim()) return;
  const msg = input.value.trim();
  const feed = document.getElementById('aiChatFeed');
  if (!feed) return;

  // User message
  const userMsg = document.createElement('div');
  userMsg.style.cssText = 'text-align:right;margin:.5rem 0;';
  userMsg.innerHTML = '<span style="background:#25925B;color:#fff;padding:.4rem .8rem;border-radius:12px 12px 0 12px;font-size:.8rem;display:inline-block;max-width:85%;">' + msg + '</span>';
  feed.appendChild(userMsg);

  // AI response (after brief delay)
  setTimeout(() => {
    const aiMsg = document.createElement('div');
    aiMsg.style.cssText = 'text-align:left;margin:.5rem 0;';

    let response = '';
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('deal') || lowerMsg.includes('pipeline')) {
      response = '📊 You have 38 active deals totaling ₦342M. Top deal: Dangote ERP Expansion (₦45M, 78% probability). 3 deals need follow-up today.';
    } else if (lowerMsg.includes('lead') || lowerMsg.includes('prospect')) {
      response = '🎯 62 active leads this month. AI score >70: 18 leads. Top recommendation: Contact Emeka Okonkwo (score 91) — opened proposal 5× this week.';
    } else if (lowerMsg.includes('revenue') || lowerMsg.includes('forecast')) {
      response = '💰 Current forecast: ₦34M vs ₦50M quota (68%). To hit target: close Dangote (₦45M) + 2 pending deals. Q3 on track if Negotiation stage moves this week.';
    } else if (lowerMsg.includes('overdue') || lowerMsg.includes('stale')) {
      response = '⚠️ 5 deals are stale (>14 days without activity): Ecobank Suite (18d), Kogi Permit (22d), Delta Health (16d). Want me to draft follow-up messages?';
    } else if (lowerMsg.includes('campaign')) {
      response = '📧 Active campaigns: 3. Best performing: "Q2 Renewal Drive" (38% open rate, 12% reply). WhatsApp campaign reaches 847 contacts with 91% delivery.';
    } else {
      response = '🤖 I can help with deal analysis, lead scoring, pipeline forecasting, activity reminders, and campaign performance. What would you like to know?';
    }

    aiMsg.innerHTML = '<span style="background:#f3f4f6;color:#111827;padding:.4rem .8rem;border-radius:12px 12px 12px 0;font-size:.8rem;display:inline-block;max-width:85%;">' + response + '</span>';
    feed.appendChild(aiMsg);
    feed.scrollTop = feed.scrollHeight;
  }, 700);

  input.value = '';
  feed.scrollTop = feed.scrollHeight;
}

// --- Key listener for AI chat ---
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    // Close open drawers/modals
    document.querySelectorAll('.drawer-overlay.active').forEach(d => {
      d.classList.remove('active');
    });
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
    // Close search & notif dropdowns
    const sd = document.getElementById('searchDropdown');
    if (sd) sd.style.display = 'none';
    const nd = document.getElementById('notifDropdown');
    if (nd) nd.classList.remove('show');
  }
});

// Close notif dropdown when clicking outside
document.addEventListener('click', function(e) {
  const notifDropdown = document.getElementById('notifDropdown');
  if (notifDropdown && !e.target.closest('.notif-wrapper')) {
    notifDropdown.classList.remove('show');
  }
});

// --- Settings: Custom field type change ---
function updateFieldOptions(select) {
  const type = select.value;
  // Could expand options based on type — placeholder for demo
}

// --- Kanban add card ---
function addKanbanCard(colId) {
  const col = document.getElementById(colId);
  if (!col) return;
  const cardList = col.querySelector('.kanban-cards');
  if (!cardList) return;
  const name = prompt('Deal name:');
  if (!name) return;
  const value = prompt('Deal value (₦):') || '0';
  const card = document.createElement('div');
  card.className = 'deal-card';
  card.setAttribute('draggable', 'true');
  card.setAttribute('ondragstart', 'drag(event)');
  card.setAttribute('ondragend', 'dragEnd(event)');
  card.innerHTML = \`
    <div class="deal-title">\${name}</div>
    <div class="deal-value">₦\${Number(value).toLocaleString()}</div>
    <div class="deal-meta" style="margin-top:.4rem;display:flex;justify-content:space-between;">
      <span class="score-pill" style="background:#f0fdf4;color:#15803d;">New</span>
      <span style="font-size:.7rem;color:#9ca3af;">Just now</span>
    </div>
  \`;
  cardList.appendChild(card);
  updateKanbanCounts();
  showToast('Deal "' + name + '" added!', 'success');
}

// --- Init on DOM ready ---
document.addEventListener('DOMContentLoaded', function() {
  // Ensure dashboard is the default active panel
  switchTab('dashboard');

  // Set up kanban drag & drop listeners on columns
  document.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover', allowDrop);
    col.addEventListener('dragleave', dragLeave);
    col.addEventListener('drop', drop);
  });

  // Set up deal card drag listeners
  document.querySelectorAll('.deal-card').forEach(card => {
    card.addEventListener('dragstart', drag);
    card.addEventListener('dragend', dragEnd);
  });

  // AI chat enter key
  const aiInput = document.getElementById('aiInput');
  if (aiInput) {
    aiInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAiMsg();
      }
    });
  }

  // Animate stat cards on load
  document.querySelectorAll('.stat-card, .kpi-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    setTimeout(() => {
      card.style.transition = 'opacity .35s ease, transform .35s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, i * 60);
  });

  console.log('%c🚀 OptimaX CRM Mockup loaded', 'color:#25925B;font-size:14px;font-weight:bold;');
  console.log('%c16 modules | Drag-and-drop Kanban | AI insights | Gov module | NDPA compliance', 'color:#6b7280;font-size:11px;');
});

// --- Saved Views sidebar ---
function applyView(viewName) {
  showToast('View "' + viewName + '" applied', 'info');
  // In a real CRM, this would filter the contact table
}

// --- Bulk actions ---
function bulkAction(action) {
  const count = document.querySelectorAll('.bulk-bar-count').length || 3;
  const messages = {
    assign: 'Assign to rep opened',
    email: 'Batch email composer opened',
    export: '3 contacts exported to CSV',
    tag: 'Tag editor opened',
    delete: 'Delete confirmation required'
  };
  showToast(messages[action] || action, 'info');
}

// --- Settings: Toggle switch ---
function toggleSwitch(el) {
  el.classList.toggle('on');
  const label = el.nextElementSibling;
  if (label) label.textContent = el.classList.contains('on') ? 'Active' : 'Paused';
}

// --- Deal rotting animation check ---
function checkDealRot() {
  document.querySelectorAll('.deal-card').forEach(card => {
    const rotBadge = card.querySelector('.rot-badge');
    if (rotBadge) {
      const days = parseInt(rotBadge.textContent);
      if (days > 20) {
        card.style.borderLeft = '3px solid #ef4444';
      } else if (days > 10) {
        card.style.borderLeft = '3px solid #f59e0b';
      }
    }
  });
}

// --- Quota progress gauge update ---
function updateGauge(percent) {
  const circle = document.querySelector('.gauge-progress');
  if (!circle) return;
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
}

// --- Nigeria map click ---
function selectMapPin(state, deals, value) {
  showToast(state + ': ' + deals + ' deals · ' + value, 'info');
}

// --- SLA progress live update ---
function updateSLABars() {
  document.querySelectorAll('.sla-bar-fill').forEach(bar => {
    const pct = parseInt(bar.style.width);
    if (pct >= 90) {
      bar.style.background = '#ef4444';
    } else if (pct >= 70) {
      bar.style.background = '#f59e0b';
    } else {
      bar.style.background = '#22c55e';
    }
  });
}

// Simulate live data refresh every 45 seconds
setInterval(() => {
  const badge = document.querySelector('.notif-badge');
  if (badge && Math.random() > 0.7) {
    const current = parseInt(badge.textContent) || 0;
    badge.textContent = current + 1;
  }
}, 45000);
`;
