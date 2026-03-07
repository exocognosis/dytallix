'use client';

import {
  type ChangeEvent,
  type FormEvent,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

import { withBasePath } from '@/lib/base-path';
import ThemeToggle from '@/components/theme-toggle';
import type {
  CalendarEvent,
  Contact,
  EmailMessage,
  Industry,
  PipelineStage,
  Task,
  TaskPriority,
  User,
  UserRole,
} from '@/types';

type DashboardTab = 'overview' | 'contacts' | 'tasks' | 'inbox' | 'calendar' | 'team';

interface GoogleStatus {
  connected: boolean;
  email: string | null;
  hasGmail: boolean;
  hasCalendar: boolean;
  hasTasks: boolean;
}

interface DashboardClientProps {
  currentUser: User;
  initialNotice?: string;
  initialError?: string;
}

interface ListResponse<T> {
  data: T[];
}

interface ContactResponse extends ListResponse<Contact> {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface EmailResponse extends ListResponse<EmailMessage> {
  sync?: { synced: number; total: number } | null;
}

interface CalendarResponse extends ListResponse<CalendarEvent> {
  sync?: { synced: number; updated: number } | null;
}

interface TaskSyncResponse {
  synced: number;
  created: number;
  updated: number;
  lists: number;
}

interface ContactImportResponse {
  imported: number;
  skipped: number;
  total: number;
  warnings: string[];
}

const tabs: Array<{ id: DashboardTab; label: string; note: string }> = [
  { id: 'overview', label: 'Overview', note: 'Revenue posture' },
  { id: 'contacts', label: 'Contacts', note: 'Pipeline accounts' },
  { id: 'tasks', label: 'Tasks', note: 'Execution queue' },
  { id: 'inbox', label: 'Inbox', note: 'Gmail sync' },
  { id: 'calendar', label: 'Calendar', note: 'Meetings' },
  { id: 'team', label: 'Team', note: 'Access control' },
];

const stageWeights: Record<PipelineStage, number> = {
  prospect: 0.1,
  discovery: 0.2,
  exposure_assessment: 0.35,
  poc_pilot: 0.55,
  proposal_sent: 0.7,
  negotiation: 0.85,
  closed_won: 1,
  closed_lost: 0,
};

const stageOptions: PipelineStage[] = [
  'prospect',
  'discovery',
  'exposure_assessment',
  'poc_pilot',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost',
];

const industryOptions: Industry[] = [
  'finserv',
  'healthcare',
  'gov_defense',
  'energy',
  'high_tech',
  'crypto_web3',
];

const taskPriorityOptions: TaskPriority[] = ['urgent', 'high', 'normal', 'low'];

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function prettyLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toLocalInputValue(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function createDefaultEventWindow(hoursFromNow: number, durationHours: number) {
  const start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  return {
    startTime: toLocalInputValue(start),
    endTime: toLocalInputValue(end),
  };
}

export default function DashboardClient({
  currentUser,
  initialNotice = '',
  initialError = '',
}: DashboardClientProps) {
  const defaultUserForm = {
    name: '',
    email: '',
    password: '',
    role: 'rep' as UserRole,
    active: true,
  };
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({
    connected: false,
    email: null,
    hasGmail: false,
    hasCalendar: false,
    hasTasks: false,
  });
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState(initialNotice);
  const [error, setError] = useState(initialError);
  const [contactSearch, setContactSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  const [contactForm, setContactForm] = useState({
    name: '',
    title: 'CISO',
    company: '',
    industry: 'high_tech' as Industry,
    email: '',
    phone: '',
    stage: 'prospect' as PipelineStage,
    quantum_risk: 3,
    deal_value: '',
    next_follow_up: '',
    notes: '',
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    due_date: '',
    priority: 'normal' as TaskPriority,
    contact_id: '',
  });
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: '',
  });
  const [eventForm, setEventForm] = useState(() => ({
    title: '',
    description: '',
    location: '',
    attendees: '',
    ...createDefaultEventWindow(24, 1),
  }));
  const [userForm, setUserForm] = useState({
    ...defaultUserForm,
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const contactImportInputRef = useRef<HTMLInputElement | null>(null);

  const deferredContactSearch = useDeferredValue(contactSearch);
  const activeDeals = contacts.filter(
    (contact) => contact.stage !== 'closed_won' && contact.stage !== 'closed_lost'
  );
  const urgentTasks = tasks.filter((task) => !task.completed);
  const pipelineValue = activeDeals.reduce((sum, contact) => sum + (contact.deal_value || 0), 0);
  const weightedForecast = activeDeals.reduce(
    (sum, contact) => sum + (contact.deal_value || 0) * stageWeights[contact.stage],
    0
  );
  const deferredQuery = deferredContactSearch.trim().toLowerCase();
  const filteredContacts = activeDeals.filter((contact) => {
    if (!deferredQuery) {
      return true;
    }

    return [contact.name, contact.company, contact.email || '']
      .join(' ')
      .toLowerCase()
      .includes(deferredQuery);
  });
  const userLabelById = new Map(users.map((user) => [user.id, user.name]));
  const contactLabelById = new Map(contacts.map((contact) => [contact.id, contact.name]));
  const manageableUsers = users.filter((user) => user.role !== 'admin');

  function resetUserForm() {
    setEditingUserId(null);
    setUserForm(defaultUserForm);
  }

  async function apiRequest<T>(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);

    if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(withBasePath(path), {
      cache: 'no-store',
      ...init,
      headers,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(payload.error || 'Request failed');
    }

    return payload as T;
  }

  async function loadDashboard() {
    setLoading(true);

    try {
      const [contactsPayload, tasksPayload, usersPayload, gmailPayload, emailsPayload, eventsPayload] =
        await Promise.all([
          apiRequest<ContactResponse>('/api/contacts?per_page=100'),
          apiRequest<ListResponse<Task>>('/api/tasks?completed=false'),
          apiRequest<ListResponse<User>>('/api/users'),
          apiRequest<GoogleStatus>('/api/auth/gmail/status'),
          apiRequest<EmailResponse>('/api/emails'),
          apiRequest<CalendarResponse>('/api/calendar'),
        ]);

      setContacts(contactsPayload.data || []);
      setTasks(tasksPayload.data || []);
      setUsers(usersPayload.data || []);
      setGoogleStatus(gmailPayload);
      setEmails(emailsPayload.data || []);
      setEvents(eventsPayload.data || []);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  function refreshDashboard() {
    startTransition(() => {
      void loadDashboard();
    });
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey('contact-create');
    setError('');

    try {
      await apiRequest('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          ...contactForm,
          deal_value: contactForm.deal_value ? Number(contactForm.deal_value) : 0,
          next_follow_up: contactForm.next_follow_up || null,
          assigned_to: currentUser.id,
          tags: [],
          competitors: [],
        }),
      });

      setNotice(`Added ${contactForm.name} to the pipeline.`);
      setContactForm({
        name: '',
        title: 'CISO',
        company: '',
        industry: 'high_tech',
        email: '',
        phone: '',
        stage: 'prospect',
        quantum_risk: 3,
        deal_value: '',
        next_follow_up: '',
        notes: '',
      });
      refreshDashboard();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add contact');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey('task-create');
    setError('');

    try {
      await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...taskForm,
          assigned_to: currentUser.id,
          due_date: taskForm.due_date || null,
          contact_id: taskForm.contact_id || null,
        }),
      });

      setNotice('Task created.');
      setTaskForm({ title: '', due_date: '', priority: 'normal', contact_id: '' });
      refreshDashboard();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add task');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleContactImport(file: File) {
    setBusyKey('contact-import');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const payload = await apiRequest<ContactImportResponse>('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      const warningNote = payload.warnings.length ? ` ${payload.warnings[0]}` : '';
      setNotice(
        payload.skipped > 0
          ? `Imported ${payload.imported} contacts. Skipped ${payload.skipped} rows.${warningNote}`
          : `Imported ${payload.imported} contacts from ${file.name}.`
      );
      refreshDashboard();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Failed to import contacts');
    } finally {
      if (contactImportInputRef.current) {
        contactImportInputRef.current.value = '';
      }
      setBusyKey(null);
    }
  }

  function handleContactImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    void handleContactImport(file);
  }

  async function handleTaskToggle(task: Task) {
    setBusyKey(`task-${task.id}`);
    setError('');

    try {
      await apiRequest('/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify({ id: task.id, completed: !task.completed }),
      });
      setNotice(task.completed ? 'Task reopened.' : 'Task completed.');
      refreshDashboard();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update task');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTaskSync() {
    setBusyKey('task-sync');
    setError('');

    try {
      const payload = await apiRequest<TaskSyncResponse>('/api/tasks/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      setNotice(
        payload.synced > 0
          ? `Synced ${payload.synced} Google tasks (${payload.created} new, ${payload.updated} updated).`
          : payload.lists > 0
            ? 'Google Tasks are already up to date.'
            : 'No Google task lists were found.'
      );
      refreshDashboard();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Failed to sync Google Tasks');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleStageChange(contactId: string, stage: PipelineStage) {
    setBusyKey(`contact-${contactId}`);
    setError('');

    try {
      await apiRequest('/api/contacts', {
        method: 'PATCH',
        body: JSON.stringify({ id: contactId, stage }),
      });
      setNotice(`Moved deal to ${prettyLabel(stage)}.`);
      refreshDashboard();
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : 'Failed to move deal');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleGoogleConnect() {
    setBusyKey('google-connect');
    setError('');

    try {
      const payload = await apiRequest<{ url: string }>('/api/auth/gmail/connect', {
        method: 'POST',
        body: JSON.stringify({ includeCalendar: true, includeTasks: true }),
      });

      window.location.assign(payload.url);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Failed to start Google OAuth');
      setBusyKey(null);
    }
  }

  async function handleGoogleDisconnect() {
    setBusyKey('google-disconnect');
    setError('');

    try {
      await apiRequest('/api/auth/gmail/disconnect', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNotice('Google account disconnected.');
      refreshDashboard();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error ? disconnectError.message : 'Failed to disconnect Google'
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleEmailSync() {
    setBusyKey('email-sync');
    setError('');

    try {
      const payload = await apiRequest<EmailResponse>('/api/emails?sync=true');
      setEmails(payload.data || []);
      setNotice(
        payload.sync ? `Synced ${payload.sync.synced} new emails from Gmail.` : 'Inbox refreshed.'
      );
      setGoogleStatus(await apiRequest<GoogleStatus>('/api/auth/gmail/status'));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Failed to sync inbox');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey('email-send');
    setError('');

    try {
      await apiRequest('/api/emails', {
        method: 'POST',
        body: JSON.stringify(emailForm),
      });

      setNotice(`Sent email to ${emailForm.to}.`);
      setEmailForm({ to: '', subject: '', body: '' });
      await handleEmailSync();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send email');
      setBusyKey(null);
    }
  }

  async function handleCalendarSync() {
    setBusyKey('calendar-sync');
    setError('');

    try {
      const payload = await apiRequest<CalendarResponse>('/api/calendar?sync=true');
      setEvents(payload.data || []);
      setNotice(
        payload.sync
          ? `Calendar refreshed: ${payload.sync.synced} new, ${payload.sync.updated} updated.`
          : 'Calendar refreshed.'
      );
      setGoogleStatus(await apiRequest<GoogleStatus>('/api/auth/gmail/status'));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Failed to sync calendar');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey('event-create');
    setError('');

    try {
      await apiRequest('/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          startTime: new Date(eventForm.startTime).toISOString(),
          endTime: new Date(eventForm.endTime).toISOString(),
          location: eventForm.location,
          attendees: eventForm.attendees
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean),
        }),
      });

      setNotice(`Created calendar event: ${eventForm.title}`);
      setEventForm({
        title: '',
        description: '',
        location: '',
        attendees: '',
        ...createDefaultEventWindow(24, 1),
      });
      await handleCalendarSync();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create event');
      setBusyKey(null);
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey('user-submit');
    setError('');

    try {
      const payload = {
        ...userForm,
        ...(userForm.password ? { password: userForm.password } : {}),
      };

      await apiRequest('/api/users', {
        method: editingUserId ? 'PATCH' : 'POST',
        body: JSON.stringify(editingUserId ? { id: editingUserId, ...payload } : payload),
      });

      setNotice(
        editingUserId
          ? `Updated ${userForm.email}.`
          : `Added ${userForm.email} to QuantumVault CRM.`
      );
      resetUserForm();
      refreshDashboard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to save user');
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey('password-change');
    setError('');

    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('New password and confirmation must match');
      }

      await apiRequest('/api/users/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      setNotice('Password updated.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Failed to update password');
    } finally {
      setBusyKey(null);
    }
  }

  function handleUserEdit(user: User) {
    if (user.role === 'admin') {
      return;
    }

    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    });
    setError('');
    setNotice(`Editing ${user.email}. Leave password blank to keep it unchanged.`);
  }

  async function handleUserDelete(user: User) {
    if (user.role === 'admin') {
      return;
    }

    const confirmed = window.confirm(`Delete ${user.email}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setBusyKey(`user-delete-${user.id}`);
    setError('');

    try {
      await apiRequest('/api/users', {
        method: 'DELETE',
        body: JSON.stringify({ id: user.id }),
      });

      setNotice(`Deleted ${user.email}.`);

      if (editingUserId === user.id) {
        resetUserForm();
      }

      refreshDashboard();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleLogout() {
    setBusyKey('logout');
    setError('');

    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      window.location.assign(withBasePath('/login'));
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Failed to sign out');
      setBusyKey(null);
    }
  }

  function renderOverview() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="soft-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Priority Opportunities
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Deals that deserve the next move
              </h2>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
              {filteredContacts.length} active
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {filteredContacts.slice(0, 6).map((contact) => (
              <article
                className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-5"
                key={contact.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{contact.company}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {contact.name} • {contact.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Deal value</p>
                    <p className="text-lg font-semibold text-slate-950">
                      {formatCurrency(contact.deal_value)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
                    {prettyLabel(contact.stage)}
                  </span>
                  <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                    Quantum risk {contact.quantum_risk}/5
                  </span>
                  <span>Next follow-up {formatDate(contact.next_follow_up)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="soft-panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Next Actions
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Task queue</h3>
            <div className="mt-4 space-y-3">
              {urgentTasks.slice(0, 5).map((task) => (
                <div
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3"
                  key={task.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {task.contact_id ? contactLabelById.get(task.contact_id) || 'Linked deal' : 'General'}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Due {formatDate(task.due_date)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Connected Channels
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Google Workspace status</h3>
            <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-sm text-slate-500">Account</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {googleStatus.connected ? googleStatus.email : 'Not connected'}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Gmail: {googleStatus.hasGmail ? 'Connected' : 'Not linked'} • Calendar:{' '}
                {googleStatus.hasCalendar ? 'Connected' : 'Not linked'} • Tasks:{' '}
                {googleStatus.hasTasks ? 'Connected' : 'Not linked'}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderContacts() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="soft-panel p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Pipeline Accounts
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Manage active deals</h2>
            </div>
            <input
              className="field-shell max-w-xs"
              placeholder="Search company or contact"
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
            />
          </div>

          <div className="mt-5 space-y-4">
            {filteredContacts.length ? (
              filteredContacts.map((contact) => (
                <article
                  className="rounded-[22px] border border-slate-200/80 bg-white p-5"
                  key={contact.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{contact.company}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {contact.name} • {contact.title}
                      </p>
                      <p className="mt-3 text-sm text-slate-500">
                        Assigned to {userLabelById.get(contact.assigned_to || '') || 'Unassigned'}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                      <select
                        className="field-shell"
                        disabled={busyKey === `contact-${contact.id}`}
                        value={contact.stage}
                        onChange={(event) =>
                          void handleStageChange(contact.id, event.target.value as PipelineStage)
                        }
                      >
                        {stageOptions.map((stage) => (
                          <option key={stage} value={stage}>
                            {prettyLabel(stage)}
                          </option>
                        ))}
                      </select>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Value <span className="font-semibold text-slate-950">{formatCurrency(contact.deal_value)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                      {prettyLabel(contact.industry)}
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                      Quantum risk {contact.quantum_risk}/5
                    </span>
                    <span>Next follow-up {formatDate(contact.next_follow_up)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-500">
                No matching contacts yet.
              </div>
            )}
          </div>
        </section>

        <form className="soft-panel p-6" onSubmit={handleContactSubmit}>
          <input
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleContactImportChange}
            ref={contactImportInputRef}
            type="file"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">New Deal</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Add contact</h3>
            </div>
            <button
              className="action-secondary"
              disabled={busyKey === 'contact-import'}
              onClick={() => contactImportInputRef.current?.click()}
              type="button"
            >
              {busyKey === 'contact-import' ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            <input
              className="field-shell"
              placeholder="Contact name"
              required
              value={contactForm.name}
              onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}
            />
            <input
              className="field-shell"
              placeholder="Company"
              required
              value={contactForm.company}
              onChange={(event) => setContactForm({ ...contactForm, company: event.target.value })}
            />
            <input
              className="field-shell"
              placeholder="Title"
              value={contactForm.title}
              onChange={(event) => setContactForm({ ...contactForm, title: event.target.value })}
            />
            <input
              className="field-shell"
              placeholder="Email"
              type="email"
              value={contactForm.email}
              onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                className="field-shell"
                value={contactForm.industry}
                onChange={(event) =>
                  setContactForm({ ...contactForm, industry: event.target.value as Industry })
                }
              >
                {industryOptions.map((industry) => (
                  <option key={industry} value={industry}>
                    {prettyLabel(industry)}
                  </option>
                ))}
              </select>
              <select
                className="field-shell"
                value={contactForm.stage}
                onChange={(event) =>
                  setContactForm({ ...contactForm, stage: event.target.value as PipelineStage })
                }
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {prettyLabel(stage)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="field-shell"
                min="1"
                max="5"
                placeholder="Quantum risk"
                type="number"
                value={contactForm.quantum_risk}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    quantum_risk: Number(event.target.value) || 3,
                  })
                }
              />
              <input
                className="field-shell"
                placeholder="Deal value"
                type="number"
                value={contactForm.deal_value}
                onChange={(event) =>
                  setContactForm({ ...contactForm, deal_value: event.target.value })
                }
              />
            </div>
            <input
              className="field-shell"
              type="date"
              value={contactForm.next_follow_up}
              onChange={(event) =>
                setContactForm({ ...contactForm, next_follow_up: event.target.value })
              }
            />
            <textarea
              className="field-shell min-h-[120px]"
              placeholder="Context, political landscape, blockers"
              value={contactForm.notes}
              onChange={(event) => setContactForm({ ...contactForm, notes: event.target.value })}
            />
          </div>
          <button className="action-primary mt-5 w-full" disabled={busyKey === 'contact-create'} type="submit">
            {busyKey === 'contact-create' ? 'Adding...' : 'Add Contact'}
          </button>
        </form>
      </div>
    );
  }

  function renderTasks() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="soft-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Execution Queue</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Tasks due next</h2>
            </div>
            <button
              className="action-secondary"
              disabled={busyKey === 'task-sync' || (!googleStatus.connected && busyKey === 'google-connect')}
              onClick={() =>
                void (googleStatus.hasTasks ? handleTaskSync() : handleGoogleConnect())
              }
              type="button"
            >
              {busyKey === 'task-sync'
                ? 'Syncing...'
                : googleStatus.hasTasks
                  ? 'Sync Tasks'
                  : googleStatus.connected
                    ? 'Reconnect Tasks'
                    : 'Connect Tasks'}
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {tasks.length ? (
              tasks.map((task) => (
                <article className="rounded-[22px] border border-slate-200 bg-white p-5" key={task.id}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {task.contact_id ? contactLabelById.get(task.contact_id) || 'Linked contact' : 'General workflow'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {task.priority}
                      </span>
                      <button
                        className="action-secondary"
                        disabled={busyKey === `task-${task.id}`}
                        onClick={() => void handleTaskToggle(task)}
                        type="button"
                      >
                        {task.completed ? 'Reopen' : 'Complete'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Due {formatDate(task.due_date)}</p>
                </article>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-500">
                No tasks yet.
              </div>
            )}
          </div>
        </section>

        <form className="soft-panel p-6" onSubmit={handleTaskSubmit}>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Quick Add</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Create task</h3>
          <div className="mt-5 grid gap-4">
            <input
              className="field-shell"
              placeholder="Task title"
              required
              value={taskForm.title}
              onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="field-shell"
                type="date"
                value={taskForm.due_date}
                onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })}
              />
              <select
                className="field-shell"
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, priority: event.target.value as TaskPriority })
                }
              >
                {taskPriorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {prettyLabel(priority)}
                  </option>
                ))}
              </select>
            </div>
            <select
              className="field-shell"
              value={taskForm.contact_id}
              onChange={(event) => setTaskForm({ ...taskForm, contact_id: event.target.value })}
            >
              <option value="">Not tied to a contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.company} • {contact.name}
                </option>
              ))}
            </select>
          </div>
          <button className="action-primary mt-5 w-full" disabled={busyKey === 'task-create'} type="submit">
            {busyKey === 'task-create' ? 'Saving...' : 'Create Task'}
          </button>
        </form>
      </div>
    );
  }

  function renderInbox() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="soft-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Gmail Feed</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Recent conversations</h2>
            </div>
            <div className="flex gap-3">
              {googleStatus.connected ? (
                <button
                  className="action-secondary"
                  disabled={busyKey === 'email-sync'}
                  onClick={() => void handleEmailSync()}
                  type="button"
                >
                  {busyKey === 'email-sync' ? 'Syncing...' : 'Sync Inbox'}
                </button>
              ) : (
                <button
                  className="action-primary"
                  disabled={busyKey === 'google-connect'}
                  onClick={() => void handleGoogleConnect()}
                  type="button"
                >
                  {busyKey === 'google-connect' ? 'Connecting...' : 'Connect Gmail'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {emails.length ? (
              emails.map((email) => (
                <article className="min-w-0 overflow-hidden rounded-[22px] border border-slate-200 bg-white p-5" key={email.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-base font-semibold text-slate-950 [overflow-wrap:anywhere]">
                        {email.subject || 'No subject'}
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">
                        {email.direction === 'outbound' ? 'To' : 'From'}{' '}
                        {email.direction === 'outbound' ? email.to_address : email.from_address}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">{formatDateTime(email.date)}</span>
                  </div>
                  <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                    {email.body}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-500">
                {googleStatus.connected
                  ? 'No synced emails yet. Run a sync to pull Gmail activity.'
                  : 'Connect Gmail to start syncing conversations.'}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="soft-panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Connection</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Google account</h3>
            <p className="mt-3 text-sm text-slate-600">
              {googleStatus.connected
                ? `Connected as ${googleStatus.email}`
                : 'Inbox and calendar sync are offline until a Dytallix Google account is linked.'}
            </p>
            <div className="mt-5 flex gap-3">
              {googleStatus.connected ? (
                <button
                  className="action-secondary"
                  disabled={busyKey === 'google-disconnect'}
                  onClick={() => void handleGoogleDisconnect()}
                  type="button"
                >
                  {busyKey === 'google-disconnect' ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : (
                <button
                  className="action-primary"
                  disabled={busyKey === 'google-connect'}
                  onClick={() => void handleGoogleConnect()}
                  type="button"
                >
                  {busyKey === 'google-connect' ? 'Connecting...' : 'Connect Google'}
                </button>
              )}
            </div>
          </section>

          <form className="soft-panel p-6" onSubmit={handleSendEmail}>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Compose</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Send email</h3>
            <div className="mt-5 grid gap-4">
              <input
                className="field-shell"
                placeholder="To"
                required
                type="email"
                value={emailForm.to}
                onChange={(event) => setEmailForm({ ...emailForm, to: event.target.value })}
              />
              <input
                className="field-shell"
                placeholder="Subject"
                required
                value={emailForm.subject}
                onChange={(event) => setEmailForm({ ...emailForm, subject: event.target.value })}
              />
              <textarea
                className="field-shell min-h-[180px]"
                placeholder="Write the message"
                required
                value={emailForm.body}
                onChange={(event) => setEmailForm({ ...emailForm, body: event.target.value })}
              />
            </div>
            <button
              className="action-primary mt-5 w-full"
              disabled={!googleStatus.connected || busyKey === 'email-send'}
              type="submit"
            >
              {busyKey === 'email-send' ? 'Sending...' : 'Send Email'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  function renderCalendar() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="soft-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Calendar Flow</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Upcoming events</h2>
            </div>
            <button
              className="action-secondary"
              disabled={!googleStatus.connected || busyKey === 'calendar-sync'}
              onClick={() => void handleCalendarSync()}
              type="button"
            >
              {busyKey === 'calendar-sync' ? 'Syncing...' : 'Sync Calendar'}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {events.length ? (
              events.map((calendarEvent) => (
                <article className="rounded-[22px] border border-slate-200 bg-white p-5" key={calendarEvent.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{calendarEvent.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDateTime(calendarEvent.start_time)}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {calendarEvent.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{calendarEvent.description || 'No description provided.'}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>{calendarEvent.location || 'No location'}</span>
                    {calendarEvent.meeting_link ? (
                      <a
                        className="font-medium text-sky-700 hover:text-sky-800"
                        href={calendarEvent.meeting_link}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open meeting link
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-500">
                {googleStatus.connected
                  ? 'No upcoming events yet. Create a meeting or sync your calendar.'
                  : 'Connect Google first to view or create calendar events.'}
              </div>
            )}
          </div>
        </section>

        <form className="soft-panel p-6" onSubmit={handleEventSubmit}>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Schedule</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Create event</h3>
          <div className="mt-5 grid gap-4">
            <input
              className="field-shell"
              placeholder="Event title"
              required
              value={eventForm.title}
              onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })}
            />
            <textarea
              className="field-shell min-h-[120px]"
              placeholder="Agenda or prep notes"
              value={eventForm.description}
              onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="field-shell"
                required
                type="datetime-local"
                value={eventForm.startTime}
                onChange={(event) => setEventForm({ ...eventForm, startTime: event.target.value })}
              />
              <input
                className="field-shell"
                required
                type="datetime-local"
                value={eventForm.endTime}
                onChange={(event) => setEventForm({ ...eventForm, endTime: event.target.value })}
              />
            </div>
            <input
              className="field-shell"
              placeholder="Location"
              value={eventForm.location}
              onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })}
            />
            <input
              className="field-shell"
              placeholder="Attendees separated by commas"
              value={eventForm.attendees}
              onChange={(event) => setEventForm({ ...eventForm, attendees: event.target.value })}
            />
          </div>
          <button
            className="action-primary mt-5 w-full"
            disabled={!googleStatus.connected || busyKey === 'event-create'}
            type="submit"
          >
            {busyKey === 'event-create' ? 'Scheduling...' : 'Create Event'}
          </button>
        </form>
      </div>
    );
  }

  function renderTeam() {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <section className="soft-panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Your account</h2>
            <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{currentUser.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{currentUser.email}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {prettyLabel(currentUser.role)}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">Active since {formatDate(currentUser.created_at)}</p>
            </div>
          </section>

          <form className="soft-panel p-6" onSubmit={handlePasswordSubmit}>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Security</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Change password</h3>
            <div className="mt-5 grid gap-4">
              <input
                className="field-shell"
                placeholder="Current password"
                required
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
                }
              />
              <input
                className="field-shell"
                minLength={8}
                placeholder="New password"
                required
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, newPassword: event.target.value })
                }
              />
              <input
                className="field-shell"
                minLength={8}
                placeholder="Confirm new password"
                required
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
                }
              />
            </div>
            <button className="action-primary mt-5 w-full" disabled={busyKey === 'password-change'} type="submit">
              {busyKey === 'password-change' ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <section className="soft-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Users</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Internal CRM access</h2>
              </div>
              {currentUser.role === 'admin' ? (
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                  {manageableUsers.length} manageable
                </span>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              {users.map((user) => {
                const protectedAdmin = user.role === 'admin' && user.id !== currentUser.id;
                const canManage =
                  currentUser.role === 'admin' && user.role !== 'admin' && user.id !== currentUser.id;

                return (
                  <article className="rounded-[22px] border border-slate-200 bg-white p-5" key={user.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {user.name}
                          {user.id === currentUser.id ? ' (You)' : ''}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {prettyLabel(user.role)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                      <span>
                        {user.active ? 'Active' : 'Disabled'} • Created {formatDate(user.created_at)}
                      </span>
                      {protectedAdmin ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                          Protected admin account
                        </span>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          className="action-secondary"
                          disabled={busyKey === 'user-submit' || busyKey === `user-delete-${user.id}`}
                          onClick={() => handleUserEdit(user)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="action-secondary"
                          disabled={busyKey === `user-delete-${user.id}` || busyKey === 'user-submit'}
                          onClick={() => void handleUserDelete(user)}
                          type="button"
                        >
                          {busyKey === `user-delete-${user.id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="soft-panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Admin</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              {editingUserId ? 'Edit user' : 'Create user'}
            </h3>
            {currentUser.role === 'admin' ? (
              <>
                <p className="mt-3 text-sm text-slate-600">
                  Admin accounts are protected. You can create admin or rep accounts, but only rep accounts can be edited, disabled, or deleted here.
                </p>
                <form className="mt-5 grid gap-4" onSubmit={handleUserSubmit}>
                  <input
                    className="field-shell"
                    placeholder="Full name"
                    required
                    value={userForm.name}
                    onChange={(event) => setUserForm({ ...userForm, name: event.target.value })}
                  />
                  <input
                    className="field-shell"
                    placeholder="Email"
                    required
                    type="email"
                    value={userForm.email}
                    onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                  />
                  <input
                    className="field-shell"
                    minLength={editingUserId ? undefined : 8}
                    placeholder={editingUserId ? 'New password (optional)' : 'Password'}
                    required={!editingUserId}
                    type="password"
                    value={userForm.password}
                    onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                  />
                  <select
                    className="field-shell"
                    value={userForm.role}
                    onChange={(event) =>
                      setUserForm({ ...userForm, role: event.target.value as UserRole })
                    }
                    disabled={Boolean(editingUserId)}
                  >
                    <option value="admin">Admin</option>
                    <option value="rep">Rep</option>
                  </select>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      checked={userForm.active}
                      className="h-4 w-4 accent-slate-950"
                      type="checkbox"
                      onChange={(event) => setUserForm({ ...userForm, active: event.target.checked })}
                    />
                    Account active
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button className="action-primary flex-1" disabled={busyKey === 'user-submit'} type="submit">
                      {busyKey === 'user-submit'
                        ? editingUserId
                          ? 'Saving...'
                          : 'Creating...'
                        : editingUserId
                          ? 'Save Changes'
                          : 'Create User'}
                    </button>
                    {editingUserId ? (
                      <button className="action-secondary" onClick={resetUserForm} type="button">
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </>
            ) : (
              <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                Only CRM admins can manage team accounts.
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  const currentView = {
    overview: renderOverview(),
    contacts: renderContacts(),
    tasks: renderTasks(),
    inbox: renderInbox(),
    calendar: renderCalendar(),
    team: renderTeam(),
  }[activeTab];

  return (
    <main className="w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full">
        <header className="glass-panel overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:items-end">
            <div className="min-w-0 max-w-4xl">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                QuantumVault CRM
              </h1>
            </div>

            <div className="soft-panel w-full p-5 2xl:justify-self-end">
              <div className="flex items-start justify-between gap-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                  Signed in
                </p>
                <ThemeToggle className="theme-toggle-embedded" />
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">{currentUser.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{currentUser.email}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {currentUser.role}
                </span>
                <button
                  className="action-secondary"
                  disabled={busyKey === 'logout'}
                  onClick={() => void handleLogout()}
                  type="button"
                >
                  {busyKey === 'logout' ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <div className="metric-card">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Active pipeline</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{formatCurrency(pipelineValue)}</p>
            <p className="mt-2 text-sm text-slate-500">{activeDeals.length} deals in motion</p>
          </div>
          <div className="metric-card">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Weighted forecast</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{formatCurrency(weightedForecast)}</p>
            <p className="mt-2 text-sm text-slate-500">Stage-adjusted revenue confidence</p>
          </div>
          <div className="metric-card">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Open tasks</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{urgentTasks.length}</p>
            <p className="mt-2 text-sm text-slate-500">Execution items owned by the team</p>
          </div>
          <div className="metric-card">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Google status</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">
              {googleStatus.connected ? 'Linked' : 'Offline'}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {googleStatus.connected ? googleStatus.email : 'Gmail and calendar not connected'}
            </p>
          </div>
        </section>

        {notice ? (
          <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <nav className="crm-tab-nav mt-6 grid gap-3 rounded-[30px] p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {tabs.map((tab) => (
            <button
              className={
                activeTab === tab.id
                  ? 'crm-tab-button crm-tab-button-active'
                  : 'crm-tab-button crm-tab-button-idle'
              }
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <p className="text-sm font-semibold">{tab.label}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-current/70">{tab.note}</p>
            </button>
          ))}
        </nav>

        <section className="mt-6">
          {loading && !contacts.length && !tasks.length && !users.length ? (
            <div className="glass-panel p-10 text-center text-sm text-slate-500">Loading dashboard...</div>
          ) : (
            currentView
          )}
        </section>

        {(isPending || busyKey) && !loading ? (
          <div className="mt-6 text-center text-sm text-slate-500">Refreshing workspace data...</div>
        ) : null}
      </div>
    </main>
  );
}