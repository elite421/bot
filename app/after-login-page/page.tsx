"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isBotLogin, getBotUserData, clearBotLogin, initializeBotLoginFromParams } from "../../utils/botLogin";
import { 
  Grid, 
  BarChart3, 
  TrendingUp, 
  Star, 
  Package, 
  RotateCcw, 
  Settings, 
  Code, 
  FileText,
  Phone,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  HelpCircle,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info
} from "lucide-react";

interface User {
  name: string;
  email: string;
  phone: string;
  authCredit: number;
}

interface Gating {
  trialBlocked: boolean;
  reason: 'credits_exhausted' | 'inactive_90d' | null;
  remainingTrialCredits: number;
  lastActiveAt: string | null;
  purchaseLink?: string;
}

interface LiveSession {
  id: string;
  userName: string;
  mobileNo: string;
  type: string;
  status: string;
}

interface AuthReport {
  id: string;
  userName: string;
  mobileNo: string;
  type: string;
  status: string;
  date: string;
}

interface UsageReport {
  id: string;
  sessionId: string;
  credit: number;
  debit: number;
  balance: number;
  type: string;
  remark: string;
  date: string;
}

interface Transaction {
  id: string;
  walletId: string;
  txnId: string;
  amount: number;
  status: string;
  date: string;
}

