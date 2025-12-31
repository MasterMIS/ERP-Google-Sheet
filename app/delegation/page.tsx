'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ensureSessionId } from '@/utils/session';
import { formatDateToLocalTimezone } from '@/utils/timezone';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';
import DateRangePicker from '@/components/DateRangePicker';

interface Delegation {
  id: number;
  delegation_name: string;
  description: string;
  assigned_to: string;
  doer_name: string;
  department: string;
  priority: string;
  status: string;
  due_date: string;
  voice_note_url?: string;
  reference_docs?: string[];
  evidence_required: boolean;
  created_at: string;
  remarks?: Remark[];
  revision_history?: RevisionHistory[];
}

interface Remark {
  id: number;
  delegation_id: number;
  user_id: number;
  username: string;
  remark: string;
  created_at: string;
}

interface RevisionHistory {
  id: number;
  delegation_id: number;
  old_due_date: string;
  new_due_date: string;
  old_status: string;
  new_status: string;
  reason: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  image_url?: string;
}

const DEPARTMENTS = [
  'Sales', 'Marketing', 'Human Resources', 'Finance', 'IT',
  'Operations', 'Customer Service', 'Product Development', 'Legal'
];

const PRIORITIES = [
  { value: 'high', label: 'High', color: 'bg-red-500 text-white' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500 text-white' },
  { value: 'low', label: 'Low', color: 'bg-green-500 text-white' }
];

const TASK_STATUSES = [
  { value: 'need_clarity', label: 'Need Clarity', color: 'bg-yellow-500 text-white', icon: '❓' },
  { value: 'approval_waiting', label: 'Approval Waiting', color: 'bg-blue-500 text-white', icon: '⏳' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500 text-white', icon: '✓' },
  { value: 'need_revision', label: 'Need Revision', color: 'bg-orange-500 text-white', icon: '🔄' },
  { value: 'hold', label: 'Hold', color: 'bg-gray-500 text-white', icon: '⏸' }
];

export default function DelegationPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [sortField, setSortField] = useState<'id' | 'created_at' | 'delegation_name' | 'assigned_to' | 'doer_name' | 'department' | 'priority' | 'due_date' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const toast = useToast();
  const loader = useLoader();

  // Details drawer state
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);
  const [taskStatus, setTaskStatus] = useState('');
  const [revisedDueDate, setRevisedDueDate] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [revisionHistory, setRevisionHistory] = useState<RevisionHistory[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const [filterPos, setFilterPos] = useState({ top: 0, right: 0 });
  const [filters, setFilters] = useState({
    tasks: [] as string[],
    assignees: [] as string[],
    doers: [] as string[],
    departments: [] as string[],
    priorities: [] as string[],
    statuses: [] as string[],
    evidenceRequired: null as boolean | null,
    dueDateFrom: '',
    dueDateTo: '',
  });
  const [filterSearches, setFilterSearches] = useState({
    task: '',
    assignee: '',
    doer: '',
    department: '',
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    assigneeName: '',
    doerName: '',
    department: '',
    priority: 'medium',
    taskDescription: '',
    dueDateTime: '',
    voiceNote: null as File | null,
    referenceDocs: [] as File[],
    evidenceRequired: false,
  });

  // Date Time Picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Revised Date Time Picker state for drawer
  const [showRevisedDatePicker, setShowRevisedDatePicker] = useState(false);
  const [showRevisedTimePicker, setShowRevisedTimePicker] = useState(false);
  const [revisedSelectedDate, setRevisedSelectedDate] = useState(new Date());
  const [revisedSelectedHour, setRevisedSelectedHour] = useState(12);
  const [revisedSelectedMinute, setRevisedSelectedMinute] = useState(0);
  const [revisedSelectedPeriod, setRevisedSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // State to track existing files when editing
  const [existingVoiceNote, setExistingVoiceNote] = useState<string>('');
  const [existingReferenceDocs, setExistingReferenceDocs] = useState<string[]>([]);

  // Searchable dropdown states
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [doerSearch, setDoerSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDoerDropdown, setShowDoerDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  
  // Custom departments management
  const [customDepartments, setCustomDepartments] = useState<string[]>([]);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'tile'>('list');

  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionId = ensureSessionId();
        const response = await fetch('/api/auth', { headers: { 'x-session-id': sessionId } });
        const data = await response.json();

        if (!data.authenticated) {
          router.push('/login');
          return;
        }

        setUser(data.user);
        fetchUsers();
        fetchDelegations(data.user.id);
        
        // Load custom departments from localStorage
        const savedDepartments = localStorage.getItem('customDepartments');
        if (savedDepartments) {
          setCustomDepartments(JSON.parse(savedDepartments));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDelegations = async (userId: number) => {
    try {
      const response = await fetch(`/api/delegations?userId=${userId}`);
      const data = await response.json();
      setDelegations(data.delegations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching delegations:', error);
      setLoading(false);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calendar helper functions
  const getCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getTasksForDate = (date: Date) => {
    return sortedDelegations.filter((delegation: Delegation) => {
      if (!delegation.due_date) return false;
      const dueDate = new Date(delegation.due_date);
      return dueDate.getDate() === date.getDate() &&
             dueDate.getMonth() === date.getMonth() &&
             dueDate.getFullYear() === date.getFullYear();
    });
  };

  const [calendarDate, setCalendarDate] = useState(new Date());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        referenceDocs: [...formData.referenceDocs, ...Array.from(e.target.files)]
      });
    }
  };

  const removeFile = (index: number) => {
    setFormData({
      ...formData,
      referenceDocs: formData.referenceDocs.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assigneeName || !formData.doerName || !formData.taskDescription) {
      toast.warning('Please fill in all required fields');
      return;
    }

    loader.showLoader();

    try {
      // Upload voice note if new one exists, otherwise keep existing
      let voiceNoteUrl = existingVoiceNote; // Keep existing by default
      if (audioBlob) {
        // User uploaded new voice note, replace the old one
        const voiceFormData = new FormData();
        voiceFormData.append('file', audioBlob, 'voice-note.webm');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: voiceFormData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          voiceNoteUrl = uploadData.url;
        }
      }

      // Upload reference docs if new ones exist, otherwise keep existing
      let docUrls: string[] = [...existingReferenceDocs]; // Keep existing by default
      if (formData.referenceDocs.length > 0) {
        // User uploaded new docs, replace the old ones
        docUrls = [];
        for (const file of formData.referenceDocs) {
          const docFormData = new FormData();
          docFormData.append('file', file);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: docFormData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            docUrls.push(uploadData.url);
          }
        }
      }

      const delegationData = {
        userId: user.id,
        delegationName: formData.taskDescription,
        description: formData.taskDescription,
        assignedTo: formData.assigneeName,
        doerName: formData.doerName,
        department: formData.department,
        priority: formData.priority,
        status: 'pending',
        dueDate: formData.dueDateTime,
        voiceNoteUrl,
        referenceDocs: docUrls,
        evidenceRequired: formData.evidenceRequired,
      };

      const response = await fetch('/api/delegations', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...delegationData } : delegationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to save');
      }

      loader.hideLoader();
      toast.success(editingId ? 'Delegation updated successfully!' : 'Delegation created successfully!');

      fetchDelegations(user.id);
      closeModal();
    } catch (error: any) {
      console.error('Error saving delegation:', error);
      loader.hideLoader();
      toast.error(error.message || 'Failed to save delegation. Please try again.');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      assigneeName: '',
      doerName: '',
      department: '',
      priority: 'medium',
      taskDescription: '',
      dueDateTime: '',
      voiceNote: null,
      referenceDocs: [],
      evidenceRequired: false,
    });
    setAudioBlob(null);
    setRecordingTime(0);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setExistingVoiceNote('');
    setExistingReferenceDocs([]);
    setAssigneeSearch('');
    setDoerSearch('');
    setDepartmentSearch('');
    setShowAssigneeDropdown(false);
    setShowDoerDropdown(false);
    setShowDepartmentDropdown(false);
  };

  const handleAddDepartment = () => {
    if (!newDepartmentName.trim()) {
      toast.error('Please enter a department name');
      return;
    }
    
    const trimmedName = newDepartmentName.trim();
    
    // Check if department already exists in static or custom list
    if (DEPARTMENTS.includes(trimmedName) || customDepartments.includes(trimmedName)) {
      toast.error('Department already exists');
      return;
    }
    
    const updatedDepartments = [...customDepartments, trimmedName].sort();
    setCustomDepartments(updatedDepartments);
    localStorage.setItem('customDepartments', JSON.stringify(updatedDepartments));
    
    // Set the new department as selected
    setFormData({ ...formData, department: trimmedName });
    
    toast.success('Department added successfully!');
    setShowAddDepartmentModal(false);
    setNewDepartmentName('');
    setShowDepartmentDropdown(false);
  };

  const handleEdit = (delegation: Delegation) => {
    setEditingId(delegation.id);

    // Store existing files
    setExistingVoiceNote(delegation.voice_note_url || '');
    setExistingReferenceDocs(
      typeof delegation.reference_docs === 'string'
        ? JSON.parse(delegation.reference_docs || '[]')
        : delegation.reference_docs || []
    );

    setFormData({
      assigneeName: delegation.assigned_to,
      doerName: delegation.doer_name || '',
      department: delegation.department || '',
      priority: delegation.priority || 'medium',
      taskDescription: delegation.description || '',
      dueDateTime: delegation.due_date || '',
      voiceNote: null,
      referenceDocs: [],
      evidenceRequired: delegation.evidence_required || false,
    });

    // Set date/time picker values if due date exists
    if (delegation.due_date) {
      const dueDate = new Date(delegation.due_date);
      setSelectedDate(dueDate);

      let hours = dueDate.getHours();
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;

      setSelectedHour(hours);
      setSelectedMinute(Math.floor(dueDate.getMinutes() / 15) * 15);
      setSelectedPeriod(period);
    }

    setShowModal(true);
  };

  const handleDateTimeSet = () => {
    const hour24 = selectedPeriod === 'PM' && selectedHour !== 12
      ? selectedHour + 12
      : selectedPeriod === 'AM' && selectedHour === 12
        ? 0
        : selectedHour;

    const dateTime = new Date(selectedDate);
    dateTime.setHours(hour24, selectedMinute, 0, 0);

    setFormData({
      ...formData,
      dueDateTime: dateTime.toISOString()
    });
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const openDeleteModal = (id: number) => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    setDeleting(true);
    loader.showLoader();

    try {
      const response = await fetch(`/api/delegations?id=${deleteTargetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Delegation deleted successfully!');
      fetchDelegations(user.id);
    } catch (error) {
      toast.error('Failed to delete delegation. Please try again.');
    } finally {
      loader.hideLoader();
      setDeleting(false);
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleExportCSV = () => {
    try {
      // Define CSV headers
      const headers = [
        'Task Name',
        'Assignee',
        'Doer',
        'Department',
        'Priority',
        'Status',
        'Due Date',
        'Created Date',
        'Evidence'
      ];

      // Convert data to CSV rows
      const rows = sortedDelegations.map((delegation: Delegation) => {
        const status = delegation.status === 'need_clarity' ? 'Need Clarity' :
                      delegation.status === 'approval_waiting' ? 'Approval Waiting' :
                      delegation.status === 'completed' ? 'Completed' :
                      delegation.status === 'need_revision' ? 'Need Revision' :
                      delegation.status === 'hold' ? 'Hold' : delegation.status || 'Pending';
        
        return [
          delegation.delegation_name || '',
          delegation.assigned_to || '',
          delegation.doer_name || '',
          delegation.department || '',
          delegation.priority || '',
          status,
          delegation.due_date ? formatDateToLocalTimezone(delegation.due_date) : '',
          delegation.created_at ? formatDateToLocalTimezone(delegation.created_at) : '',
          delegation.evidence_required ? 'Yes' : 'No'
        ].map(field => {
          // Escape double quotes and wrap in quotes if contains comma, newline, or quote
          const escaped = String(field).replace(/"/g, '""');
          return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
        }).join(',');
      });

      // Combine headers and rows
      const csv = [headers.join(','), ...rows].join('\n');

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `delegations_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${sortedDelegations.length} delegations to CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV. Please try again.');
    }
  };

  const handleViewDetails = async (delegation: Delegation) => {
    setSelectedDelegation(delegation);
    setTaskStatus(delegation.status || '');
    setRevisedDueDate('');
    setRemarkText('');
    setRemarks([]);
    setRevisionHistory([]);

    // Open drawer immediately
    setShowDetailsDrawer(true);

    // Fetch remarks and revision history in parallel
    setLoadingRemarks(true);
    setLoadingHistory(true);

    try {
      const [remarksRes, historyRes] = await Promise.all([
        fetch(`/api/delegations/remarks?delegationId=${delegation.id}`),
        fetch(`/api/delegations/history?delegationId=${delegation.id}`)
      ]);

      if (remarksRes.ok) {
        const remarksData = await remarksRes.json();
        setRemarks(remarksData.remarks || []);
      }
      setLoadingRemarks(false);

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setRevisionHistory(historyData.history || []);
      }
      setLoadingHistory(false);
    } catch (error) {
      console.error('Error fetching details:', error);
      setLoadingRemarks(false);
      setLoadingHistory(false);
      toast.error('Failed to load some data. Please try again.');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedDelegation) return;

    if ((taskStatus === 'need_revision' || taskStatus === 'hold') && !revisedDueDate) {
      toast.warning('Please provide revised due date');
      return;
    }

    loader.showLoader();

    try {
      const response = await fetch('/api/delegations/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegationId: selectedDelegation.id,
          status: taskStatus,
          revisedDueDate: revisedDueDate || null,
          remark: remarkText || null,
          userId: user.id
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      const updatedDate = revisedDueDate || selectedDelegation.due_date;

      // Update local state instead of fetching all delegations
      setDelegations(prev => prev.map(d =>
        d.id === selectedDelegation.id
          ? { ...d, status: taskStatus, due_date: updatedDate }
          : d
      ));

      // Update selected delegation for drawer
      const updatedDelegation = {
        ...selectedDelegation,
        status: taskStatus,
        due_date: updatedDate
      };
      setSelectedDelegation(updatedDelegation);

      // Clear form fields
      setRemarkText('');
      setTaskStatus('');
      setRevisedDueDate('');

      loader.hideLoader();
      toast.success('Status updated successfully!');

      // Refresh details in background (non-blocking)
      handleViewDetails(updatedDelegation);
    } catch (error) {
      loader.hideLoader();
      toast.error('Failed to update status');
    }
  };

  const handleAddRemark = async () => {
    if (!selectedDelegation || !remarkText.trim()) {
      toast.warning('Please enter a remark');
      return;
    }

    loader.showLoader();

    try {
      const response = await fetch('/api/delegations/remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegationId: selectedDelegation.id,
          userId: user.id,
          remark: remarkText
        }),
      });

      if (!response.ok) throw new Error('Failed to add remark');

      const remarkData = await response.json();

      // Clear input immediately
      setRemarkText('');

      loader.hideLoader();
      toast.success('Remark added successfully!');

      // Refresh remarks in background (non-blocking)
      if (selectedDelegation) {
        setLoadingRemarks(true);
        fetch(`/api/delegations/remarks?delegationId=${selectedDelegation.id}`)
          .then(res => res.json())
          .then(data => {
            setRemarks(data.remarks || []);
            setLoadingRemarks(false);
          })
          .catch(error => {
            console.error('Error refreshing remarks:', error);
            setLoadingRemarks(false);
          });
      }
    } catch (error) {
      loader.hideLoader();
      toast.error('Failed to add remark');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'overdue': return 'bg-red-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'planned': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      case 'need_clarity': return 'bg-yellow-500 text-white';
      case 'approval_waiting': return 'bg-blue-500 text-white';
      case 'need_revision': return 'bg-orange-500 text-white';
      case 'hold': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getUserImage = (username: string) => {
    const user = users.find(u => u.username === username);
    return user?.image_url || null;
  };

  const calculateStatus = (dueDate: string) => {
    if (!dueDate) return 'pending';

    const now = new Date();
    const due = new Date(dueDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (dueDay < today) {
      return 'overdue';
    } else if (dueDay.getTime() === today.getTime()) {
      return 'pending';
    } else {
      return 'planned';
    }
  };

  const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };

  const compareText = (a?: string, b?: string) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' });

  // Apply filters
  const filteredDelegations = useMemo(() => {
    return delegations.filter(delegation => {
      // Task filter
      if (filters.tasks.length > 0 && !filters.tasks.includes(delegation.delegation_name)) {
        return false;
      }

      // Assignee filter
      if (filters.assignees.length > 0 && !filters.assignees.includes(delegation.assigned_to)) {
        return false;
      }

      // Doer filter
      if (filters.doers.length > 0 && !filters.doers.includes(delegation.doer_name || '')) {
        return false;
      }

      // Department filter
      if (filters.departments.length > 0 && !filters.departments.includes(delegation.department || '')) {
        return false;
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(delegation.priority)) {
        return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(delegation.status || '')) {
        return false;
      }

      // Evidence required filter
      if (filters.evidenceRequired !== null && delegation.evidence_required !== filters.evidenceRequired) {
        return false;
      }

      // Due date range filter
      if (filters.dueDateFrom && delegation.due_date) {
        const dueDate = new Date(delegation.due_date);
        const fromDate = new Date(filters.dueDateFrom);
        if (dueDate < fromDate) return false;
      }

      if (filters.dueDateTo && delegation.due_date) {
        const dueDate = new Date(delegation.due_date);
        const toDate = new Date(filters.dueDateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (dueDate > toDate) return false;
      }

      return true;
    });
  }, [delegations, filters]);

  const sortedDelegations = useMemo(() => {
    const arr = [...filteredDelegations];
    arr.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'id':
          return (a.id - b.id) * dir;
        case 'created_at':
          return ((new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0)) * dir;
        case 'delegation_name':
          return compareText(a.delegation_name, b.delegation_name) * dir;
        case 'assigned_to':
          return compareText(a.assigned_to, b.assigned_to) * dir;
        case 'doer_name':
          return compareText(a.doer_name, b.doer_name) * dir;
        case 'department':
          return compareText(a.department, b.department) * dir;
        case 'priority':
          return ((priorityRank[a.priority] || 0) - (priorityRank[b.priority] || 0)) * dir;
        case 'due_date':
          return ((new Date(a.due_date || 0).getTime() || 0) - (new Date(b.due_date || 0).getTime() || 0)) * dir;
        case 'status':
          return compareText(a.status, b.status) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredDelegations, sortDirection, sortField]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sortedDelegations.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDelegations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDelegations.slice(start, start + pageSize);
  }, [sortedDelegations, currentPage]);

  const startItem = sortedDelegations.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, sortedDelegations.length);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    const clamped = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(clamped);
  };

  // Merge static and custom departments
  const allDepartments = useMemo(() => {
    return [...DEPARTMENTS, ...customDepartments].sort();
  }, [customDepartments]);

  // Get unique values for filters
  const uniqueTasks = useMemo(() => Array.from(new Set(delegations.map(d => d.delegation_name).filter(Boolean))).sort(), [delegations]);
  const uniqueAssignees = useMemo(() => Array.from(new Set(delegations.map(d => d.assigned_to).filter(Boolean))).sort(), [delegations]);
  const uniqueDoers = useMemo(() => Array.from(new Set(delegations.map(d => d.doer_name).filter(Boolean))).sort(), [delegations]);
  const uniqueDepartments = useMemo(() => Array.from(new Set(delegations.map(d => d.department).filter(Boolean))).sort(), [delegations]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(delegations.map(d => d.status).filter(Boolean))).sort(), [delegations]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.tasks.length > 0) count++;
    if (filters.assignees.length > 0) count++;
    if (filters.doers.length > 0) count++;
    if (filters.departments.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.evidenceRequired !== null) count++;
    if (filters.dueDateFrom || filters.dueDateTo) count++;
    return count;
  }, [filters]);

  const handleFilterClick = () => {
    if (filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      setFilterPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
    }
    setShowFilterModal(true);
  };

  const clearAllFilters = () => {
    setFilters({
      tasks: [],
      assignees: [],
      doers: [],
      departments: [],
      priorities: [],
      statuses: [],
      evidenceRequired: null,
      dueDateFrom: '',
      dueDateTo: '',
    });
    setCurrentPage(1);
  };

  const removeFilter = (type: string, value?: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      switch (type) {
        case 'task':
          newFilters.tasks = prev.tasks.filter(v => v !== value);
          break;
        case 'assignee':
          newFilters.assignees = prev.assignees.filter(v => v !== value);
          break;
        case 'doer':
          newFilters.doers = prev.doers.filter(v => v !== value);
          break;
        case 'department':
          newFilters.departments = prev.departments.filter(v => v !== value);
          break;
        case 'priority':
          newFilters.priorities = prev.priorities.filter(v => v !== value);
          break;
        case 'status':
          newFilters.statuses = prev.statuses.filter(v => v !== value);
          break;
        case 'evidence':
          newFilters.evidenceRequired = null;
          break;
        case 'dateRange':
          newFilters.dueDateFrom = '';
          newFilters.dueDateTo = '';
          break;
      }
      return newFilters;
    });
    setCurrentPage(1);
  };

  const toggleFilterValue = (type: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      const arrayKey = type as 'tasks' | 'assignees' | 'doers' | 'departments' | 'priorities' | 'statuses';
      const currentArray = newFilters[arrayKey] as string[];

      if (currentArray.includes(value)) {
        newFilters[arrayKey] = currentArray.filter(v => v !== value) as any;
      } else {
        newFilters[arrayKey] = [...currentArray, value] as any;
      }
      return newFilters;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside filter modal content
      if (!target.closest('.filter-dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-400">↕</span>;
    return sortDirection === 'asc'
      ? <span className="ml-1 text-gray-900 dark:text-white">▲</span>
      : <span className="ml-1 text-gray-900 dark:text-white">▼</span>;
  };

  if (loading || !user) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#f4d24a] border-t-transparent"></div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="p-4 space-y-4">
        {/* Header */}
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Delegations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage tasks and delegations</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${
                  viewMode === 'list'
                    ? 'bg-[#f4d24a] text-gray-900 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </button>
              <button
                onClick={() => setViewMode('tile')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${
                  viewMode === 'tile'
                    ? 'bg-[#f4d24a] text-gray-900 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Tiles
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${
                  viewMode === 'calendar'
                    ? 'bg-[#f4d24a] text-gray-900 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </button>
            </div>
            
            {/* Filters Button with Count Badge */}
            <div className="relative">
              <button
                ref={filterBtnRef}
                onClick={handleFilterClick}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#f4d24a] text-gray-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>

            <motion.button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </motion.button>

            <motion.button
              onClick={() => setShowModal(true)}
              className="bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-semibold py-3 px-6 rounded-xl shadow-md transition"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              + Add New Delegation
            </motion.button>
          </div>
        </motion.div>

        {/* Status Summary Tiles */}
        <motion.div
          className="overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex gap-3 min-w-max pb-2">
          {/* Need Clarity */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Need Clarity</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {sortedDelegations.filter(d => d.status === 'need_clarity').length}
                </p>
              </div>
            </div>
          </div>

          {/* Approval Waiting */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Approval Waiting</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {sortedDelegations.filter(d => d.status === 'approval_waiting').length}
                </p>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-3 border border-green-200 dark:border-green-800 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {sortedDelegations.filter(d => d.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          {/* Need Revision */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-3 border border-orange-200 dark:border-orange-800 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Need Revision</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {sortedDelegations.filter(d => d.status === 'need_revision').length}
                </p>
              </div>
            </div>
          </div>

          {/* Hold */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Hold</p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {sortedDelegations.filter(d => d.status === 'hold').length}
                </p>
              </div>
            </div>
          </div>

          {/* Overdue (Based on due date) */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-3 border border-red-200 dark:border-red-800 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Overdue</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {sortedDelegations.filter(d => calculateStatus(d.due_date) === 'overdue').length}
                </p>
              </div>
            </div>
          </div>

          {/* Pending (Today's due date) */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-3 border border-indigo-200 dark:border-indigo-800 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Due Today</p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {sortedDelegations.filter(d => calculateStatus(d.due_date) === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          {/* Planned (Future) */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Planned</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {sortedDelegations.filter(d => calculateStatus(d.due_date) === 'planned').length}
                </p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 border border-slate-200 dark:border-slate-600 hover:shadow-md transition min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Tasks</p>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {sortedDelegations.length}
                </p>
              </div>
            </div>
          </div>
        </div>
        </motion.div>

        {/* Delegations List */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {delegations.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No delegations yet</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-[#f4d24a] hover:underline font-semibold"
              >
                Create your first delegation
              </button>
            </div>
          ) : (
            <>
              {/* List View */}
              {viewMode === 'list' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                <thead className="bg-[#f5f1e8] dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('id')} className="flex items-center gap-1">
                        <span>Task ID</span>
                        <SortIcon field="id" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('created_at')} className="flex items-center gap-1">
                        <span>Created</span>
                        <SortIcon field="created_at" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('delegation_name')} className="flex items-center gap-1">
                        <span>Task</span>
                        <SortIcon field="delegation_name" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('assigned_to')} className="flex items-center gap-1">
                        <span>Assignee</span>
                        <SortIcon field="assigned_to" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('doer_name')} className="flex items-center gap-1">
                        <span>Doer</span>
                        <SortIcon field="doer_name" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('department')} className="flex items-center gap-1">
                        <span>Department</span>
                        <SortIcon field="department" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('priority')} className="flex items-center gap-1">
                        <span>Priority</span>
                        <SortIcon field="priority" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('due_date')} className="flex items-center gap-1">
                        <span>Due Date</span>
                        <SortIcon field="due_date" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      <button onClick={() => handleSort('status')} className="flex items-center gap-1">
                        <span>Status</span>
                        <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Evidence</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedDelegations.map((delegation) => {
                    // Use user-selected status if available, otherwise calculate dynamic status
                    const hasUserStatus = delegation.status && ['need_clarity', 'approval_waiting', 'completed', 'need_revision', 'hold'].includes(delegation.status.toLowerCase());
                    const displayStatus = hasUserStatus ? delegation.status : calculateStatus(delegation.due_date);

                    return (
                      <motion.tr
                        key={delegation.id}
                        className="hover:bg-[#f5f1e8]/50 dark:hover:bg-gray-700/50 transition"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                            #{delegation.id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900 dark:text-white font-medium">
                              {new Date(delegation.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                              {new Date(delegation.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900 dark:text-white">{delegation.delegation_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getUserImage(delegation.assigned_to) ? (
                              <img src={getUserImage(delegation.assigned_to)!} alt={delegation.assigned_to} className="w-8 h-8 rounded-full object-cover border-2 border-[#f4d24a]" />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-[#f4d24a] to-[#e5c33a] rounded-full flex items-center justify-center text-sm font-bold text-gray-900 shadow-md">
                                {delegation.assigned_to[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-gray-900 dark:text-white">{delegation.assigned_to}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {delegation.doer_name ? (
                            <div className="flex items-center gap-2">
                              {getUserImage(delegation.doer_name) ? (
                                <img src={getUserImage(delegation.doer_name)!} alt={delegation.doer_name} className="w-8 h-8 rounded-full object-cover border-2 border-[#f4d24a]" />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-[#f4d24a] to-[#e5c33a] rounded-full flex items-center justify-center text-sm font-bold text-gray-900 shadow-md">
                                  {delegation.doer_name[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                              <span className="text-gray-900 dark:text-white">{delegation.doer_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-900 dark:text-white">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{delegation.department || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(delegation.priority)}`}>
                            {delegation.priority?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {delegation.due_date ? (
                              <>
                                <p className="text-gray-900 dark:text-white font-medium">
                                  {new Date(delegation.due_date).toLocaleDateString()}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">
                                  {new Date(delegation.due_date).toLocaleTimeString()}
                                </p>
                              </>
                            ) : (
                              <span className="text-gray-500">No date</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(displayStatus)}`}>
                            {displayStatus.toUpperCase().replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {delegation.evidence_required ? (
                            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">Required</span>
                          ) : (
                            <span className="text-gray-400 text-sm">Not Required</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(delegation)}
                              className="p-2 text-[#f4d24a] hover:text-[#e5c33a] hover:bg-[#f5f1e8] dark:text-[#f4d24a] dark:hover:text-[#e5c33a] dark:hover:bg-gray-700 rounded-lg transition"
                              title="View Details"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEdit(delegation)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition"
                              title="Edit"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openDeleteModal(delegation.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition"
                              title="Delete"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Showing {startItem}-{endItem} of {sortedDelegations.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
              )}

              {/* Calendar View */}
              {viewMode === 'calendar' && (
                <div className="p-6">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCalendarDate(newDate);
                        }}
                        className="p-2 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCalendarDate(new Date())}
                        className="px-4 py-2 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-semibold rounded-lg transition text-sm"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCalendarDate(newDate);
                        }}
                        className="p-2 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-semibold text-gray-600 dark:text-gray-400 py-2 text-sm">
                        {day}
                      </div>
                    ))}

                    {/* Calendar Days */}
                    {(() => {
                      const { daysInMonth, startingDayOfWeek } = getCalendarDays(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth()
                      );
                      const days = [];

                      // Empty cells before first day
                      for (let i = 0; i < startingDayOfWeek; i++) {
                        days.push(<div key={`empty-${i}`} className="h-44 bg-gray-50 dark:bg-gray-900 rounded-lg" />);
                      }

                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                        const tasksForDay = getTasksForDate(date);
                        const isToday = 
                          date.getDate() === new Date().getDate() &&
                          date.getMonth() === new Date().getMonth() &&
                          date.getFullYear() === new Date().getFullYear();

                        days.push(
                          <div
                            key={day}
                            className={`h-44 rounded-lg border-2 p-2 overflow-hidden ${
                              isToday
                                ? 'border-[#f4d24a] bg-[#fffef7] dark:bg-gray-800'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-semibold ${
                                isToday
                                  ? 'text-[#f4d24a]'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {day}
                              </span>
                              {tasksForDay.length > 0 && (
                                <span className="text-xs bg-[#f4d24a] text-gray-900 px-1.5 py-0.5 rounded-full font-bold">
                                  {tasksForDay.length}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 overflow-y-auto max-h-36">
                              {tasksForDay.map((task: Delegation) => {
                                const displayStatus = calculateStatus(task.due_date);
                                return (
                                  <motion.div
                                    key={task.id}
                                    whileHover={{ scale: 1.02 }}
                                    className="group relative"
                                  >
                                    <div
                                      className={`text-xs p-1.5 rounded cursor-pointer ${getStatusColor(displayStatus)} hover:shadow-md transition`}
                                      onClick={() => handleViewDetails(task)}
                                    >
                                      <div className="font-semibold truncate text-white">
                                        {task.delegation_name}
                                      </div>
                                      <div className="text-[10px] opacity-90 truncate text-white">
                                        {task.assigned_to}
                                      </div>
                                    </div>
                                    
                                    {/* Action buttons on hover */}
                                    <div className="absolute top-0 right-0 hidden group-hover:flex gap-1 bg-white dark:bg-gray-700 rounded shadow-lg p-1 z-10">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewDetails(task);
                                        }}
                                        className="p-1 text-[#f4d24a] hover:bg-[#f5f1e8] dark:hover:bg-gray-600 rounded"
                                        title="View Details"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(task);
                                        }}
                                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                        title="Edit"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDeleteModal(task.id);
                                        }}
                                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        title="Delete"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      return days;
                    })()}
                  </div>
                </div>
              )}

              {/* Tile View */}
              {viewMode === 'tile' && (
                <div className="p-4">
                  <div className="space-y-3">
                    {paginatedDelegations.map((delegation, index) => {
                      const displayStatus = calculateStatus(delegation.due_date);
                      return (
                        <motion.div
                          key={delegation.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gradient-to-br from-white to-[#fffef7] dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-[#f4d24a] overflow-hidden"
                        >
                          <div className="p-4">
                            {/* Header Row - Task Name & Actions */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-2 flex-1">
                                <div className="w-9 h-9 rounded-lg bg-[#f4d24a] flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                      #{delegation.id}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(displayStatus)}`}>
                                      {displayStatus.toUpperCase().replace('_', ' ')}
                                    </span>
                                  </div>
                                  <h3 className="text-base font-bold text-gray-900 dark:text-white break-words leading-tight">
                                    {delegation.delegation_name}
                                  </h3>
                                  {delegation.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                      {delegation.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-1 ml-3">
                                <button
                                  onClick={() => handleViewDetails(delegation)}
                                  className="p-2 text-[#f4d24a] hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded-lg transition"
                                  title="View Details"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleEdit(delegation)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openDeleteModal(delegation.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                  title="Delete"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                              {/* Assignee */}
                              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Assignee</p>
                                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{delegation.assigned_to}</p>
                                </div>
                              </div>

                              {/* Doer */}
                              <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Doer</p>
                                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{delegation.doer_name || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Department */}
                              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Department</p>
                                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{delegation.department || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Priority */}
                              <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  delegation.priority === 'high' ? 'bg-red-500' :
                                  delegation.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}>
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Priority</p>
                                  <p className="text-xs font-bold text-gray-900 dark:text-white capitalize">{delegation.priority}</p>
                                </div>
                              </div>
                            </div>

                            {/* Footer Row */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              {/* Due Date */}
                              <div className="flex items-center gap-1.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Due Date</p>
                                  {delegation.due_date ? (
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                      {formatDateToLocalTimezone(delegation.due_date)}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-500">No date</p>
                                  )}
                                </div>
                              </div>

                              {/* Evidence Required */}
                              <div className="flex items-center gap-1.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  delegation.evidence_required 
                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                  <svg className={`w-4 h-4 ${
                                    delegation.evidence_required 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : 'text-gray-400'
                                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Evidence</p>
                                  <p className={`text-xs font-bold ${
                                    delegation.evidence_required 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : 'text-gray-400'
                                  }`}>
                                    {delegation.evidence_required ? 'Required' : 'Not Required'}
                                  </p>
                                </div>
                              </div>

                              {/* Created Date */}
                              <div className="flex items-center gap-1.5">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Created</p>
                                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                                    {new Date(delegation.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status Indicator Bar */}
                          <div className={`h-1.5 w-full ${getStatusColor(displayStatus)}`} />
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Showing {startItem}-{endItem} of {sortedDelegations.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
              />

              {/* Modal Content */}
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] p-6 sticky top-0 z-10">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {editingId ? 'Edit Delegation' : 'Create New Delegation'}
                      </h2>
                      <button
                        onClick={closeModal}
                        className="p-2 hover:bg-white/20 rounded-lg transition"
                      >
                        <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Row 1: Assignee, Doer, Department */}
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {/* Assignee Searchable Dropdown */}
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Assignee Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.assigneeName || assigneeSearch}
                            onChange={(e) => {
                              setAssigneeSearch(e.target.value);
                              setFormData({ ...formData, assigneeName: '' });
                              setShowAssigneeDropdown(true);
                            }}
                            onFocus={() => setShowAssigneeDropdown(true)}
                            placeholder="Search or select assignee..."
                            className="w-full px-4 py-2.5 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition text-sm"
                            required
                          />
                          <svg className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>

                        {showAssigneeDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowAssigneeDropdown(false)} />
                            <motion.div
                              className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {users
                                .filter(u => u.username.toLowerCase().includes(assigneeSearch.toLowerCase()))
                                .map(u => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, assigneeName: u.username });
                                      setAssigneeSearch('');
                                      setShowAssigneeDropdown(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left hover:bg-[#f5f1e8] dark:hover:bg-gray-700 transition text-sm text-gray-900 dark:text-white"
                                  >
                                    {u.username}
                                  </button>
                                ))}
                              {users.filter(u => u.username.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">No results found</div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </div>

                      {/* Doer Searchable Dropdown */}
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Doer Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.doerName || doerSearch}
                            onChange={(e) => {
                              setDoerSearch(e.target.value);
                              setFormData({ ...formData, doerName: '' });
                              setShowDoerDropdown(true);
                            }}
                            onFocus={() => setShowDoerDropdown(true)}
                            placeholder="Search or select doer..."
                            className="w-full px-4 py-2.5 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition text-sm"
                            required
                          />
                          <svg className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>

                        {showDoerDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowDoerDropdown(false)} />
                            <motion.div
                              className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {users
                                .filter(u => u.username.toLowerCase().includes(doerSearch.toLowerCase()))
                                .map(u => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, doerName: u.username });
                                      setDoerSearch('');
                                      setShowDoerDropdown(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left hover:bg-[#f5f1e8] dark:hover:bg-gray-700 transition text-sm text-gray-900 dark:text-white"
                                  >
                                    {u.username}
                                  </button>
                                ))}
                              {users.filter(u => u.username.toLowerCase().includes(doerSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">No results found</div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </div>

                      {/* Department Searchable Dropdown */}
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Department
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={formData.department || departmentSearch}
                              onChange={(e) => {
                                setDepartmentSearch(e.target.value);
                                setFormData({ ...formData, department: '' });
                                setShowDepartmentDropdown(true);
                              }}
                              onFocus={() => setShowDepartmentDropdown(true)}
                              placeholder="Search or select department..."
                              className="w-full px-4 py-2.5 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition text-sm"
                            />
                            <svg className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          
                          {/* Add Department Button */}
                          <button
                            type="button"
                            onClick={() => setShowAddDepartmentModal(true)}
                            className="px-4 py-2.5 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 rounded-xl font-semibold transition text-sm flex items-center gap-1"
                            title="Add new department"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>

                        {showDepartmentDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowDepartmentDropdown(false)} />
                            <motion.div
                              className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {allDepartments
                                .filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase()))
                                .map(dept => (
                                  <button
                                    key={dept}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, department: dept });
                                      setDepartmentSearch('');
                                      setShowDepartmentDropdown(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left hover:bg-[#f5f1e8] dark:hover:bg-gray-700 transition text-sm text-gray-900 dark:text-white"
                                  >
                                    {dept}
                                  </button>
                                ))}
                              {allDepartments.filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">No results found</div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </div>
                    </motion.div>

                    {/* Row 2: Priority */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Priority <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-3">
                        {PRIORITIES.map((priority) => (
                          <motion.button
                            key={priority.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: priority.value })}
                            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition text-sm ${formData.priority === priority.value
                              ? priority.color + ' shadow-lg'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                              }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {priority.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>

                    {/* Row 3: Task Description */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Task Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.taskDescription}
                        onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition resize-none text-sm"
                        placeholder="Describe the task in detail..."
                        required
                      />
                    </motion.div>

                    {/* Row 4: Due DateTime & Evidence Required */}
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Due Date & Time
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(!showDatePicker)}
                          className="w-full px-4 py-2.5 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-xl text-left text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition text-sm flex items-center justify-between"
                        >
                          <span>{formData.dueDateTime ? formatDateToLocalTimezone(formData.dueDateTime) : 'Select date & time'}</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Custom Date Time Picker */}
                        <AnimatePresence>
                          {showDatePicker && (
                            <>
                              {/* Backdrop */}
                              <motion.div
                                className="fixed inset-0 bg-black/50 z-40"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowDatePicker(false)}
                              />

                              {/* Modal */}
                              <motion.div
                                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 flex gap-6"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                              >
                                {/* Calendar */}
                                <div className="w-80">
                                  <div className="flex items-center justify-between mb-3">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                                      className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                      </svg>
                                    </button>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                                      className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                      <div key={day} className="font-semibold text-gray-600 dark:text-gray-400">{day}</div>
                                    ))}
                                  </div>

                                  <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: getFirstDayOfMonth(selectedDate) }).map((_, i) => (
                                      <div key={`empty-${i}`} />
                                    ))}
                                    {Array.from({ length: getDaysInMonth(selectedDate) }).map((_, i) => {
                                      const day = i + 1;
                                      const isSelected = selectedDate.getDate() === day;
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() => {
                                            const newDate = new Date(selectedDate);
                                            newDate.setDate(day);
                                            setSelectedDate(newDate);
                                            setShowTimePicker(true);
                                          }}
                                          className={`p-2 text-sm rounded-lg transition ${isSelected
                                            ? 'bg-[#f4d24a] text-gray-900 font-bold'
                                            : 'hover:bg-[#f5f1e8] dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                            }`}
                                        >
                                          {day}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Clock Time Picker */}
                                <div className="w-80 border-l border-gray-200 dark:border-gray-700 pl-6">
                                  <div className="text-center mb-3">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                      {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
                                    </span>
                                  </div>

                                  <div className="flex gap-3 justify-center mb-3">
                                    {/* Hour Selector */}
                                    <div className="flex flex-col items-center">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedHour(selectedHour === 12 ? 1 : selectedHour + 1)}
                                        className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                      </button>
                                      <div className="w-16 h-16 flex items-center justify-center bg-[#f5f1e8] dark:bg-gray-700 rounded-lg my-2">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedHour.toString().padStart(2, '0')}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedHour(selectedHour === 1 ? 12 : selectedHour - 1)}
                                        className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                    </div>

                                    <span className="text-3xl font-bold text-gray-900 dark:text-white self-center">:</span>

                                    {/* Minute Selector */}
                                    <div className="flex flex-col items-center">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMinute((selectedMinute + 15) % 60)}
                                        className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                      </button>
                                      <div className="w-16 h-16 flex items-center justify-center bg-[#f5f1e8] dark:bg-gray-700 rounded-lg my-2">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedMinute.toString().padStart(2, '0')}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMinute(selectedMinute === 0 ? 45 : selectedMinute - 15)}
                                        className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                    </div>

                                    {/* AM/PM Selector */}
                                    <div className="flex flex-col items-center justify-center">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPeriod('AM')}
                                        className={`px-3 py-2 rounded-lg font-semibold text-sm mb-1 ${selectedPeriod === 'AM' ? 'bg-[#f4d24a] text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                          }`}
                                      >
                                        AM
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPeriod('PM')}
                                        className={`px-3 py-2 rounded-lg font-semibold text-sm ${selectedPeriod === 'PM' ? 'bg-[#f4d24a] text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                          }`}
                                      >
                                        PM
                                      </button>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleDateTimeSet}
                                    className="w-full py-2 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-semibold rounded-lg transition"
                                  >
                                    Set Date & Time
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Evidence Required
                        </label>
                        <div className="flex items-center justify-between bg-[#f5f1e8] dark:bg-gray-700 px-4 py-2.5 rounded-xl h-[42px]">
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Required?</span>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, evidenceRequired: !formData.evidenceRequired })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${formData.evidenceRequired ? 'bg-[#f4d24a]' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                          >
                            <motion.span
                              className="inline-block h-5 w-5 transform rounded-full bg-white shadow-lg"
                              animate={{ x: formData.evidenceRequired ? 22 : 2 }}
                            />
                          </button>
                        </div>
                      </div>
                    </motion.div>

                    {/* Row 5: Voice Note & Reference Docs */}
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {/* Voice Note Recorder */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Voice Note
                        </label>
                        <div className="bg-gradient-to-br from-[#f5f1e8] to-[#e8dcc8] dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl border-2 border-[#f4d24a]/30">
                          {/* Show existing voice note if editing and no new recording */}
                          {existingVoiceNote && !audioBlob && !isRecording && (
                            <div className="space-y-2 mb-3">
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Current Voice Note:</p>
                              <audio controls src={existingVoiceNote} className="w-full" />
                              <button
                                type="button"
                                onClick={() => setExistingVoiceNote('')}
                                className="w-full text-xs text-red-600 hover:text-red-800 dark:text-red-400 font-semibold"
                              >
                                Remove Existing
                              </button>
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Record new audio below to replace
                              </p>
                            </div>
                          )}

                          {!isRecording && !audioBlob && (
                            <button
                              type="button"
                              onClick={startRecording}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-white dark:bg-gray-800 hover:bg-[#f4d24a] text-gray-700 dark:text-white hover:text-gray-900 rounded-lg transition font-medium text-sm"
                            >
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              {existingVoiceNote ? 'Record New Voice Note' : 'Start Recording'}
                            </button>
                          )}

                          {isRecording && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg">
                                <span className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
                                  <motion.div
                                    className="w-2 h-2 bg-red-500 rounded-full"
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                  />
                                  Recording
                                </span>
                                <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                                  {formatTime(recordingTime)}
                                </span>
                              </div>

                              {/* Waveform Animation */}
                              <div className="flex items-center justify-center gap-1 h-12 bg-white dark:bg-gray-800 rounded-lg px-2">
                                {Array.from({ length: 40 }).map((_, i) => (
                                  <motion.div
                                    key={i}
                                    className="w-1 bg-[#f4d24a] rounded-full"
                                    animate={{
                                      height: ['20%', '80%', '30%', '60%', '20%'],
                                    }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 1,
                                      delay: i * 0.05,
                                      ease: 'easeInOut',
                                    }}
                                  />
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={stopRecording}
                                className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition"
                              >
                                Stop Recording
                              </button>
                            </div>
                          )}

                          {audioBlob && !isRecording && (
                            <div className="space-y-2">
                              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                              <button
                                type="button"
                                onClick={() => {
                                  setAudioBlob(null);
                                  setRecordingTime(0);
                                }}
                                className="w-full text-xs text-red-600 hover:text-red-800 dark:text-red-400 font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reference Documents */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Reference Documents
                        </label>

                        {/* Show existing documents if editing */}
                        {existingReferenceDocs.length > 0 && formData.referenceDocs.length === 0 && (
                          <div className="mb-3 space-y-2">
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Current Documents:</p>
                            {existingReferenceDocs.map((doc, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-[#f5f1e8] dark:bg-gray-700 p-2 rounded-lg text-xs"
                              >
                                <a
                                  href={doc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
                                >
                                  Document {index + 1}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setExistingReferenceDocs(existingReferenceDocs.filter((_, i) => i !== index))}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 ml-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              Upload new files below to replace
                            </p>
                          </div>
                        )}

                        <div className="border-2 border-dashed border-[#f4d24a] dark:border-gray-600 rounded-xl p-4 text-center hover:bg-[#f5f1e8]/50 dark:hover:bg-gray-700/50 transition cursor-pointer">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <svg className="w-10 h-10 mx-auto text-[#f4d24a] dark:text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mb-1">
                              {existingReferenceDocs.length > 0 && formData.referenceDocs.length === 0
                                ? 'Upload New Files'
                                : 'Upload Files'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              PDF, DOC, Images
                            </p>
                          </label>
                        </div>

                        {formData.referenceDocs.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">New files (will replace existing):</p>
                            {formData.referenceDocs.slice(0, 2).map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-[#f5f1e8] dark:bg-gray-700 p-2 rounded-lg text-xs"
                              >
                                <span className="text-gray-900 dark:text-white truncate flex-1">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 ml-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            {formData.referenceDocs.length > 2 && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                                +{formData.referenceDocs.length - 2} more files
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Submit Buttons */}
                    <motion.div
                      className="flex gap-3 pt-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <button
                        type="submit"
                        className="flex-1 px-6 py-2.5 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-bold rounded-xl shadow-lg transition"
                      >
                        {editingId ? 'Update Delegation' : 'Create Delegation'}
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Details Drawer - Slides from right */}
        <AnimatePresence>
          {showDetailsDrawer && selectedDelegation && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDetailsDrawer(false)}
              />

              {/* Drawer */}
              <motion.div
                className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-[#f4d24a] to-[#f5c842] p-6 z-10">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Task Details</h2>
                    <button
                      onClick={() => setShowDetailsDrawer(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">#{selectedDelegation.id} - {selectedDelegation.delegation_name}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Task Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Task Information
                    </h3>
                    <div className="bg-[#f5f1e8] dark:bg-gray-700 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Assignee</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedDelegation.assigned_to}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Doer</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedDelegation.doer_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Department</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedDelegation.department || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Priority</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedDelegation.priority)}`}>
                            {selectedDelegation.priority?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Description</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedDelegation.description}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Due Date</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedDelegation.due_date ? formatDateToLocalTimezone(selectedDelegation.due_date) : 'No date'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Evidence Required</p>
                        <span className={`text-sm font-semibold ${selectedDelegation.evidence_required ? 'text-green-600' : 'text-gray-400'}`}>
                          {selectedDelegation.evidence_required ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Voice Note */}
                  {selectedDelegation.voice_note_url && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Voice Note
                      </h3>
                      <div className="bg-gradient-to-br from-[#f5f1e8] to-[#e8dcc8] dark:from-gray-700 dark:to-gray-600 rounded-xl p-4">
                        <audio controls src={selectedDelegation.voice_note_url} className="w-full" />
                      </div>
                    </div>
                  )}

                  {/* Reference Documents */}
                  {selectedDelegation.reference_docs && selectedDelegation.reference_docs.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Attachments
                      </h3>
                      <div className="space-y-2">
                        {(typeof selectedDelegation.reference_docs === 'string'
                          ? JSON.parse(selectedDelegation.reference_docs)
                          : selectedDelegation.reference_docs).map((doc: string, index: number) => (
                            <a
                              key={index}
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#f5f1e8] dark:bg-gray-700 p-3 rounded-lg hover:bg-[#e8dcc8] dark:hover:bg-gray-600 transition"
                            >
                              <svg className="w-5 h-5 text-[#f4d24a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">Document {index + 1}</span>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Status Update */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Update Status</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Select Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {TASK_STATUSES.map(status => (
                            <button
                              key={status.value}
                              type="button"
                              onClick={() => setTaskStatus(status.value)}
                              className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${taskStatus === status.value
                                ? status.color
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                              <span>{status.icon}</span>
                              {status.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {(taskStatus === 'need_revision' || taskStatus === 'hold') && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Revised Due Date <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={revisedDueDate ? formatDateToLocalTimezone(revisedDueDate) : ''}
                              readOnly
                              placeholder="Select date and time"
                              onClick={() => setShowRevisedDatePicker(true)}
                              className="w-full px-4 py-2.5 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition text-sm cursor-pointer"
                            />
                            {revisedDueDate && (
                              <button
                                type="button"
                                onClick={() => setRevisedDueDate('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Custom Date Picker */}
                          <AnimatePresence>
                            {showRevisedDatePicker && (
                              <>
                                <motion.div
                                  className="fixed inset-0 bg-black/50 z-40"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => setShowRevisedDatePicker(false)}
                                />

                                {/* Modal */}
                                <motion.div
                                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 flex gap-6"
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Calendar */}
                                  <div className="w-80">
                                    <div className="flex items-center justify-between mb-3">
                                      <button
                                        type="button"
                                        onClick={() => setRevisedSelectedDate(new Date(revisedSelectedDate.getFullYear(), revisedSelectedDate.getMonth() - 1))}
                                        className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                      </button>
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {revisedSelectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setRevisedSelectedDate(new Date(revisedSelectedDate.getFullYear(), revisedSelectedDate.getMonth() + 1))}
                                        className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                        <div key={day} className="font-semibold text-gray-600 dark:text-gray-400">{day}</div>
                                      ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1">
                                      {Array.from({ length: getFirstDayOfMonth(revisedSelectedDate) }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                      ))}
                                      {Array.from({ length: getDaysInMonth(revisedSelectedDate) }).map((_, i) => {
                                        const day = i + 1;
                                        const isSelected = revisedSelectedDate.getDate() === day;
                                        return (
                                          <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                              const newDate = new Date(revisedSelectedDate);
                                              newDate.setDate(day);
                                              setRevisedSelectedDate(newDate);
                                            }}
                                            className={`p-2 text-sm rounded-lg transition ${isSelected
                                              ? 'bg-[#f4d24a] text-gray-900 font-bold'
                                              : 'hover:bg-[#f5f1e8] dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                              }`}
                                          >
                                            {day}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Clock Time Picker */}
                                  <div className="w-80 border-l border-gray-200 dark:border-gray-700 pl-6">
                                    <div className="text-center mb-3">
                                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {revisedSelectedHour.toString().padStart(2, '0')}:{revisedSelectedMinute.toString().padStart(2, '0')} {revisedSelectedPeriod}
                                      </span>
                                    </div>

                                    <div className="flex gap-3 justify-center mb-3">
                                      {/* Hour Selector */}
                                      <div className="flex flex-col items-center">
                                        <button
                                          type="button"
                                          onClick={() => setRevisedSelectedHour(revisedSelectedHour === 12 ? 1 : revisedSelectedHour + 1)}
                                          className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                          </svg>
                                        </button>
                                        <div className="w-16 h-16 flex items-center justify-center bg-[#f5f1e8] dark:bg-gray-700 rounded-lg my-2">
                                          <span className="text-2xl font-bold text-gray-900 dark:text-white">{revisedSelectedHour.toString().padStart(2, '0')}</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setRevisedSelectedHour(revisedSelectedHour === 1 ? 12 : revisedSelectedHour - 1)}
                                          className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                      </div>

                                      <span className="text-3xl font-bold text-gray-900 dark:text-white self-center">:</span>

                                      {/* Minute Selector */}
                                      <div className="flex flex-col items-center">
                                        <button
                                          type="button"
                                          onClick={() => setRevisedSelectedMinute((revisedSelectedMinute + 15) % 60)}
                                          className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                          </svg>
                                        </button>
                                        <div className="w-16 h-16 flex items-center justify-center bg-[#f5f1e8] dark:bg-gray-700 rounded-lg my-2">
                                          <span className="text-2xl font-bold text-gray-900 dark:text-white">{revisedSelectedMinute.toString().padStart(2, '0')}</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setRevisedSelectedMinute(revisedSelectedMinute === 0 ? 45 : revisedSelectedMinute - 15)}
                                          className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                      </div>

                                      {/* AM/PM Selector */}
                                      <div className="flex flex-col items-center justify-center">
                                        <button
                                          type="button"
                                          onClick={() => setRevisedSelectedPeriod('AM')}
                                          className={`px-3 py-2 rounded-lg font-semibold text-sm mb-1 ${revisedSelectedPeriod === 'AM' ? 'bg-[#f4d24a] text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                          AM
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setRevisedSelectedPeriod('PM')}
                                          className={`px-3 py-2 rounded-lg font-semibold text-sm ${revisedSelectedPeriod === 'PM' ? 'bg-[#f4d24a] text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                          PM
                                        </button>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const date = new Date(revisedSelectedDate);
                                        let hour = revisedSelectedHour;
                                        if (revisedSelectedPeriod === 'PM' && hour !== 12) hour += 12;
                                        if (revisedSelectedPeriod === 'AM' && hour === 12) hour = 0;
                                        date.setHours(hour, revisedSelectedMinute, 0, 0);
                                        setRevisedDueDate(date.toISOString().slice(0, 16));
                                        setShowRevisedDatePicker(false);
                                      }}
                                      className="w-full py-2.5 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-bold rounded-xl transition"
                                    >
                                      Set Date & Time
                                    </button>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Add Remark
                        </label>
                        <textarea
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          placeholder="Enter your remark..."
                          rows={3}
                          className="w-full px-4 py-2.5 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition text-sm resize-none"
                        />
                      </div>

                      {/* Evidence Attachment - Only show when status is approval_waiting and evidence is required */}
                      {((taskStatus === 'approval_waiting') || (!taskStatus && selectedDelegation?.status === 'approval_waiting'))
                        && selectedDelegation?.evidence_required && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Attach Evidence <span className="text-red-500">*</span>
                            </label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-[#f4d24a] transition cursor-pointer"
                              onClick={() => document.getElementById('evidenceFileInput')?.click()}
                            >
                              <input
                                id="evidenceFileInput"
                                type="file"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files) {
                                    setEvidenceFiles(Array.from(e.target.files));
                                  }
                                }}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav,.mp4"
                              />
                              <svg className="w-8 h-8 mx-auto mb-2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                Click to select evidence files or drag and drop
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Accepted: PDF, DOC, DOCX, JPG, PNG, MP3, WAV, MP4
                              </p>
                            </div>

                            {/* Selected files list */}
                            {evidenceFiles.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Selected Files ({evidenceFiles.length}):
                                </p>
                                {evidenceFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between bg-[#f5f1e8] dark:bg-gray-700 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 flex-1">
                                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setEvidenceFiles(evidenceFiles.filter((_, i) => i !== index))}
                                      className="ml-2 text-red-500 hover:text-red-600"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      <div className="flex gap-3">
                        <button
                          onClick={handleUpdateStatus}
                          className="flex-1 px-4 py-2.5 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-bold rounded-xl transition"
                        >
                          Update Status
                        </button>
                        <button
                          onClick={handleAddRemark}
                          className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition"
                        >
                          Add Remark Only
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remark History */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Remark History</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {loadingRemarks ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#f4d24a] border-t-transparent"></div>
                        </div>
                      ) : remarks.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No remarks yet</p>
                      ) : (
                        remarks.map((remark) => (
                          <div key={remark.id} className="bg-[#f5f1e8] dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">{remark.username}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDateToLocalTimezone(remark.created_at)}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{remark.remark}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Revision History */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revision History</h3>
                    <div className="space-y-3">
                      {loadingHistory ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#f4d24a] border-t-transparent"></div>
                        </div>
                      ) : revisionHistory.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No revision history yet</p>
                      ) : (
                        revisionHistory.map((history) => (
                          <div key={history.id} className="bg-[#fffbf0] dark:bg-gray-700 rounded-lg p-4 border-l-4 border-[#f4d24a]">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">Status Changed</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDateToLocalTimezone(history.created_at)}
                              </p>
                            </div>
                            <div className="text-xs space-y-1">
                              <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Status:</span> {history.old_status} → {history.new_status}
                              </p>
                              {history.new_due_date && (
                                <p className="text-gray-700 dark:text-gray-300">
                                  <span className="font-semibold">Due Date:</span> {formatDateToLocalTimezone(history.old_due_date)} → {formatDateToLocalTimezone(history.new_due_date)}
                                </p>
                              )}
                              {history.reason && (
                                <p className="text-gray-700 dark:text-gray-300">
                                  <span className="font-semibold">Reason:</span> {history.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteModalOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteTargetId(null);
                }}
              />

              <motion.div
                className="fixed inset-0 z-60 flex items-center justify-center p-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f4d24a] via-[#f5c842] to-[#f4d24a]" />
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M5.455 19h13.09c.943 0 1.66-.855 1.497-1.786l-1.5-8.5A1.5 1.5 0 0017.063 7H6.937a1.5 1.5 0 00-1.489 1.214l-1.5 8.5C3.785 18.145 4.503 19 5.455 19zM9 7l.867-2.6A1 1 0 0110.8 4h2.4a1 1 0 01.933.4L15 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete delegation?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">This action cannot be undone. The delegation and its related data will be removed.</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setDeleteTargetId(null);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Filter Modal */}
        <AnimatePresence>
          {showFilterModal && (
            <>
              <motion.div
                className="fixed inset-0 bg-transparent z-[60]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilterModal(false)}
              />

              <motion.div
                className="fixed z-[70] w-[600px]"
                style={{ top: filterPos.top, right: filterPos.right }}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-100px)] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Arrow pointing to filter button */}
                  <div className="absolute -top-2 right-8 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 transform rotate-45"></div>

                  {/* Filter Content */}
                  <div className="p-5 space-y-4">
                    {/* Due Date Range - Single unified picker */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date Range</label>
                      <DateRangePicker
                        fromDate={filters.dueDateFrom}
                        toDate={filters.dueDateTo}
                        onRangeChange={(from, to) => setFilters(prev => ({ ...prev, dueDateFrom: from, dueDateTo: to }))}
                      />
                    </div>

                    {/* Task & Department - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative filter-dropdown-container">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Task</label>
                        <input
                          type="text"
                          placeholder="Search tasks..."
                          value={filterSearches.task}
                          onChange={(e) => setFilterSearches(prev => ({ ...prev, task: e.target.value }))}
                          onFocus={() => setActiveDropdown('task')}
                          className="w-full px-3 py-2 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition"
                        />
                        {activeDropdown === 'task' && (
                          <div 
                            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {uniqueTasks
                              .filter(t => !filterSearches.task || t.toLowerCase().includes(filterSearches.task.toLowerCase()))
                              .map(task => (
                                <label key={task} className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f1e8] dark:hover:bg-gray-700 p-1.5 rounded transition">
                                  <input
                                    type="checkbox"
                                    checked={filters.tasks.includes(task)}
                                    onChange={() => toggleFilterValue('tasks', task)}
                                    className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a] rounded"
                                  />
                                  <span className="text-xs text-gray-900 dark:text-white">{task}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Department */}
                      <div className="relative filter-dropdown-container">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Department</label>
                        <input
                          type="text"
                          placeholder="Search departments..."
                          value={filterSearches.department}
                          onChange={(e) => setFilterSearches(prev => ({ ...prev, department: e.target.value }))}
                          onFocus={() => setActiveDropdown('department')}
                          className="w-full px-3 py-2 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition"
                        />
                        {activeDropdown === 'department' && (
                          <div 
                            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {uniqueDepartments
                              .filter(d => !filterSearches.department || d.toLowerCase().includes(filterSearches.department.toLowerCase()))
                              .map(department => (
                                <label key={department} className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f1e8] dark:hover:bg-gray-700 p-1.5 rounded transition">
                                  <input
                                    type="checkbox"
                                    checked={filters.departments.includes(department)}
                                    onChange={() => toggleFilterValue('departments', department)}
                                    className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a] rounded"
                                  />
                                  <span className="text-xs text-gray-900 dark:text-white">{department}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assignee & Doer - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Assignee */}
                      <div className="relative filter-dropdown-container">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Assignee</label>
                        <input
                          type="text"
                          placeholder="Search assignees..."
                          value={filterSearches.assignee}
                          onChange={(e) => setFilterSearches(prev => ({ ...prev, assignee: e.target.value }))}
                          onFocus={() => setActiveDropdown('assignee')}
                          className="w-full px-3 py-2 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition"
                        />
                        {activeDropdown === 'assignee' && (
                          <div 
                            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {uniqueAssignees
                              .filter(a => !filterSearches.assignee || a.toLowerCase().includes(filterSearches.assignee.toLowerCase()))
                              .map(assignee => (
                                <label key={assignee} className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f1e8] dark:hover:bg-gray-700 p-1.5 rounded transition">
                                  <input
                                    type="checkbox"
                                    checked={filters.assignees.includes(assignee)}
                                    onChange={() => toggleFilterValue('assignees', assignee)}
                                    className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a] rounded"
                                  />
                                  <span className="text-xs text-gray-900 dark:text-white">{assignee}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Doer */}
                      <div className="relative filter-dropdown-container">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Doer</label>
                        <input
                          type="text"
                          placeholder="Search doers..."
                          value={filterSearches.doer}
                          onChange={(e) => setFilterSearches(prev => ({ ...prev, doer: e.target.value }))}
                          onFocus={() => setActiveDropdown('doer')}
                          className="w-full px-3 py-2 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition"
                        />
                        {activeDropdown === 'doer' && (
                          <div 
                            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {uniqueDoers
                              .filter(d => !filterSearches.doer || d.toLowerCase().includes(filterSearches.doer.toLowerCase()))
                              .map(doer => (
                                <label key={doer} className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f1e8] dark:hover:bg-gray-700 p-1.5 rounded transition">
                                  <input
                                    type="checkbox"
                                    checked={filters.doers.includes(doer)}
                                    onChange={() => toggleFilterValue('doers', doer)}
                                    className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a] rounded"
                                  />
                                  <span className="text-xs text-gray-900 dark:text-white">{doer}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Priority & Status - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Priority */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                        <div className="space-y-1.5">
                          {['low', 'medium', 'high'].map(priority => (
                            <label key={priority} className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f1e8] dark:hover:bg-gray-700 p-2 rounded-lg transition">
                              <input
                                type="checkbox"
                                checked={filters.priorities.includes(priority)}
                                onChange={() => toggleFilterValue('priorities', priority)}
                                className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a] rounded"
                              />
                              <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">{priority}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                        <div className="max-h-32 overflow-y-auto space-y-1 bg-[#f5f1e8] dark:bg-gray-700 rounded-lg p-2">
                          {uniqueStatuses.map(status => (
                            <label key={status} className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-600 p-1.5 rounded transition">
                              <input
                                type="checkbox"
                                checked={filters.statuses.includes(status)}
                                onChange={() => toggleFilterValue('statuses', status)}
                                className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a] rounded"
                              />
                              <span className="text-xs text-gray-900 dark:text-white">{status.replace('_', ' ').toUpperCase()}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Evidence - Full width */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Evidence Required</label>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f1e8] dark:hover:bg-gray-700 p-2 rounded-lg transition flex-1">
                          <input
                            type="radio"
                            checked={filters.evidenceRequired === null}
                            onChange={() => setFilters(prev => ({ ...prev, evidenceRequired: null }))}
                            className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a]"
                          />
                          <span className="text-xs font-medium text-gray-900 dark:text-white">All</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f1e8] dark:hover:bg-gray-700 p-2 rounded-lg transition flex-1">
                          <input
                            type="radio"
                            checked={filters.evidenceRequired === true}
                            onChange={() => setFilters(prev => ({ ...prev, evidenceRequired: true }))}
                            className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a]"
                          />
                          <span className="text-xs font-medium text-gray-900 dark:text-white">Required</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f1e8] dark:hover:bg-gray-700 p-2 rounded-lg transition flex-1">
                          <input
                            type="radio"
                            checked={filters.evidenceRequired === false}
                            onChange={() => setFilters(prev => ({ ...prev, evidenceRequired: false }))}
                            className="w-3.5 h-3.5 text-[#f4d24a] focus:ring-[#f4d24a]"
                          />
                          <span className="text-xs font-medium text-gray-900 dark:text-white">Not Required</span>
                        </label>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={clearAllFilters}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-semibold rounded-lg transition"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={() => {
                          setShowFilterModal(false);
                          setCurrentPage(1);
                        }}
                        className="flex-1 px-4 py-2 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 text-sm font-bold rounded-lg transition shadow-md"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Add Department Modal */}
        <AnimatePresence>
          {showAddDepartmentModal && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowAddDepartmentModal(false);
                  setNewDepartmentName('');
                }}
              />

              {/* Modal */}
              <motion.div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-full max-w-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Add New Department
                    </h3>
                    <button
                      onClick={() => {
                        setShowAddDepartmentModal(false);
                        setNewDepartmentName('');
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Department Name
                      </label>
                      <input
                        type="text"
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddDepartment();
                          }
                        }}
                        placeholder="Enter department name..."
                        className="w-full px-4 py-2.5 bg-[#f5f1e8] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition text-sm"
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowAddDepartmentModal(false);
                          setNewDepartmentName('');
                        }}
                        className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddDepartment}
                        className="flex-1 px-4 py-2.5 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-bold rounded-xl transition shadow-md"
                      >
                        Add Department
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </LayoutWrapper>
  );
}