interface Plan {
  name: string;
  authCredit: string;
  planAmount: string;
  validity: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export default function AfterLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [gating, setGating] = useState<Gating | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const paymentLinkUrl = process.env.NEXT_PUBLIC_PAYMENT_LINK_URL || '';
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  // Form states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sessionExpire, setSessionExpire] = useState('120');
  const [editName, setEditName] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [appearanceSaved, setAppearanceSaved] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);

  // Organization state
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [orgMembers, setOrgMembers] = useState<Array<{ userId: number; role: string; name: string | null; email: string | null; phone: string | null }>>([]);
  const [orgTokens, setOrgTokens] = useState<Array<{ id: number; token: string; active: boolean; createdAt: string }>>([]);
  const [orgBalance, setOrgBalance] = useState<number>(0);
  const [orgNameInput, setOrgNameInput] = useState<string>("");
  const [memberEmail, setMemberEmail] = useState<string>("");
  const [memberPhone, setMemberPhone] = useState<string>("");
  const [memberRole, setMemberRole] = useState<'member' | 'admin'>('member');
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgGroups, setOrgGroups] = useState<Array<{ id: number; name: string; createdAt: string }>>([]);
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [groupSelectId, setGroupSelectId] = useState<number | ''>('');
  const [groupSelectUserId, setGroupSelectUserId] = useState<number | ''>('');

  // Data sets
  const [summary, setSummary] = useState<{ myActiveSessions: number; myPendingRequests: number; myTickets: number; lastLogin: string }>({
    myActiveSessions: 0,
    myPendingRequests: 0,
    myTickets: 0,
    lastLogin: ''
  });
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [authReports, setAuthReports] = useState<AuthReport[]>([]);
  const [usageReports, setUsageReports] = useState<UsageReport[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ date: string; total: number; verified: number }[]>([]);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [ticketsShown, setTicketsShown] = useState<number>(10);

  const [toasts, setToasts] = useState<Array<{ id: number; title: string; description?: string; variant: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const notify = (title: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info', description?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const plans: Plan[] = [
    { name: 'Basic', authCredit: '2,500', planAmount: '₹ 500', validity: '1 Year' },
    { name: 'Starter', authCredit: '6,250', planAmount: '₹ 1,000', validity: '1 Year' },
    { name: 'Business', authCredit: '10,714', planAmount: '₹ 1,500', validity: '1 Year' },
    { name: 'Pro', authCredit: '20,000', planAmount: '₹ 2,000', validity: '1 Year' }
  ];

  // API credentials state
  const [apiLiveKey, setApiLiveKey] = useState<string>('');
  const [apiTestKey, setApiTestKey] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [regenLiveLoading, setRegenLiveLoading] = useState(false);
  const [regenTestLoading, setRegenTestLoading] = useState(false);
  const [rotateWebhookLoading, setRotateWebhookLoading] = useState(false);

  useEffect(() => {
    // First check for bot login parameters in URL
    const botLoginFromParams = initializeBotLoginFromParams();
    
    const token = localStorage.getItem("authToken");
    if (!token && !botLoginFromParams) {
      router.replace("/login");
      return;
    }

    // Check if user logged in via bot
    if (isBotLogin()) {
      // Handle bot login specific logic
      handleBotLogin();
    } else {
      // Fetch user data normally
      fetchUserData();
    }
  }, [router]);

  const handleBotLogin = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const botData = getBotUserData();
      
      if (botData) {
        // Enhanced user data setup for bot users
        setUser({
          name: botData.name || 'Bot User',
          email: botData.email || '',
          phone: botData.phone || '',
          authCredit: botData.authCredit || 0
        });
        setEditName(botData.name || 'Bot User');
        
        // Show welcome message for bot users
        if (botData.isVerified && botData.loginMethod === 'bot_qr') {
          // You can add a toast notification here if you have a toast system
          console.log('Welcome! You have successfully logged in via bot verification.');
        }
        
        // Auto-load dashboard data for better UX
        await Promise.all([
          fetchSummary(),
          fetchMetrics(),
          fetchTickets()
        ]);
        
        // Set active tab to dashboard for immediate access
        setActiveTab('dashboard');
      } else {
        // If no bot data found, redirect to login
        throw new Error('Bot user data not found');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error handling bot login:', error);
      clearBotLogin();
      localStorage.removeItem('authToken');
      router.replace('/login');
    }
  };

  // Organization helpers
  const loadOrg = async () => {
    try {
      setOrgLoading(true);
      const res = await fetch(`${API_BASE_URL}/org`, { headers: authHeaders() });
      const data: ApiResponse<{ org: { id: number; name: string } | null; members: any[]; tokens: any[]; balance: number }>
        = await res.json();
      if (data.success) {
        setOrg(data.data.org);
        setOrgMembers(data.data.members || []);
        setOrgTokens(data.data.tokens || []);
        const newBalance = data.data.balance ?? 0;
        setOrgBalance(newBalance);
        setOrgNameInput(data.data.org?.name || '');
      }
    } catch (e) {
      console.error('loadOrg error', e);
    } finally {
      setOrgLoading(false);
    }
  };

  const createOrg = async () => {
    try {
      setOrgLoading(true);
      const name = orgNameInput.trim() || (user?.name ? `${user.name}'s Org` : 'My Organization');
      const res = await fetch(`${API_BASE_URL}/org`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name })
      });
      const data: ApiResponse<{ org: { id: number; name: string } }> = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to create org');
      setOrg(data.data.org);
      await Promise.all([loadOrg(), loadGroups()]);
    } catch (e: any) {
      alert(e?.message || 'Failed to create organization');
    } finally {
      setOrgLoading(false);
    }
  };

  const updateOrgName = async () => {
    if (!org) return;
    try {
      setOrgLoading(true);
      const res = await fetch(`${API_BASE_URL}/org`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: orgNameInput.trim() })
      });
      const data: ApiResponse<any> = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to update');
      await loadOrg();
    } catch (e: any) {
      alert(e?.message || 'Failed to update organization name');
    } finally {
      setOrgLoading(false);
    }
  };

  const addMember = async () => {
    if (!org) return;
    if (!memberEmail && !memberPhone) {
      alert('Provide email or phone');
      return;
    }
    try {
      setOrgLoading(true);
      const res = await fetch(`${API_BASE_URL}/org/members`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: memberEmail || undefined, phone: memberPhone || undefined, role: memberRole })
      });
      const data: ApiResponse<any> = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to add member');
      setMemberEmail('');
      setMemberPhone('');
      setMemberRole('member');
      await loadOrg();
    } catch (e: any) {
      alert(e?.message || 'Failed to add member');
    } finally {
      setOrgLoading(false);
    }
  };

  const createOrgToken = async () => {
    if (!org) return;
    try {
      setOrgLoading(true);
      const res = await fetch(`${API_BASE_URL}/org/tokens`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data: ApiResponse<{ token: string }> = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to create token');
      await loadOrg();
    } catch (e: any) {
      alert(e?.message || 'Failed to create token');
    } finally {
      setOrgLoading(false);
    }
  };

  const toggleOrgToken = async (id: number, active: boolean) => {
    try {
      setOrgLoading(true);
      const res = await fetch(`${API_BASE_URL}/org/tokens`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id, active })
      });
      const data: ApiResponse<any> = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to update token');
      await loadOrg();
    } catch (e: any) {
      alert(e?.message || 'Failed to update token');
    } finally {
      setOrgLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/org/groups`, { headers: authHeaders() });
      const data: ApiResponse<Array<{ id: number; name: string; createdAt: string }>> = await res.json();
      if (data.success) setOrgGroups(data.data || []);
    } catch (e) {
      console.error('loadGroups error', e);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      setOrgLoading(true);
      const res = await fetch(`${API_BASE_URL}/org/groups`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newGroupName.trim() })
      });
      const data: ApiResponse<{ id: number; name: string }> = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to create group');
      setNewGroupName('');
      await loadGroups();
    } catch (e: any) {
      alert(e?.message || 'Failed to create group');
    } finally {
      setOrgLoading(false);
    }
  };

  const addMemberToGroup = async () => {
    if (!groupSelectId || !groupSelectUserId) {
      alert('Select a group and a member');
      return;
    }
    try {
      setOrgLoading(true);
      const res = await fetch(`${API_BASE_URL}/org/group-members`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ groupId: Number(groupSelectId), userId: Number(groupSelectUserId) })
      });
      const data: ApiResponse<any> = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to add to group');
      setGroupSelectId('');
      setGroupSelectUserId('');
      // Optionally could reload group members here if we showed per-group members
    } catch (e: any) {
      alert(e?.message || 'Failed to add member to group');
    } finally {
      setOrgLoading(false);
    }
  };

  const fetchCredentials = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/credentials`, { headers: authHeaders() });
      const data: ApiResponse<{ keys: { live: string; test: string }; webhookUrl: string }> = await res.json();
      if (data.success) {
        setApiLiveKey(data.data.keys.live || '');
        setApiTestKey(data.data.keys.test || '');
        setWebhookUrl(data.data.webhookUrl || '');
      }
    } catch (e) {
      console.error('Error fetching credentials:', e);
    }
  };

  const regenerateKey = async (type: 'live' | 'test') => {
    try {
      if (type === 'live') setRegenLiveLoading(true); else setRegenTestLoading(true);
      const res = await fetch(`${API_BASE_URL}/credentials/regenerate-key`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type })
      });
      const data: ApiResponse<{ type: 'live' | 'test'; apiKey: string }> = await res.json();
      if (data.success) {
        if (data.data.type === 'live') setApiLiveKey(data.data.apiKey);
        if (data.data.type === 'test') setApiTestKey(data.data.apiKey);
      } else {
        alert('Failed to regenerate key: ' + (data.message || 'Unknown error'));
      }
    } catch (e) {
      console.error('Regenerate key error:', e);
      alert('Failed to regenerate key');
    } finally {
      if (type === 'live') setRegenLiveLoading(false); else setRegenTestLoading(false);
    }
  };

  const rotateWebhook = async () => {
    try {
      setRotateWebhookLoading(true);
      const res = await fetch(`${API_BASE_URL}/credentials/rotate-webhook`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data: ApiResponse<{ webhookUrl: string }> = await res.json();
      if (data.success) {
        setWebhookUrl(data.data.webhookUrl || '');
      } else {
        alert('Failed to rotate webhook: ' + (data.message || 'Unknown error'));
      }
    } catch (e) {
      console.error('Rotate webhook error:', e);
      alert('Failed to rotate webhook');
    } finally {
      setRotateWebhookLoading(false);
    }
  };

  // Load datasets when tabs change – wait for user to be loaded to avoid premature 401s
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'auth-report') fetchAuthReport();
    if (activeTab === 'usage-report') fetchUsageReport();
    if (activeTab === 'transaction-report') fetchTransactions();
    if (activeTab === 'help-support') fetchTickets();
    if (activeTab === 'settings') loadSettings();
    if (activeTab === 'dashboard') fetchMetrics();
    if (activeTab === 'api-credentials') fetchCredentials();
    if (activeTab === 'organization') {
      loadOrg();
      loadGroups();
    }
  }, [activeTab, user?.email]);

  // Poll tickets periodically while on Help & Support
  useEffect(() => {
    if (activeTab !== 'help-support') return;
    const id = setInterval(() => {
      fetchTickets();
    }, 30000);
    return () => clearInterval(id);
  }, [activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  useEffect(() => {
    const handler = (msg: any) => {
      const text = String(msg);
      const lower = text.toLowerCase();
      let variant: 'success' | 'error' | 'warning' | 'info' = 'info';
      if (/(fail|error|invalid|unable|not configured|unknown)/.test(lower)) variant = 'error';
      else if (/(success|saved|done|created|updated|revoked)/.test(lower)) variant = 'success';
      else if (/(please|provide|set|select|cannot|empty)/.test(lower)) variant = 'warning';
      notify(text, variant);
    };
    (window as any).alert = handler;
    return () => {
      try {
        delete (window as any).alert;
      } catch {
        (window as any).alert = undefined;
      }
    };
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: ApiResponse<{ user: User; gating?: Gating }> = await response.json();
        if (data.success) {
          setUser({
            name: data.data.user.name || '',
            email: data.data.user.email || '',
            phone: data.data.user.phone || '',
            authCredit: data.data.user.authCredit || 0
          });
          setEditName(data.data.user.name || '');
          setGating(data.data.gating || null);
          
          // Load initial dashboard summary
          fetchSummary();
        }
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // if API fails, force login again to avoid showing shared placeholder data
      localStorage.removeItem('authToken');
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const authHeaders = (): HeadersInit => {
    const token = (typeof window !== 'undefined' ? localStorage.getItem('authToken') : '') || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/summary`, { headers: authHeaders() });
      const data: ApiResponse<any> = await res.json();
      if (data.success) {
        setSummary({
          myActiveSessions: data.data.myActiveSessions || 0,
          myPendingRequests: data.data.myPendingRequests || 0,
          myTickets: data.data.myTickets || 0,
          lastLogin: data.data.lastLogin || ''
        });
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchAuthReport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);
      
      const res = await fetch(`${API_BASE_URL}/dashboard/auth-report?${queryParams}`, { 
        headers: authHeaders() 
      });
      const data: ApiResponse<any[]> = await res.json();
      
      if (data.success) {
        setAuthReports(data.data.map((r: any, idx: number) => ({
          id: String(r.id ?? idx + 1),
          userName: r.userName || r.mobileNo || 'User',
          mobileNo: r.mobileNo || '',
          type: r.hash ? 'hash' : 'qr',
          status: r.status || 'Pending',
          date: r.date || new Date().toLocaleDateString()
        })));
      }
    } catch (error) {
      console.error('Error fetching auth report:', error);
    }
  };

  const fetchUsageReport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);
      
      const res = await fetch(`${API_BASE_URL}/dashboard/usage-report?${queryParams}`, { 
        headers: authHeaders() 
      });
      const data: ApiResponse<UsageReport[]> = await res.json();
      
      if (data.success) {
        setUsageReports(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching usage report:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);
      
      const res = await fetch(`${API_BASE_URL}/dashboard/transactions?${queryParams}`, { 
        headers: authHeaders() 
      });
      const data: ApiResponse<Transaction[]> = await res.json();
      
      if (data.success) {
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/settings`, { headers: authHeaders(), credentials: 'same-origin' });
      const data: ApiResponse<any> = await res.json();
      
      if (data.success) {
        const s = data.data || {};
        setNotifyEmail(s.notifyEmail !== false);
        setNotifyWhatsApp(s.notifyWhatsApp !== false);
        setLoginAlerts(s.loginAlerts !== false);
        setCompactMode(s.compactMode === true);
        setLanguage(s.language || 'en');
        setSessionExpire(String(s.sessionExpire || '120'));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/tickets`, { headers: authHeaders() });
      const data: ApiResponse<any[]> = await res.json();
      
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/metrics`, { headers: authHeaders() });
      const data: ApiResponse<any[]> = await res.json();
      
      if (data.success) {
        setMetrics(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("botLogin");
    localStorage.removeItem("botUserData");
    router.push("/login");
  };

  const handleProfileClick = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const handleHelpSupport = () => {
    setProfileDropdownOpen(false);
    setActiveTab('help-support');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProfile = () => {
    setProfileDropdownOpen(false);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    if (activeTab === 'auth-report') fetchAuthReport();
    if (activeTab === 'usage-report') fetchUsageReport();
    if (activeTab === 'transaction-report') fetchTransactions();
  };

  const handleExportReport = () => {
    let dataToExport: any[] = [];
    let filename = 'report';
    
    if (activeTab === 'auth-report') {
      dataToExport = authReports;
      filename = 'auth-report';
    } else if (activeTab === 'usage-report') {
      dataToExport = usageReports;
      filename = 'usage-report';
    } else if (activeTab === 'transaction-report') {
      dataToExport = transactions;
      filename = 'transaction-report';
    }
    
    if (dataToExport.length === 0) {
      alert("No data to export");
      return;
    }
    
    // Convert to CSV
    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(obj => 
      Object.values(obj).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBuyPlan = (planName: string) => {
    if (paymentLinkUrl) {
      // Redirect to configured payment link (e.g., Stripe Payment Link)
      const url = new URL(paymentLinkUrl);
      url.searchParams.set('plan', planName);
      url.searchParams.set('userId', user?.email || '');
      window.location.href = url.toString();
      return;
    }
    alert(`Payment link not configured. Please set NEXT_PUBLIC_PAYMENT_LINK_URL in .env.local. Attempted to buy: ${planName}`);
  };

  const handleUpdateSettings = async () => {
    const expireTime = parseInt(sessionExpire);
    if (expireTime < 60 || expireTime > 180) {
      alert("Please set expiry time between 60 to 180 seconds");
      return;
    }
    
    setSavingSettings(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/settings`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ sessionExpire: expireTime })
      });
      
      const data: ApiResponse<any> = await response.json();
      
      if (data.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      } else {
        alert("Failed to update settings: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert("Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/settings`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ 
          notifyEmail, 
          notifyWhatsApp, 
          loginAlerts 
        })
      });
      
      const data: ApiResponse<any> = await response.json();
      
      if (data.success) {
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 3000);
      } else {
        alert("Failed to save preferences: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert("Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSaveAppearance = async () => {
    setSavingAppearance(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/settings`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ 
          compactMode, 
          language 
        })
      });
      
      const data: ApiResponse<any> = await response.json();
      
      if (data.success) {
        setAppearanceSaved(true);
        setTimeout(() => setAppearanceSaved(false), 3000);
      } else {
        alert("Failed to save appearance settings: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      alert("Failed to save appearance settings");
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleRevokeSessions = async () => {
    setRevoking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/revoke-others`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'same-origin'
      });
      
      const data: ApiResponse<any> = await response.json();
      
      if (data.success) {
        setRevoked(true);
        setTimeout(() => setRevoked(false), 3000);
        alert("All other sessions have been revoked successfully");
      } else {
        alert("Failed to revoke sessions: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error revoking sessions:', error);
      alert("Failed to revoke sessions");
    } finally {
      setRevoking(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      alert("Name cannot be empty");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: editName.trim() })
      });
      
      const data: ApiResponse<{ user: User }> = await response.json();
      
      if (data.success) {
        setUser(prev => prev ? { ...prev, name: editName.trim() } : null);
        alert("Profile updated successfully");
      } else {
        alert("Failed to update profile: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert("Failed to update profile");
    }
  };

  const handleCreateTicket = async () => {
    const subject = (document.getElementById('ticket-subject') as HTMLInputElement)?.value || '';
    const message = (document.getElementById('ticket-message') as HTMLTextAreaElement)?.value || '';
    
    if (!subject.trim() || !message.trim()) {
      alert("Please fill in both subject and message fields");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/tickets`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ 
          subject: subject.trim(), 
          message: message.trim() 
        })
      });
      
      const data: ApiResponse<any> = await response.json();
      
      if (data.success) {
        // Clear form
        (document.getElementById('ticket-subject') as HTMLInputElement).value = '';
        (document.getElementById('ticket-message') as HTMLTextAreaElement).value = '';
        
        // Refresh tickets list
        fetchTickets();
        
        alert("Ticket created successfully");
      } else {
        alert("Failed to create ticket: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert("Failed to create ticket");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">Unable to load user data. Please try logging in again.</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white/10 backdrop-blur-sm border-r border-white/20 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 p-6 border-b border-white/20 shrink-0">
            <img src="/true-otp.svg" alt="TruOTP" className="w-8 h-8" />
            <span className="text-lg font-bold text-white tracking-wide">TruOTP</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Grid size={20} />
              <span>Dashboard</span>
            </button>

            {/* Auth Session */}
            <div className="space-y-1">
              <div className="px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
                Auth Session
              </div>
              <button
                onClick={() => setActiveTab('live-session')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'live-session' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <TrendingUp size={18} />
                <span>Live Session</span>
              </button>
              <button
                onClick={() => setActiveTab('auth-report')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'auth-report' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 size={18} />
                <span>Auth Report</span>
              </button>
            </div>

            {/* Credit */}
            <div className="space-y-1">
              <div className="px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
                Credit
              </div>
              <button
                onClick={() => setActiveTab('usage-report')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'usage-report' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Star size={18} />
                <span>Usage Report</span>
              </button>
            </div>

            {/* Plan & Subs */}
            <div className="space-y-1">
              <div className="px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
                Plan & Subs
              </div>
              <button
                onClick={() => setActiveTab('packages')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'packages' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Package size={18} />
                <span>Packages</span>
              </button>
              <button
                onClick={() => setActiveTab('transaction-report')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'transaction-report' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <RotateCcw size={18} />
                <span>Transaction Report</span>
              </button>
            </div>

            {/* Settings */}
            <div className="space-y-1">
              <div className="px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
                Settings
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>
              <button
                onClick={() => setActiveTab('organization')}
                className={`w-full mt-1 flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'organization' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings size={18} />
                <span>Organization</span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full mt-1 flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'profile' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <User size={18} />
                <span>Profile</span>
              </button>
              <button
                onClick={() => setActiveTab('help-support')}
                className={`w-full mt-1 flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'help-support' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <HelpCircle size={18} />
                <span>Help & Support</span>
              </button>
            </div>

            {/* API & Webhooks */}
            <div className="space-y-1">
              <div className="px-4 py-2 text-sm font-medium text-white/60 uppercase tracking-wider">
                API & Webhooks
              </div>
              <button
                onClick={() => setActiveTab('api-credentials')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'api-credentials' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Code size={18} />
                <span>API Credentials</span>
              </button>
              <button
                onClick={() => setActiveTab('api-documentation')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'api-documentation' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText size={18} />
                <span>API Documentation</span>
              </button>
            </div>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-white/20">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="relative z-50 bg-white/10 backdrop-blur-sm border-b border-white/20 px-6 py-4">
          <div className="flex items-center justify-between text-white flex-wrap gap-y-2">
            {/* Left: Welcome + Auth Credit badge */}
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <div>
                <div className="text-lg font-semibold text-white">Welcome, {user.name}</div>
              </div>
              <div className="flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-white/10 border border-white/20">
                <Star size={16} className="text-blue-300" />
                <span className="text-white/90">Auth Credit: {user.authCredit}</span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-4 sm:gap-6">

              {/* User Phone Number */}
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-white/70" />
                <span className="text-white/90">{user.phone}</span>
              </div>

              {/* Customer Care */}
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-white/70" />
                <span className="text-white/90">Support: +91 9871247125</span>
              </div>

              {/* User Profile Dropdown */}
              <div className="relative profile-dropdown z-50">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-2 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-white/80" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 z-[100]">
                    {/* User Info Section */}
                    <div className="p-4 border-b border-white/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                          <img src="/true-otp.svg" alt="TruOTP" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="text-blue-600 hover:text-blue-800 underline text-sm cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>

                    {/* Menu Items Section */}
                    <div className="p-2">
                      <button
                        onClick={handleProfile}
                        className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <User size={16} />
                        Profile
                      </button>
                      <button
                        onClick={handleHelpSupport}
                        className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <HelpCircle size={16} />
                        Help & Support
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </header>

          {/* Organization */}
          {activeTab === 'organization' && (
  <div className="space-y-10">
    {/* ===== Page Header ===== */}
    <header className="mb-4">
      <h1 className="text-4xl font-bold text-white mb-2">Organization</h1>
      <p className="text-white/80">
        Manage your organization, members, API tokens, and groups.
      </p>
    </header>

    {/* ===== Content Card ===== */}
    <Card className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Organization Details</span>
          <span className="text-sm text-white/70">
            Auth Credit: {user.authCredit}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* When no organization exists */}
        {!org ? (
          <div className="space-y-5">
            <div>
              <Label htmlFor="orgName" className="text-white/90">
                Organization Name
              </Label>
              <Input
                id="orgName"
                value={orgNameInput}
                onChange={(e) => setOrgNameInput(e.target.value)}
                placeholder="Enter organization name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl mt-2"
              />
            </div>
            <Button
              onClick={createOrg}
              disabled={orgLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg cursor-pointer"
            >
              {orgLoading ? 'Creating…' : 'Create Organization'}
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* ===== Organization Name Update ===== */}
            <div className="space-y-3">
              <Label htmlFor="updateOrgName" className="text-white/90">
                Organization Name
              </Label>
              <div className="flex gap-3">
                <Input
                  id="updateOrgName"
                  value={orgNameInput}
                  onChange={(e) => setOrgNameInput(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                />
                <Button
                  onClick={updateOrgName}
                  disabled={orgLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg cursor-pointer"
                >
                  {orgLoading ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>

            {/* ===== Members & Tokens ===== */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Members Section */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Organization Members</h3>

                {/* Add Member */}
                <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="grid gap-3">
                    <Input
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="Member email"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                    />
                    <Input
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                      placeholder="Member phone (10-digit)"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                    />
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as any)}
                      className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <Button
                    onClick={addMember}
                    disabled={orgLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {orgLoading ? 'Adding…' : 'Add Member'}
                  </Button>
                </div>

                {/* Members List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4 font-medium text-white">User</th>
                        <th className="text-left py-3 px-4 font-medium text-white">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-white">Phone</th>
                        <th className="text-left py-3 px-4 font-medium text-white">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgMembers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-white/60 py-4">
                            No members yet
                          </td>
                        </tr>
                      ) : (
                        orgMembers.map((m) => (
                          <tr key={m.userId} className="border-b border-white/10">
                            <td className="py-3 px-4 text-white/90">
                              {m.name || m.phone || m.email || m.userId}
                            </td>
                            <td className="py-3 px-4 text-white/90">{m.email || '—'}</td>
                            <td className="py-3 px-4 text-white/90">{m.phone ? `+${m.phone}` : '—'}</td>
                            <td className="py-3 px-4 text-white/90">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  m.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {m.role}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* API Tokens Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">API Tokens</h3>
                  <Button
                    onClick={createOrgToken}
                    disabled={orgLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {orgLoading ? 'Creating…' : 'Create Token'}
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4 font-medium text-white">Token</th>
                        <th className="text-left py-3 px-4 font-medium text-white">Active</th>
                        <th className="text-left py-3 px-4 font-medium text-white">Created</th>
                        <th className="text-left py-3 px-4 font-medium text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgTokens.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-white/60 py-4">
                            No tokens yet
                          </td>
                        </tr>
                      ) : (
                        orgTokens.map((t) => (
                          <tr key={t.id} className="border-b border-white/10">
                            <td
                              className="py-3 px-4 text-white/90 max-w-[200px] truncate"
                              title={t.token}
                            >
                              {t.token}
                            </td>
                            <td className="py-3 px-4 text-white/90">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  t.active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {t.active ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-white/90">{t.createdAt}</td>
                            <td className="py-3 px-4">
                              <Button
                                onClick={() => toggleOrgToken(t.id, !t.active)}
                                variant="outline"
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer"
                              >
                                {t.active ? 'Disable' : 'Enable'}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ===== Groups Section ===== */}
            <div className="space-y-4">
              <h3 className="text-white font-medium">Organization Groups</h3>

              {/* Create Group */}
              <div className="flex gap-2 items-center p-4 bg-white/5 rounded-lg border border-white/10">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl flex-1"
                />
                <Button
                  onClick={createGroup}
                  disabled={orgLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg cursor-pointer"
                >
                  {orgLoading ? 'Creating…' : 'Create Group'}
                </Button>
              </div>

              {/* Group List */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 font-medium text-white">Group Name</th>
                      <th className="text-left py-3 px-4 font-medium text-white">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgGroups.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center text-white/60 py-4">
                          No groups yet
                        </td>
                      </tr>
                    ) : (
                      orgGroups.map((g) => (
                        <tr key={g.id} className="border-b border-white/10">
                          <td className="py-3 px-4 text-white/90">{g.name}</td>
                          <td className="py-3 px-4 text-white/90">{g.createdAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Member to Group */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-medium mb-3">Add Member to Group</h4>
                <div className="grid sm:grid-cols-3 gap-3 items-center">
                  <select
                    value={groupSelectId}
                    onChange={(e) => setGroupSelectId(e.target.value ? Number(e.target.value) : '')}
                    className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2"
                  >
                    <option value="">Select group</option>
                    {orgGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={groupSelectUserId}
                    onChange={(e) =>
                      setGroupSelectUserId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2"
                  >
                    <option value="">Select member</option>
                    {orgMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name || m.email || m.phone || m.userId}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={addMemberToGroup}
                    disabled={orgLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {orgLoading ? 'Adding…' : 'Add to Group'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
)}


        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6">
          {/* Purchase Prompt Banner when trial is blocked */}
          {gating?.trialBlocked && (
            <div className="mb-4 rounded-lg border border-yellow-400/40 bg-yellow-500/10 text-yellow-100 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm">
                  {gating.reason === 'credits_exhausted' ? (
                    <>
                      <strong className="font-semibold">Free trial ended.</strong> Your 10 free auth credits have been used. To continue using the service, please purchase a plan.
                    </>
                  ) : (
                    <>
                      <strong className="font-semibold">Access paused due to inactivity.</strong> You’ve been inactive for 90+ days. Buy a plan to keep using the service.
                    </>
                  )}
                </div>
                <div>
                  <Button
                    onClick={() => {
                      const link = (gating?.purchaseLink || process.env.NEXT_PUBLIC_PAYMENT_LINK_URL || '').toString();
                      if (link) {
                        window.location.href = link;
                      } else {
                        alert('Payment link not configured. Please set NEXT_PUBLIC_PAYMENT_LINK_URL.');
                      }
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                  >
                    Buy a plan
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">
                    Welcome, {user.name}
                  </h1>
                  {isBotLogin() && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Bot Verified</span>
                    </div>
                  )}
                </div>
                <p className="text-white/80 text-lg">
                  {isBotLogin() 
                    ? "You've successfully logged in via bot verification. Your dashboard is ready!"
                    : "Build the future of Merchant Businesses & Financial Services with TruOTP APIs"
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Key Stats (user-specific) */}
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-white">Your Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-white/60">Active Sessions</div>
                        <div className="text-3xl font-bold text-blue-300">{summary.myActiveSessions}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-white/60">Pending QR Requests</div>
                        <div className="text-3xl font-bold text-purple-300">{summary.myPendingRequests}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-white/60">My Tickets</div>
                        <div className="text-3xl font-bold text-emerald-300">{summary.myTickets}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-white/60">Last Login</div>
                        <div className="text-lg font-semibold text-white/90">{summary.lastLogin || '—'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions + Mini Metrics */}
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden relative">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Quick Actions</span>
                      <span className="text-xs text-white/60">Last 7 days</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <Button onClick={()=> setActiveTab('auth-report')} className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-white">View My Auth Report</Button>
                      <Button onClick={()=> setActiveTab('help-support')} variant="outline" className="cursor-pointer border-white/20 text-white bg-white/10 hover:bg-white/20">Create Support Ticket</Button>
                      <Button onClick={()=> setActiveTab('settings')} variant="outline" className="cursor-pointer border-white/20 text-white bg-white/10 hover:bg-white/20">Update Settings</Button>
                      <Button onClick={()=> setActiveTab('usage-report')} variant="outline" className="cursor-pointer border-white/20 text-white bg-white/10 hover:bg-white/20">View Usage</Button>
                    </div>
                    <div className="h-28 flex items-end gap-2">
                      {metrics.length === 0 ? (
                        <div className="text-white/60 text-sm">No data yet</div>
                      ) : (
                        metrics.map((m) => (
                          <div key={m.date} className="flex-1 flex flex-col justify-end">
                            <div className="bg-blue-500/70 rounded-t w-full" style={{height: `${Math.min(100, (m.total||0) * 10)}%`}}></div>
                            <div className="bg-emerald-500/80 rounded-t w-full mt-0.5" style={{height: `${Math.min(100, (m.verified||0) * 10)}%`}}></div>
                            <div className="text-[10px] text-white/50 text-center mt-1">{m.date.slice(5)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Live Session Report */}
          {activeTab === 'live-session' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Live Session Report</h1>
                <p className="text-white/80">Any live session that is active will be shown here.</p>
              </div>

              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Live Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left py-3 px-4 font-medium text-white">ID</th>
                          <th className="text-left py-3 px-4 font-medium text-white">User Name</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Mobile No</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveSessions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-white/60">
                              No active sessions found
                            </td>
                          </tr>
                        ) : (
                          liveSessions.map((session) => (
                            <tr key={session.id} className="border-b border-white/10">
                              <td className="py-3 px-4 text-white/90">{session.id}</td>
                              <td className="py-3 px-4 text-white/90">{session.userName}</td>
                              <td className="py-3 px-4 text-white/90">{session.mobileNo}</td>
                              <td className="py-3 px-4 text-white/90">{session.type}</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {session.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Auth Report */}
          {activeTab === 'auth-report' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Auth Report</h1>
                <p className="text-white/80">The transaction history of all sessions will be shown here.</p>
              </div>

              {/* Search Section */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <Label htmlFor="fromDate" className="text-white/90">From Date</Label>
                      <Input
                        id="fromDate"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <Label htmlFor="toDate" className="text-white/90">To Date</Label>
                      <Input
                        id="toDate"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <Button onClick={handleSearch} className="flex items-center gap-2 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600">
                      <Search size={16} />
                      Search
                    </Button>
                    <Button variant="outline" onClick={handleExportReport} className="flex items-center gap-2 cursor-pointer bg-blue-600/80 text-white hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent">
                      <Download size={16} />
                      Export Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Auth Report Table */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Auth Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left py-3 px-4 font-medium text-white">ID</th>
                          <th className="text-left py-3 px-4 font-medium text-white">User Name</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Mobile No</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authReports.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-white/60">
                              No auth reports found
                            </td>
                          </tr>
                        ) : (
                          authReports.map((report) => (
                            <tr key={report.id} className="border-b border-white/10">
                              <td className="py-3 px-4 text-white/90">{report.id}</td>
                              <td className="py-3 px-4 text-white/90">{report.userName}</td>
                              <td className="py-3 px-4 text-white/90">{report.mobileNo}</td>
                              <td className="py-3 px-4 text-white/90">{report.type}</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {report.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-white/90">{report.date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Usage Report */}
          {activeTab === 'usage-report' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Usage Report</h1>
                <p className="text-white/80">Auth credit usage transactions will be shown here.</p>
              </div>

              {/* Search Section */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <Label htmlFor="fromDateUsage" className="text-white/90">From Date</Label>
                      <Input
                        id="fromDateUsage"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <Label htmlFor="toDateUsage" className="text-white/90">To Date</Label>
                      <Input
                        id="toDateUsage"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <Button onClick={handleSearch} className="flex items-center gap-2 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600">
                      <Search size={16} />
                      Search
                    </Button>
                    <Button variant="outline" onClick={handleExportReport} className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent">
                      <Download size={16} />
                      Export Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Report Table */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Usage Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left py-3 px-4 font-medium text-white">ID</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Session ID</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Credit</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Debit</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Balance</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Remark</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageReports.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-white/60">
                              No usage reports found
                            </td>
                          </tr>
                        ) : (
                          usageReports.map((report) => (
                            <tr key={report.id} className="border-b border-white/10">
                              <td className="py-3 px-4 text-white/90">{report.id}</td>
                              <td className="py-3 px-4 text-white/90">{report.sessionId}</td>
                              <td className="py-3 px-4 text-white/90">{report.credit}</td>
                              <td className="py-3 px-4 text-white/90">{report.debit}</td>
                              <td className="py-3 px-4 text-white/90">{report.balance}</td>
                              <td className="py-3 px-4 text-white/90">{report.type}</td>
                              <td className="py-3 px-4 text-white/90">{report.remark}</td>
                              <td className="py-3 px-4 text-white/90">{report.date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Packages */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Authentication Plans</h1>
                <p className="text-white/80">Choose the right authentication plan to secure and streamline your verification process.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan, index) => (
                  <Card key={index} className="text-center bg-white/10 backdrop-blur-sm border border-white/20">
                    <CardHeader>
                      <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold text-blue-300">{plan.authCredit}</div>
                        <div className="text-sm text-white/70">Auth Credit</div>
                      </div>
                      <div className="flex justify-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">W</span>
                        </div>
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">C</span>
                        </div>
                      </div>
                      <div className="text-sm text-white/70">Authentication Type</div>
                      <div>
                        <div className="text-xl font-bold text-white">{plan.planAmount}</div>
                        <div className="text-sm text-white/70">Plan Amount</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">{plan.validity}</div>
                        <div className="text-sm text-white/70">Validity</div>
                      </div>
                      <Button 
                        onClick={() => handleBuyPlan(plan.name)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow hover:shadow-blue-500/25 cursor-pointer"
                      >
                        Buy Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Terms & Conditions */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-white/80">
                    <li>Prices are exclusive of applicable Government levies and taxes.</li>
                    <li>Delivery of the service will be through APIs to be consumed by you in your application / website.</li>
                    <li>The charges are subject to change without prior notice.</li>
                    <li>1 Year Validity from the date of purchase.</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transaction Report */}
          {activeTab === 'transaction-report' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Transaction Report</h1>
                <p className="text-white/80">Plan purchase transactions will be shown here.</p>
              </div>

              {/* Search Section */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <Label htmlFor="fromDateTxn" className="text-white/90">From Date</Label>
                      <Input
                        id="fromDateTxn"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <Label htmlFor="toDateTxn" className="text-white/90">To Date</Label>
                      <Input
                        id="toDateTxn"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <Button onClick={handleSearch} className="flex items-center gap-2 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600">
                      <Search size={16} />
                      Search
                    </Button>
                    <Button variant="outline" onClick={handleExportReport} className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent">
                      <Download size={16} />
                      Export Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Report Table */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Transaction Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left py-3 px-4 font-medium text-white">ID</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Wallet ID</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Txn ID</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-white">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-white/60">
                              No transactions found
                            </td>
                          </tr>
                        ) : (
                          transactions.map((txn) => (
                            <tr key={txn.id} className="border-b border-white/10">
                              <td className="py-3 px-4 text-white/90">{txn.id}</td>
                              <td className="py-3 px-4 text-white/90">{txn.walletId}</td>
                              <td className="py-3 px-4 text-white/90">{txn.txnId}</td>
                              <td className="py-3 px-4 text-white/90">₹{txn.amount}</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {txn.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-white/90">{txn.date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Auth Settings</h1>
                <p className="text-white/80">Manage your authentication settings and preferences in one place.</p>
              </div>

              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Session Expire</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80 mb-4">Set the OTP session expiry time here (in seconds).</p>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="sessionExpire" className="text-white/90">Expiry Time</Label>
                      <Input
                        id="sessionExpire"
                        type="number"
                        value={sessionExpire}
                        onChange={(e) => setSessionExpire(e.target.value)}
                        min="60"
                        max="180"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="px-4 py-2 bg-white/10 rounded-md text-white/80">
                      Seconds
                    </div>
                    <Button 
                      disabled={savingSettings} 
                      onClick={handleUpdateSettings}
                      className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {savingSettings ? 'Saving...' : settingsSaved ? 'Saved' : 'Update'}
                    </Button>
                  </div>
                  <p className="text-sm text-white/60 mt-2">Set the expiry time between 60 to 180 seconds.</p>
                </CardContent>
              </Card>

              {/* Notification Preferences */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border border-white/20 rounded-md">
                      <div>
                        <div className="font-medium text-white">Email Notifications</div>
                        <div className="text-sm text-white/70">Receive updates and ticket replies via email</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifyEmail(!notifyEmail)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifyEmail ? 'bg-blue-600' : 'bg-gray-500'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifyEmail ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-white/20 rounded-md">
                      <div>
                        <div className="font-medium text-white">WhatsApp/SMS Notifications</div>
                        <div className="text-sm text-white/70">Receive important alerts on your phone</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifyWhatsApp(!notifyWhatsApp)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifyWhatsApp ? 'bg-green-600' : 'bg-gray-500'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifyWhatsApp ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button 
                      disabled={savingPrefs} 
                      onClick={handleSavePreferences}
                      className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {savingPrefs ? 'Saving...' : prefsSaved ? 'Saved' : 'Save Preferences'}
                    </Button>
                    {prefsSaved && <span className="text-sm text-green-400">Saved</span>}
                  </div>
                </CardContent>
              </Card>

              {/* Security Options */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 border border-white/20 rounded-md">
                    <div>
                      <div className="font-medium text-white">Login Alerts</div>
                      <div className="text-sm text-white/70">Notify me when my account logs in from a new device</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoginAlerts(!loginAlerts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${loginAlerts ? 'bg-blue-600' : 'bg-gray-500'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${loginAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      disabled={revoking} 
                      onClick={handleRevokeSessions}
                      className="cursor-pointer bg-white/10 border border-white/40 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                      {revoking ? 'Revoking...' : 'Revoke Other Sessions'}
                    </Button>
                    {revoked && <span className="text-sm text-green-400">Done</span>}
                  </div>
                </CardContent>
              </Card>

              {/* Appearance & Language */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Appearance & Language</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border border-white/20 rounded-md">
                      <div>
                        <div className="font-medium text-white">Compact Mode</div>
                        <div className="text-sm text-white/70">Reduce paddings and spacing</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompactMode(!compactMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${compactMode ? 'bg-blue-600' : 'bg-gray-500'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${compactMode ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-white/20 rounded-md">
                      <div>
                        <div className="font-medium text-white">Language</div>
                        <div className="text-sm text-white/70">Choose your preferred language</div>
                      </div>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="text-sm bg-white/10 border border-white/20 text-white rounded-md px-2 py-1"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button 
                      disabled={savingAppearance} 
                      onClick={handleSaveAppearance}
                      className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {savingAppearance ? 'Saving...' : appearanceSaved ? 'Saved' : 'Save Changes'}
                    </Button>
                    {appearanceSaved && <span className="text-sm text-green-400">Saved</span>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
                <p className="text-white/80">View and update your account information.</p>
              </div>

              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/90">Full Name</Label>
                      <Input 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        className="bg-white/10 border-white/20 text-white" 
                      />
                    </div>
                    <div>
                      <Label className="text-white/90">Email</Label>
                      <Input 
                        value={user.email} 
                        readOnly 
                        className="bg-white/10 border-white/20 text-white/70" 
                      />
                    </div>
                    <div>
                      <Label className="text-white/90">Phone</Label>
                      <Input 
                        value={user.phone} 
                        readOnly 
                        className="bg-white/10 border-white/20 text-white/70" 
                      />
                    </div>
                    <div>
                      <Label className="text-white/90">Auth Credit</Label>
                      <Input 
                        value={String(user.authCredit)} 
                        readOnly 
                        className="bg-white/10 border-white/20 text-white/70" 
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button 
                      onClick={handleUpdateProfile}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white cursor-pointer"
                    >
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditName(user.name)} 
                      className="cursor-pointer bg-white/10 border-white/20 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/30"
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setActiveTab('dashboard')} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white cursor-pointer"
                >
                  Back to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('settings')} 
                  className="cursor-pointer bg-white/10 border-white/20 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Go to Settings
                </Button>
              </div>
            </div>
          )}

          {/* Help & Support */}
          {activeTab === 'help-support' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Help & Support</h1>
                <p className="text-white/80">Find answers fast or reach our team.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* FAQs */}
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white">Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-white font-medium">How do I log in with QR?</p>
                        <p className="text-white/80 text-sm">Go to Login → QR Login, scan the code, and send the pre-filled hash via WhatsApp/SMS.</p>
                      </div>
                      <div>
                        <p className="text-white font-medium">The SMS app doesn't open after scanning.</p>
                        <p className="text-white/80 text-sm">Ensure your device supports SMSTO links or use the buttons under the QR to open WhatsApp/SMS directly.</p>
                      </div>
                      <div>
                        <p className="text-white font-medium">Where can I see my activity?</p>
                        <p className="text-white/80 text-sm">Check Usage Report for your entries or export them as CSV.</p>
                      </div>
                      <div>
                        <p className="text-white font-medium">How do I contact support?</p>
                        <p className="text-white/80 text-sm">Use the Contact Support panel to email or call us, or create a support ticket below.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact / Channels */}
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Contact Support</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-white/90 text-sm">Email: info@eienonetech.com</div>
                    <div className="text-white/90 text-sm">Phone: +919756862551</div>
                    <div className="text-white/90 text-sm">Hours: Mon–Fri 9:00–18:00 EST, Sat 10:00–16:00 EST</div>
                    <div className="text-white/80 text-xs">
                      Address: 2nd floor, Mindmill Corporate Tower, 24A Film City, Noida, UP 201301, India
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/90 text-sm">Subject</Label>
                      <Input 
                        id="ticket-subject" 
                        className="bg-white/10 border-white/20 text-white" 
                        placeholder="Brief summary" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/90 text-sm">Message</Label>
                      <textarea 
                        id="ticket-message" 
                        className="w-full min-h-[100px] rounded-md bg-white/10 border border-white/20 text-white p-2 text-sm" 
                        placeholder="Describe your issue"
                      ></textarea>
                    </div>
                    <Button 
                      onClick={handleCreateTicket}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white cursor-pointer"
                    >
                      Create Ticket
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Recent tickets (live) */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-white">My Support Tickets</CardTitle>
                    <div className="flex items-center gap-2">
                      <Label className="text-white/80 text-xs">Filter</Label>
                      <select
                        value={ticketFilter}
                        onChange={(e) => { setTicketFilter(e.target.value as any); setTicketsShown(10); }}
                        className="text-xs bg-white/10 border border-white/20 text-white rounded-md px-2 py-1"
                      >
                        <option value="all">All</option>
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20 text-white/80">
                          <th className="text-left py-3 px-4 text-sm font-medium">Ticket #</th>
                          <th className="text-left py-3 px-4 text-sm font-medium">Subject</th>
                          <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filtered = tickets.filter((t: any) => {
                            const s = String(t.status || '').toLowerCase();
                            if (ticketFilter === 'open') return s === 'open';
                            if (ticketFilter === 'resolved') return s === 'resolved' || s === 'closed';
                            return true;
                          });
                          const toShow = filtered.slice(0, ticketsShown);
                          if (toShow.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="py-6 px-4 text-white/70 text-center text-sm">No tickets found.</td>
                              </tr>
                            );
                          }
                          return toShow.map((t: any) => (
                            <tr key={t.id} className="border-b border-white/10">
                              <td className="py-3 px-4 text-white/90 text-sm">{t.id}</td>
                              <td className="py-3 px-4 text-white/90 text-sm">{t.subject}</td>
                              <td className="py-3 px-4">
                                {(() => {
                                  const status = String(t.status || '').toLowerCase();
                                  const isOpen = status === 'open';
                                  return (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isOpen ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                      {isOpen ? 'Open' : 'Resolved'}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4 text-white/80 text-sm">{t.created_at || ''}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-center">
                    {tickets.filter((t: any) => {
                      const s = String(t.status || '').toLowerCase();
                      if (ticketFilter === 'open') return s === 'open';
                      if (ticketFilter === 'resolved') return s === 'resolved' || s === 'closed';
                      return true;
                    }).length > ticketsShown && (
                      <Button 
                        variant="outline" 
                        onClick={() => setTicketsShown(v => v + 10)} 
                        className="cursor-pointer bg-white/10 border-white/20 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/30"
                      >
                        Load more
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* API Credentials */}
          {activeTab === 'api-credentials' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">API Credentials</h1>
                <p className="text-white/80">Manage your API keys and credentials for integration.</p>
              </div>

              {/* API Keys */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">API Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Live Key */}
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-center gap-4">
                        <div>
                          <h3 className="font-medium text-white">Production API Key</h3>
                          <p className="text-sm text-white/70">Use this key for production applications</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent"
                            disabled={regenLiveLoading}
                            onClick={() => regenerateKey('live')}
                          >
                            {regenLiveLoading ? 'Regenerating...' : 'Regenerate'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent"
                            onClick={() => navigator.clipboard.writeText(apiLiveKey)}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-white/10 border border-white/20 rounded font-mono text-sm text-white/90 break-all">
                        {apiLiveKey || '—'}
                      </div>
                    </div>
                    {/* Test Key */}
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-center gap-4">
                        <div>
                          <h3 className="font-medium text-white">Test API Key</h3>
                          <p className="text-sm text-white/70">Use this key for testing and development</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent"
                            disabled={regenTestLoading}
                            onClick={() => regenerateKey('test')}
                          >
                            {regenTestLoading ? 'Regenerating...' : 'Regenerate'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent"
                            onClick={() => navigator.clipboard.writeText(apiTestKey)}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-white/10 border border-white/20 rounded font-mono text-sm text-white/90 break-all">
                        {apiTestKey || '—'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Webhook URL */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Inbound Webhook</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <h3 className="font-medium text-white">Unique endpoint</h3>
                        <p className="text-sm text-white/70">Give this URL to your provider or system to deliver events</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="cursor-pointer bg-indigo-600/80 text-white hover:bg-indigo-600 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent"
                          disabled={!webhookUrl}
                          onClick={() => webhookUrl && navigator.clipboard.writeText(webhookUrl)}
                        >
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="cursor-pointer bg-orange-600/80 text-white hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-white/30 border-transparent"
                          disabled={rotateWebhookLoading}
                          onClick={rotateWebhook}
                        >
                          {rotateWebhookLoading ? 'Rotating...' : 'Rotate Token'}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-white/10 border border-white/20 rounded font-mono text-sm text-white/90 break-all">
                      {webhookUrl || '—'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* API Documentation */}
          {activeTab === 'api-documentation' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">API Documentation</h1>
                <p className="text-white/80">Complete guide to integrate TruOTP APIs into your application.</p>
              </div>

              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Quick Start</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2 text-white">1. Request QR Code</h3>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                        <div>POST /api/auth/request-qr</div>
                        <div className="text-gray-400 mt-2">{'{'}</div>
                        <div className="ml-4">"phone": "+1234567890"</div>
                        <div className="text-gray-400">{'}'}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2 text-white">2. Verify Hash</h3>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                        <div>POST /api/auth/verify-hash</div>
                        <div className="text-gray-400 mt-2">{'{'}</div>
                        <div className="ml-4">"phone": "+1234567890",</div>
                        <div className="ml-4">"hash": "abc123def456..."</div>
                        <div className="text-gray-400">{'}'}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white/10 backdrop-blur-sm border-t border-white/20 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-white/70">
              © Eienone Technology Pvt Ltd. 2024-25, All Rights Reserved.
            </div>
            <div className="flex gap-4 text-sm">
              <a href="#" className="text-white/70 hover:text-white cursor-pointer">Privacy Policy</a>
              <a href="#" className="text-white/70 hover:text-white cursor-pointer">T&C</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      <div className="fixed top-4 right-4 z-[1000] w-[22rem] max-w-[90vw] space-y-3">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`relative overflow-hidden rounded-xl border p-4 shadow-xl backdrop-blur-sm text-white ${
              t.variant === 'success'
                ? 'bg-emerald-600/90 border-emerald-400/50'
                : t.variant === 'error'
                ? 'bg-rose-600/90 border-rose-400/50'
                : t.variant === 'warning'
                ? 'bg-amber-500/90 border-amber-300/50'
                : 'bg-blue-600/90 border-blue-400/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {t.variant === 'success' ? (
                  <CheckCircle2 size={20} />
                ) : t.variant === 'error' ? (
                  <XCircle size={20} />
                ) : t.variant === 'warning' ? (
                  <AlertTriangle size={20} />
                ) : (
                  <Info size={20} />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold leading-tight">{t.title}</div>
                {t.description ? (
                  <div className="text-sm/6 opacity-90">{t.description}</div>
                ) : null}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-white/80 hover:text-white transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}