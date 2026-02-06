'use client';

import { useState, useEffect, useRef, useMemo, Suspense, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';
import { formatDateToLocalTimezone } from '@/utils/timezone';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import SearchableDropdown from '@/components/SearchableDropdown';
import DateRangePicker from '@/components/DateRangePicker';

interface NBD {
    id: number;
    party_name: string;
    type: string;
    contact_person: string;
    email: string;
    contact_no_1: string;
    contact_no_2: string;
    location: string;
    state: string;
    stage: string;
    tat_days: string;
    field_person_name: string;
    remarks: string;
    created_at: string;
    follow_up_date: string;
}

interface FollowUpData {
    nbd_id: number;
    status: string;
    remark: string;
    created_at?: string;
    next_follow_up_date?: string;
    type?: string;
    follow_up_date?: string;
    order_won_count?: number;
}

const STAGES = ['START', 'DEMO', 'SAMPLING', 'QUOTATION', 'NEGOTIATION', 'ORDER AWAITED'];
const TYPES = ['DEALER', 'PRINTER', 'AGENCY', 'CORPORATE'];

function NBDContent() {
    const [nbds, setNbds] = useState<NBD[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNBD, setEditingNBD] = useState<NBD | null>(null);
    const [formData, setFormData] = useState<Partial<NBD>>({});
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'tile' | 'dead'>('list');
    const [showOpenFollowup, setShowOpenFollowup] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<'id' | 'created_at' | 'party_name' | 'stage' | 'tat_days' | 'type' | 'contact_person' | 'email' | 'contact_no_1' | 'contact_no_2' | 'location' | 'state' | 'field_person_name' | 'follow_up_date' | 'status'>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [fieldPersonSearchOpen, setFieldPersonSearchOpen] = useState(false);
    const [fieldPersonSearchQuery, setFieldPersonSearchQuery] = useState('');
    const fieldPersonSearchRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const filterBtnRef = useRef<HTMLButtonElement>(null);
    const [filterPos, setFilterPos] = useState({ top: 0, right: 0 });

    const FollowUpRoadmap = ({ history, nbd }: { history: FollowUpData[], nbd: NBD }) => {
        const sortedHistory = [...history].sort((a, b) => {
            const dateA = new Date(a.created_at || '').getTime();
            const dateB = new Date(b.created_at || '').getTime();
            return dateB - dateA; // Latest first
        });

        return (
            <div className="space-y-6 p-2">
                {/* Enhanced Compact Header */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--theme-primary)]/15 rounded-2xl shadow-inner">
                            <svg className="w-7 h-7 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                            Roadmap
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] leading-none mb-1">Total</span>
                            <span className="text-11 text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none">Followups</span>
                        </div>
                        <span className="text-6xl font-black text-[var(--theme-primary)] leading-none tabular-nums animate-pulse">
                            {sortedHistory.length}
                        </span>
                    </div>
                </div>

                <div className="relative">
                    {/* Continuous Vertical Line */}
                    <div className="absolute left-[28px] top-8 bottom-0 w-1 bg-gradient-to-b from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-800 dark:to-transparent rounded-full opacity-50" />

                    <div className="space-y-8">
                        {sortedHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-bold tracking-tight">No follow-ups recorded.</p>
                            </div>
                        ) : (
                            sortedHistory.map((item, index) => {
                                const interactionNumber = sortedHistory.length - index;
                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -30, y: 10 }}
                                        animate={{ opacity: 1, x: 0, y: 0 }}
                                        transition={{
                                            type: "spring",
                                            damping: 20,
                                            stiffness: 100,
                                            delay: index * 0.05
                                        }}
                                        className="relative pl-20"
                                    >
                                        {/* Roadmap Number Node - MUCH BIGGER */}
                                        <div className={`absolute left-0 top-1 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center z-10 
                                            ${index === 0
                                                ? 'bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 border-4 border-white dark:border-gray-800 rotate-3'
                                                : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-2 border-gray-100 dark:border-gray-600'
                                            }`}
                                        >
                                            <span className={`text-xl font-black tabular-nums tracking-tighter ${index === 0 ? 'text-gray-900' : ''}`}>
                                                {interactionNumber.toString().padStart(2, '0')}
                                            </span>
                                        </div>

                                        <div className="group bg-white dark:bg-gray-800/60 rounded-[28px] p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:bg-gray-50 dark:hover:bg-gray-700/80 hover:border-[var(--theme-primary)]/40 transition-all duration-300">
                                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] shadow-md ${item.status === 'Order Won' ? 'bg-green-500 text-white' :
                                                        item.status === 'Dead' ? 'bg-red-500 text-white' :
                                                            item.status === 'Not Answered' ? 'bg-orange-500 text-white' :
                                                                'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                                                        }`}>
                                                        {item.status || 'Remark Only'}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <p className="text-[11px] font-black text-gray-900 dark:text-white flex items-center gap-1.5 opacity-80">
                                                            <svg className="w-3.5 h-3.5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            {item.created_at ? formatDateToLocalTimezone(item.created_at) : '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {item.type && (
                                                    <div className="bg-[var(--theme-primary)]/10 px-3 py-1.5 rounded-xl border border-[var(--theme-primary)]/20">
                                                        <span className="text-[11px] font-black text-[var(--theme-primary)] uppercase tracking-widest leading-none">
                                                            {item.type}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative mb-4 overflow-hidden">
                                                <p className="relative z-10 text-gray-800 dark:text-gray-200 text-base leading-relaxed font-bold italic tracking-tight">
                                                    "{item.remark}"
                                                </p>
                                            </div>

                                            {item.next_follow_up_date && item.status && (
                                                <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[var(--theme-primary)]/5 dark:bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20">
                                                        <svg className="w-5 h-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-[0.15em] leading-none mb-1">Next Followup</span>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">
                                                            <span className="text-gray-900 dark:text-white text-lg tabular-nums">{formatDisplayDate(item.next_follow_up_date)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}

                        {/* Starting Point Node */}
                        <div className="relative pl-20 pb-4">
                            <div className="absolute left-[16px] top-1 w-[28px] h-[28px] rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center z-10">
                                <div className="w-2 h-2 rounded-full bg-[var(--theme-primary)] animate-pulse" />
                            </div>
                            <div className="pt-2 flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Inception Point</span>
                                    <p className="text-xs font-black text-gray-500 dark:text-gray-400 italic">Created on {nbd.created_at ? formatDateToLocalTimezone(nbd.created_at) : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const [filters, setFilters] = useState({
        parties: [] as string[],
        partyNames: [] as string[],
        types: [] as string[],
        stages: [] as string[],
        createdDateFrom: '',
        createdDateTo: '',
        followUpDateFrom: '',
        followUpDateTo: '',
        location: '',
        state: '',
        fieldPerson: '',
        contactPerson: '',
        email: '',
    });

    // Details drawer state
    const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
    const [selectedNBD, setSelectedNBD] = useState<NBD | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Filter Options
    const partyOptions = useMemo(() => {
        const unique = Array.from(new Set(nbds.map(n => n.party_name))).filter(Boolean);
        return unique.sort().map(name => ({ id: name, name }));
    }, [nbds]);

    const fieldPersonOptions = useMemo(() => {
        const unique = Array.from(new Set(nbds.map(n => n.field_person_name))).filter(Boolean);
        return unique.sort().map(name => ({ id: name, name }));
    }, [nbds]);

    const locationOptions = useMemo(() => {
        const unique = Array.from(new Set(nbds.map(n => n.location))).filter(Boolean);
        return unique.sort().map(name => ({ id: name, name }));
    }, [nbds]);

    const stateOptions = useMemo(() => {
        const unique = Array.from(new Set(nbds.map(n => n.state))).filter(Boolean);
        return unique.sort().map(name => ({ id: name, name }));
    }, [nbds]);

    const contactPersonOptions = useMemo(() => {
        const unique = Array.from(new Set(nbds.map(n => n.contact_person))).filter(Boolean);
        return unique.sort().map(name => ({ id: name, name }));
    }, [nbds]);

    const emailOptions = useMemo(() => {
        const unique = Array.from(new Set(nbds.map(n => n.email))).filter(Boolean);
        return unique.sort().map(name => ({ id: name, name }));
    }, [nbds]);

    // Calendar modal state
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [calendarModalNBDs, setCalendarModalNBDs] = useState<NBD[]>([]);

    // Follow-up status state
    const [followUpStatus, setFollowUpStatus] = useState<string>('');
    const [followUpRemark, setFollowUpRemark] = useState<string>('');
    const [followUpType, setFollowUpType] = useState<string>('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
    const [followUpDataMap, setFollowUpDataMap] = useState<Map<number, FollowUpData>>(new Map());

    // Follow-up analytics state
    const [followUpStats, setFollowUpStats] = useState({ totalFollowUps: 0, lastWeek: 0, lastMonth: 0 });
    const [nbdHistory, setNbdHistory] = useState<FollowUpData[]>([]);

    // Order Won state
    const [orderItems, setOrderItems] = useState<{ id: number; item: string; qty: string }[]>([{ id: Date.now(), item: '', qty: '' }]);
    const itemIdCounter = useRef(Date.now());

    const toast = useToast();
    const loader = useLoader();
    const ITEMS_PER_PAGE = 10;


    useEffect(() => {
        fetchNBDs();
        fetchUsers();
    }, []);

    // Calculate follow-up date when TAT days change
    useEffect(() => {
        if (formData.tat_days && parseInt(formData.tat_days) > 0) {
            const today = new Date();
            const daysToAdd = parseInt(formData.tat_days);
            const followUpDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

            const year = followUpDate.getFullYear();
            const month = String(followUpDate.getMonth() + 1).padStart(2, '0');
            const day = String(followUpDate.getDate()).padStart(2, '0');
            const dateStr = `${day}/${month}/${year}`;

            setFormData(prev => ({ ...prev, follow_up_date: dateStr }));
        } else {
            setFormData(prev => ({ ...prev, follow_up_date: '' }));
        }
    }, [formData.tat_days]);

    // Handle click outside field person dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fieldPersonSearchRef.current && !fieldPersonSearchRef.current.contains(event.target as Node)) {
                setFieldPersonSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNBDs = async () => {
        try {
            const res = await fetch('/api/nbd');
            if (res.ok) {
                const data = await res.json();
                const rawNbds = Array.isArray(data) ? data : data.nbds || [];
                const processedNbds = rawNbds.map((nbd: any) => ({
                    ...nbd,
                    id: typeof nbd.id === 'string' ? parseInt(nbd.id) : nbd.id
                }));
                setNbds(processedNbds);
            } else {
                toast.error('Failed to fetch NBDs');
            }

            // Fetch follow-up data
            const followUpRes = await fetch('/api/nbd-followup');
            if (followUpRes.ok) {
                const responseData = await followUpRes.json();

                // Check if response has the new structure with stats
                if (responseData.followUpData && responseData.stats) {
                    const followUpData = responseData.followUpData;
                    const followUpMap = new Map<number, FollowUpData>();
                    followUpData.forEach((item: FollowUpData) => {
                        followUpMap.set(item.nbd_id, item);
                    });
                    setFollowUpDataMap(followUpMap);
                    setFollowUpStats(responseData.stats);
                } else {
                    // Fallback for old API structure
                    const followUpArray = Array.isArray(responseData) ? responseData : [];
                    const followUpMap = new Map<number, FollowUpData>();
                    followUpArray.forEach((item: FollowUpData) => {
                        followUpMap.set(item.nbd_id, item);
                    });
                    setFollowUpDataMap(followUpMap);
                }
            }
        } catch (error) {
            toast.error('Error loading data');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNBDHistory = async (id: number) => {
        try {
            const res = await fetch(`/api/nbd-followup?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                setNbdHistory(data);
            }
        } catch (error) {
            console.error('Error fetching NBD history:', error);
        }
    };


    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr || dateStr === '-') return '-';

        // Handle YYYY-MM-DD from CustomDateTimePicker or ISO strings
        if (dateStr.includes('-') && !dateStr.includes('/')) {
            const parts = dateStr.split('-');
            if (parts.length >= 3) {
                // Take only date part if it's a full ISO string
                const year = parts[0];
                const month = parts[1];
                const day = parts[2].split('T')[0].split(' ')[0];
                return `${day}/${month}/${year}`;
            }
        }
        return dateStr;
    };

    const calculateDynamicStatus = (dateStr: string) => {
        if (!dateStr || dateStr === '-') return '-';

        let followUpDate: Date;

        // Handle YYYY-MM-DD
        if (dateStr.includes('-') && !dateStr.includes('/')) {
            followUpDate = new Date(dateStr);
        } else if (dateStr.includes('/')) {
            // Handle DD/MM/YYYY
            const parts = dateStr.split('/');
            if (parts.length !== 3) return '-';
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            followUpDate = new Date(year, month, day);
        } else {
            return '-';
        }

        if (isNaN(followUpDate.getTime())) return '-';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        followUpDate.setHours(0, 0, 0, 0);

        const diffTime = followUpDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Pending';
        if (diffDays <= 7) return 'Upcoming';
        return 'Planned';
    };

    const getEffectiveFollowUpDate = (nbd: NBD) => {
        const date = followUpDataMap.get(nbd.id)?.next_follow_up_date || nbd.follow_up_date;
        return formatDisplayDate(date);
    };

    const getEffectiveStatus = (nbd: NBD) => {
        const followUp = followUpDataMap.get(nbd.id);
        if (followUp?.status) return followUp.status;
        const date = followUp?.next_follow_up_date || nbd.follow_up_date;
        return calculateDynamicStatus(date);
    };

    const getEffectiveRemark = (nbd: NBD) => followUpDataMap.get(nbd.id)?.remark || nbd.remarks || '-';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = !!editingNBD;
        const url = '/api/nbd';
        const method = isEditing ? 'PUT' : 'POST';
        const body = isEditing ? { ...formData, id: editingNBD.id } : formData;

        try {
            loader.showLoader();
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                toast.success(isEditing ? 'NBD updated' : 'NBD created');
                setIsModalOpen(false);
                setEditingNBD(null);
                setFormData({});
                fetchNBDs();
            } else {
                toast.error('Operation failed');
            }
        } catch (error) {
            toast.error('Error saving data');
        } finally {
            loader.hideLoader();
        }
    };

    const handleDelete = async (id: number) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            loader.showLoader();
            const res = await fetch(`/api/nbd?id=${deleteId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Record deleted');
                fetchNBDs();
                setShowDeleteModal(false);
                setDeleteId(null);
            } else {
                toast.error('Delete failed');
            }
        } catch (error) {
            toast.error('Error deleting record');
        } finally {
            loader.hideLoader();
        }
    };

    const openModal = (nbd?: NBD) => {
        if (nbd) {
            setEditingNBD(nbd);
            setFormData(nbd);
        } else {
            setEditingNBD(null);
            setFormData({});
        }
        setIsModalOpen(true);
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            const userList = data.users || [];
            console.log('Users loaded:', userList);
            setUsers(userList);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleViewDetails = (nbd: NBD) => {
        setSelectedNBD(nbd);
        setShowDetailsDrawer(true);
        fetchNBDHistory(nbd.id);
    };

    const closeDetailsDrawer = () => {
        setShowDetailsDrawer(false);
        setSelectedNBD(null);
        setNbdHistory([]);
    };

    const filteredNBDs = useMemo(() => {
        return nbds.filter(nbd => {
            const effectiveStatus = getEffectiveStatus(nbd);

            // Separate Dead NBDs from other views
            if (viewMode === 'dead') {
                if (effectiveStatus !== 'Dead') return false;
            } else {
                if (effectiveStatus === 'Dead') return false;
            }

            const matchesSearch = Object.values(nbd).some(val =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            );

            const matchesParty = filters.parties.length === 0 || filters.parties.some(p => nbd.party_name.toLowerCase().includes(p.toLowerCase()));
            const matchesPartyName = filters.partyNames.length === 0 || filters.partyNames.includes(nbd.party_name);
            const matchesType = filters.types.length === 0 || filters.types.includes(nbd.type);
            const matchesStage = filters.stages.length === 0 || filters.stages.includes(nbd.stage);

            // New Filters
            const matchesLocation = !filters.location || nbd.location === filters.location;
            const matchesState = !filters.state || nbd.state === filters.state;
            const matchesFieldPerson = !filters.fieldPerson || nbd.field_person_name === filters.fieldPerson;
            const matchesContactPerson = !filters.contactPerson || nbd.contact_person === filters.contactPerson;
            const matchesEmail = !filters.email || nbd.email === filters.email;

            // Follow Up Date Range Filter
            const effectiveFollowUpDateStr = getEffectiveFollowUpDate(nbd);
            let matchesFollowUpDate = true;

            if (effectiveFollowUpDateStr !== '-' && (filters.followUpDateFrom || filters.followUpDateTo)) {
                const [day, month, year] = effectiveFollowUpDateStr.split('/').map(Number);
                const effectiveDate = new Date(year, month - 1, day);

                if (filters.followUpDateFrom) {
                    const fromDate = new Date(filters.followUpDateFrom);
                    fromDate.setHours(0, 0, 0, 0);
                    if (effectiveDate < fromDate) matchesFollowUpDate = false;
                }

                if (filters.followUpDateTo) {
                    const toDate = new Date(filters.followUpDateTo);
                    toDate.setHours(23, 59, 59, 999);
                    if (effectiveDate > toDate) matchesFollowUpDate = false;
                }
            } else if (effectiveFollowUpDateStr === '-' && (filters.followUpDateFrom || filters.followUpDateTo)) {
                matchesFollowUpDate = false;
            }

            // Open Followup Filter
            let matchesOpenFollowup = true;
            if (showOpenFollowup) {
                if (effectiveStatus === 'Dead' || effectiveStatus === 'Order Won') {
                    matchesOpenFollowup = false;
                } else {
                    const followUpDateStr = followUpDataMap.get(nbd.id)?.next_follow_up_date || nbd.follow_up_date;
                    if (!followUpDateStr || followUpDateStr === '-') {
                        matchesOpenFollowup = false;
                    } else {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        let followUpDate: Date;
                        if (followUpDateStr.includes('-') && !followUpDateStr.includes('/')) {
                            followUpDate = new Date(followUpDateStr);
                        } else if (followUpDateStr.includes('/')) {
                            const [day, month, year] = followUpDateStr.split('/').map(Number);
                            followUpDate = new Date(year, month - 1, day);
                        } else {
                            matchesOpenFollowup = false;
                            return false;
                        }
                        followUpDate.setHours(0, 0, 0, 0);
                        matchesOpenFollowup = followUpDate <= today;
                    }
                }
            }

            return matchesSearch && matchesParty && matchesPartyName && matchesType && matchesStage &&
                matchesLocation && matchesState && matchesFieldPerson &&
                matchesContactPerson && matchesEmail &&
                matchesFollowUpDate && matchesOpenFollowup;
        });
    }, [nbds, searchQuery, filters, viewMode, followUpDataMap, showOpenFollowup]);

    // Sorting logic
    const sortedNBDs = useMemo(() => {
        const sorted = [...filteredNBDs].sort((a, b) => {
            let aVal: any;
            let bVal: any;

            if (sortField === 'status') {
                aVal = getEffectiveStatus(a);
                bVal = getEffectiveStatus(b);
            } else if (sortField === 'follow_up_date') {
                const dateA = followUpDataMap.get(a.id)?.next_follow_up_date || a.follow_up_date;
                const dateB = followUpDataMap.get(b.id)?.next_follow_up_date || b.follow_up_date;

                const parseDateForSort = (d: string) => {
                    if (!d || d === '-') return 0;
                    if (d.includes('/')) {
                        const [day, month, year] = d.split('/').map(Number);
                        return new Date(year, month - 1, day).getTime();
                    }
                    return new Date(d).getTime();
                };

                aVal = parseDateForSort(dateA);
                bVal = parseDateForSort(dateB);
            } else {
                aVal = a[sortField as keyof NBD];
                bVal = b[sortField as keyof NBD];
            }

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal === bVal) return 0;
            return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

        return sorted;
    }, [filteredNBDs, sortField, sortDirection, followUpDataMap]);

    // Pagination
    const paginatedNBDs = useMemo(() => {
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedNBDs.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    }, [sortedNBDs, currentPage]);

    const totalPages = Math.ceil(sortedNBDs.length / ITEMS_PER_PAGE);

    const handleSort = (field: 'id' | 'created_at' | 'party_name' | 'stage' | 'tat_days' | 'type' | 'contact_person' | 'email' | 'contact_no_1' | 'contact_no_2' | 'location' | 'state' | 'field_person_name' | 'follow_up_date' | 'status') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => (
        <span className="text-xs opacity-50">
            {sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
        </span>
    );

    const handleExportCSV = () => {
        try {
            const headers = [
                'ID', 'Party Name', 'Type', 'Contact Person', 'Email',
                'Contact No 1', 'Contact No 2', 'Location', 'State', 'Stage',
                'TAT Days', 'Follow Up Date', 'Field Person', 'Remarks', 'Created Date'
            ];

            const rows = sortedNBDs.map(nbd => [
                nbd.id,
                nbd.party_name,
                nbd.type,
                nbd.contact_person,
                nbd.email,
                nbd.contact_no_1,
                nbd.contact_no_2 || '',
                nbd.location,
                nbd.state,
                nbd.stage,
                nbd.tat_days,
                nbd.follow_up_date || '',
                nbd.field_person_name,
                nbd.remarks || '',
                nbd.created_at ? formatDateToLocalTimezone(nbd.created_at) : ''
            ].map(field => {
                const escaped = String(field).replace(/"/g, '""');
                return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
            }).join(','));

            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `nbd_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success(`Exported ${sortedNBDs.length} records to CSV`);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            toast.error('Failed to export CSV');
        }
    };

    const handleDownloadTemplate = () => {
        try {
            const headers = ['party_name', 'type', 'contact_person', 'email', 'contact_no_1', 'contact_no_2', 'location', 'state', 'stage', 'tat_days', 'field_person_name', 'remarks'];
            const sampleData = [
                ['ABC Corporation', 'DEALER', 'John Smith', 'john@example.com', '9876543210', '9876543211', 'Mumbai', 'Maharashtra', 'START', '7', 'Jatin Kumar', 'Initial contact made'],
                ['XYZ Printers', 'PRINTER', 'Sarah Johnson', 'sarah@example.com', '8765432109', '8765432110', 'Delhi', 'Delhi', 'DEMO', '5', 'Rohan Kumar', 'Demo scheduled'],
            ];

            const rows = sampleData.map(row =>
                row.map(field => {
                    const escaped = String(field).replace(/"/g, '""');
                    return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
                }).join(',')
            );

            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'nbd_template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Template downloaded successfully');
        } catch (error) {
            console.error('Error downloading template:', error);
            toast.error('Failed to download template');
        }
    };

    const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            loader.showLoader();
            const text = await file.text();
            const lines = text.trim().split('\n');

            if (lines.length < 2) {
                toast.error('CSV file must contain at least a header row and one data row');
                loader.hideLoader();
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
            const expectedHeaders = ['id', 'party_name', 'type', 'contact_person', 'email', 'contact_no_1', 'contact_no_2', 'location', 'state', 'stage', 'tat_days', 'follow_up_date', 'field_person_name', 'remarks', 'created_at'];

            // Check if headers match
            const requiredHeaders = ['party_name', 'type', 'stage'];
            const hasRequiredHeaders = requiredHeaders.every(h => headers.includes(h));

            if (!hasRequiredHeaders) {
                toast.error(`CSV must contain required columns: ${requiredHeaders.join(', ')}`);
                loader.hideLoader();
                return;
            }

            const records: Partial<NBD>[] = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Simple CSV parsing (handle quoted fields)
                const values: string[] = [];
                let current = '';
                let insideQuotes = false;

                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                        insideQuotes = !insideQuotes;
                    } else if (char === ',' && !insideQuotes) {
                        values.push(current.trim().replace(/^"|"$/g, ''));
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current.trim().replace(/^"|"$/g, ''));

                const record: Partial<NBD> = {};
                headers.forEach((header, index) => {
                    if (index < values.length) {
                        const value = values[index];
                        if (value) {
                            if (header === 'tat_days') {
                                (record as any)[header] = String(value);
                            } else if (header === 'id') {
                                (record as any)[header] = parseInt(value);
                            } else {
                                (record as any)[header] = value;
                            }
                        }
                    }
                });

                // Calculate follow_up_date based on tat_days
                if (record.tat_days && parseInt(String(record.tat_days)) > 0) {
                    const today = new Date();
                    const daysToAdd = parseInt(String(record.tat_days));
                    const followUpDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

                    const year = followUpDate.getFullYear();
                    const month = String(followUpDate.getMonth() + 1).padStart(2, '0');
                    const day = String(followUpDate.getDate()).padStart(2, '0');
                    const dateStr = `${day}/${month}/${year}`;

                    (record as any).follow_up_date = dateStr;
                }

                if (record.party_name && record.type && record.stage) {
                    records.push(record);
                }
            }

            if (records.length === 0) {
                toast.error('No valid records found in CSV');
                loader.hideLoader();
                return;
            }

            // Upload records to database
            const res = await fetch('/api/nbd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bulkUpload: true,
                    records
                }),
            });

            if (res.ok) {
                toast.success(`Successfully imported ${records.length} NBD records`);
                fetchNBDs();
            } else {
                const error = await res.json();
                toast.error(error.message || 'Failed to import records');
            }
        } catch (error) {
            console.error('Error importing CSV:', error);
            toast.error('Failed to import CSV file');
        } finally {
            loader.hideLoader();
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const openFilterModal = () => {
        if (filterBtnRef.current) {
            const rect = filterBtnRef.current.getBoundingClientRect();
            setFilterPos({
                top: rect.bottom + 10,
                right: window.innerWidth - rect.right
            });
        }
        setShowFilterModal(true);
    };

    const handleFollowUpStatusUpdate = async (status: string) => {
        if (!selectedNBD) return;

        try {
            loader.showLoader();
            const res = await fetch('/api/nbd-followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nbd_id: selectedNBD.id,
                    status: status,
                    remark: followUpRemark,
                    follow_up_date: followUpDataMap.get(selectedNBD.id)?.next_follow_up_date || selectedNBD.follow_up_date
                }),
            });

            if (res.ok) {
                toast.success('Follow-up status updated');
                setFollowUpStatus(status);
                setFollowUpRemark('');
                // Refresh NBDs to get updated status
                fetchNBDs();
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating follow-up status:', error);
            toast.error('Error updating status');
        } finally {
            loader.hideLoader();
        }
    };

    // Item management functions
    const addOrderItem = () => {
        itemIdCounter.current += 1;
        setOrderItems([...orderItems, { id: itemIdCounter.current, item: '', qty: '' }]);
    };

    const removeOrderItem = (id: number) => {
        if (orderItems.length > 1) {
            setOrderItems(orderItems.filter(item => item.id !== id));
        }
    };

    const updateOrderItem = (id: number, field: 'item' | 'qty', value: string) => {
        const updated = orderItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        setOrderItems(updated);
    };

    
    const handleBulkShiftToCRR = async () => {
        const wonOrderIds = nbds.filter(nbd => {
            const followUp = followUpDataMap.get(nbd.id);
            return (followUp?.order_won_count || 0) >= 3;
        }).map(n => n.id);

        if (wonOrderIds.length === 0) {
            toast.info('No Order Won records found to shift');
            return;
        }

        try {
            loader.showLoader();
            const res = await fetch('/api/shift-to-crr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: wonOrderIds, source: 'nbd' }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || 'Records shifted to CRR successfully');
                fetchNBDs();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to shift records');
            }
        } catch (error) {
            console.error('Error shifting to CRR:', error);
            toast.error('Error shifting records');
        } finally {
            loader.hideLoader();
        }
    };

    const handleShiftToCRR = async (nbd: NBD) => {
        try {
            loader.showLoader();
            const res = await fetch('/api/shift-to-crr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: nbd.id, source: 'nbd' }),
            });

            if (res.ok) {
                toast.success('Record shifted to CRR successfully');
                fetchNBDs();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to shift record');
            }
        } catch (error) {
            console.error('Error shifting to CRR:', error);
            toast.error('Error shifting record');
        } finally {
            loader.hideLoader();
        }
    };

    return (
        <LayoutWrapper>
            <div className="p-4 max-w-[1920px] mx-auto">
                {/* Header Section */}
                <motion.div
                    className="mb-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--theme-primary)] dark:text-[var(--theme-primary)] mb-2">
                                NBD Management
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Manage new business developments</p>
                        </div>
                        <div className="flex gap-2 flex-wrap items-center">
                            {/* View Mode Switcher */}
                            <div className="flex gap-2 bg-[var(--theme-light)] dark:bg-gray-700 p-1 rounded-xl border border-[var(--theme-primary)]/20">
                                {(['list', 'calendar', 'tile', 'dead'] as const).map((mode) => (
                                    <motion.button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${viewMode === mode
                                            ? 'bg-[var(--theme-primary)] text-gray-900 shadow-lg'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        title={`Switch to ${mode} view`}
                                    >
                                        {mode === 'list' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
                                        {mode === 'calendar' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                        {mode === 'tile' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2zm0 10H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2zm10-10h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2zm0 10h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2z" /></svg>}
                                        {mode === 'dead' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                                        <span className="hidden sm:inline text-xs">{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                                    </motion.button>
                                ))}
                            </div>


                            {nbds.some(nbd => (getEffectiveStatus(nbd) === 'Order Won' || (followUpDataMap.get(nbd.id)?.order_won_count || 0) > 0)) && (
                                <motion.button
                                    onClick={handleBulkShiftToCRR}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs mr-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                    <span className="hidden sm:inline">Shift Won to CRR</span>
                                </motion.button>
                            )}

                            <motion.button
                                onClick={handleExportCSV}
                                disabled={sortedNBDs.length === 0}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-2 bg-[var(--theme-primary)] text-gray-900 hover:bg-[var(--theme-secondary)] hover:shadow-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-xs"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="hidden sm:inline">Export CSV</span>
                            </motion.button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleImportCSV}
                                style={{ display: 'none' }}
                            />

                            <motion.button
                                onClick={() => fileInputRef.current?.click()}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-2 bg-[var(--theme-primary)] text-gray-900 hover:bg-[var(--theme-secondary)] hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4v4m0 0l3-3m-3 3l-3-3m2-8H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2zm-6 8h.01M9 15h.01" />
                                </svg>
                                <span className="hidden sm:inline">Import CSV</span>
                            </motion.button>

                            <motion.button
                                onClick={handleDownloadTemplate}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-2 bg-[var(--theme-primary)] text-gray-900 hover:bg-[var(--theme-secondary)] hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs"
                                title="Download CSV template to see the required format"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className="hidden sm:inline">Template</span>
                            </motion.button>

                            <motion.button
                                onClick={() => {
                                    setShowOpenFollowup(!showOpenFollowup);
                                    setCurrentPage(1);
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-3 py-2 ${showOpenFollowup ? 'bg-orange-500 text-white' : 'bg-[var(--theme-primary)] text-gray-900'} hover:bg-[var(--theme-secondary)] hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs relative`}
                                title="Show NBDs with today's or past follow-up dates"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="hidden sm:inline">Open Followup</span>
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {(() => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        return nbds.filter(nbd => {
                                            const effectiveStatus = getEffectiveStatus(nbd);
                                            if (effectiveStatus === 'Dead' || effectiveStatus === 'Order Won') return false;
                                            const followUpDateStr = followUpDataMap.get(nbd.id)?.next_follow_up_date || nbd.follow_up_date;
                                            if (!followUpDateStr || followUpDateStr === '-') return false;
                                            let followUpDate: Date;
                                            if (followUpDateStr.includes('-') && !followUpDateStr.includes('/')) {
                                                followUpDate = new Date(followUpDateStr);
                                            } else if (followUpDateStr.includes('/')) {
                                                const [day, month, year] = followUpDateStr.split('/').map(Number);
                                                followUpDate = new Date(year, month - 1, day);
                                            } else {
                                                return false;
                                            }
                                            followUpDate.setHours(0, 0, 0, 0);
                                            return followUpDate <= today;
                                        }).length;
                                    })()}
                                </span>
                            </motion.button>

                            <motion.button
                                ref={filterBtnRef}
                                onClick={openFilterModal}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-2 bg-[var(--theme-primary)] text-gray-900 hover:bg-[var(--theme-secondary)] hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                <span className="hidden sm:inline">Filter</span>
                            </motion.button>
                            <motion.button
                                onClick={() => openModal()}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-2 bg-[var(--theme-primary)] text-gray-900 hover:bg-[var(--theme-secondary)] hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="hidden sm:inline">Add New NBD</span>
                                <span className="sm:hidden">+ New</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    className="overflow-x-auto mb-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex gap-1.5 min-w-max pb-1">
                        {(() => {
                            const statusConfigs = [
                                { label: 'Order Won', color: 'green', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                { label: 'Overdue', color: 'red', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                { label: 'Pending', color: 'yellow', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                { label: 'Upcoming', color: 'blue', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                { label: 'Planned', color: 'purple', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                                { label: 'Call Later', color: 'amber', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> },
                                { label: 'Not Answered', color: 'indigo', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
                                { label: 'Dead', color: 'slate', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> },
                            ];

                            const getColorConfig = (color: string) => {
                                const configs: { [key: string]: { bgGradient: string; borderColor: string; textColor: string; iconBg: string; } } = {
                                    green: { bgGradient: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20', borderColor: 'border-green-200 dark:border-green-700', textColor: 'text-green-700 dark:text-green-400', iconBg: 'from-green-500 to-green-600' },
                                    red: { bgGradient: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20', borderColor: 'border-red-200 dark:border-red-700', textColor: 'text-red-700 dark:text-red-400', iconBg: 'from-red-500 to-red-600' },
                                    yellow: { bgGradient: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20', borderColor: 'border-yellow-200 dark:border-yellow-700', textColor: 'text-yellow-700 dark:text-yellow-400', iconBg: 'from-yellow-500 to-yellow-600' },
                                    blue: { bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20', borderColor: 'border-blue-200 dark:border-blue-700', textColor: 'text-blue-700 dark:text-blue-400', iconBg: 'from-blue-500 to-blue-600' },
                                    purple: { bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20', borderColor: 'border-purple-200 dark:border-purple-700', textColor: 'text-purple-700 dark:text-purple-400', iconBg: 'from-purple-500 to-purple-600' },
                                    amber: { bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20', borderColor: 'border-amber-200 dark:border-amber-700', textColor: 'text-amber-700 dark:text-amber-400', iconBg: 'from-amber-500 to-amber-600' },
                                    indigo: { bgGradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20', borderColor: 'border-indigo-200 dark:border-indigo-700', textColor: 'text-indigo-700 dark:text-indigo-400', iconBg: 'from-indigo-500 to-indigo-600' },
                                    slate: { bgGradient: 'from-slate-50 to-slate-100 dark:from-slate-800/20 dark:to-slate-700/20', borderColor: 'border-slate-200 dark:border-slate-700', textColor: 'text-slate-700 dark:text-slate-400', iconBg: 'from-slate-500 to-slate-600' },
                                };
                                return configs[color] || configs.green;
                            };

                            return (
                                <>
                                    {statusConfigs.map((status) => {
                                        const count = nbds.filter(n => getEffectiveStatus(n) === status.label).length;
                                        const config = getColorConfig(status.color);
                                        return (
                                            <motion.div
                                                key={status.label}
                                                className={`bg-gradient-to-br ${config.bgGradient} rounded-lg px-4 py-2.5 border ${config.borderColor} min-w-fit hover:shadow-lg transition-all`}
                                                whileHover={{ scale: 1.02, y: -2 }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.iconBg} flex items-center justify-center flex-shrink-0 shadow-md`}>
                                                        <span className="text-white">{status.icon}</span>
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs font-semibold ${config.textColor} uppercase tracking-wider`}>{status.label}</p>
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    <motion.div
                                        className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-lg px-4 py-2.5 border border-indigo-200 dark:border-indigo-600 min-w-fit hover:shadow-lg transition-all"
                                        whileHover={{ scale: 1.02, y: -2 }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-md">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{nbds.length}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </>
                            );
                        })()}
                    </div>
                </motion.div>

                {/* Content Section */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <motion.div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {sortedNBDs.length === 0 ? (
                            <div className="p-12 text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">No NBDs found</p>
                                <button
                                    onClick={() => openModal()}
                                    className="text-[var(--theme-primary)] hover:underline font-semibold"
                                >
                                    Create your first NBD
                                </button>
                            </div>
                        ) : (
                            <>
                                {(viewMode === 'list' || viewMode === 'dead') && (
                                    <div>
                                        {/* Pagination Controls */}
                                        {totalPages > 1 && (
                                            <div className="px-4 py-2 flex justify-end gap-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                <motion.button
                                                    onClick={() => setCurrentPage(1)}
                                                    disabled={currentPage === 1}
                                                    className="p-1.5 rounded-lg font-medium text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--theme-lighter)] dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-[var(--theme-primary)]/20 disabled:hover:bg-[var(--theme-lighter)]"
                                                    title="First Page"
                                                    whileHover={{ scale: 1.05 }}
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-1.5 rounded-lg font-medium text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--theme-lighter)] dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-[var(--theme-primary)]/20 disabled:hover:bg-[var(--theme-lighter)]"
                                                    title="Previous Page"
                                                    whileHover={{ scale: 1.05 }}
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7 4l4-4-4-4" /></svg>
                                                </motion.button>
                                                <span className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{currentPage} / {totalPages}</span>
                                                <motion.button
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1.5 rounded-lg font-medium text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--theme-lighter)] dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-[var(--theme-primary)]/20 disabled:hover:bg-[var(--theme-lighter)]"
                                                    title="Next Page"
                                                    whileHover={{ scale: 1.05 }}
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-4l4 4-4 4" /></svg>
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1.5 rounded-lg font-medium text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--theme-lighter)] dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-[var(--theme-primary)]/20 disabled:hover:bg-[var(--theme-lighter)]"
                                                    title="Last Page"
                                                    whileHover={{ scale: 1.05 }}
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </motion.button>
                                            </div>
                                        )}
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-[var(--theme-primary)] dark:bg-[var(--theme-primary)] sticky top-0 border-b border-gray-200 dark:border-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('id')} className="flex items-center gap-1">
                                                                <span>ID</span>
                                                                <SortIcon field="id" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('party_name')} className="flex items-center gap-1">
                                                                <span>Party Details</span>
                                                                <SortIcon field="party_name" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('type')} className="flex items-center gap-1">
                                                                <span>Type</span>
                                                                <SortIcon field="type" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('email')} className="flex items-center gap-1">
                                                                <span>Contact Details</span>
                                                                <SortIcon field="email" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('location')} className="flex items-center gap-1">
                                                                <span>Address</span>
                                                                <SortIcon field="location" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('stage')} className="flex items-center gap-1">
                                                                <span>Stage</span>
                                                                <SortIcon field="stage" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('field_person_name')} className="flex items-center gap-1">
                                                                <span>Field Person</span>
                                                                <SortIcon field="field_person_name" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('follow_up_date')} className="flex items-center gap-1">
                                                                <span>Follow Up Date</span>
                                                                <SortIcon field="follow_up_date" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                                                            <button onClick={() => handleSort('status')} className="flex items-center gap-1">
                                                                <span>Status</span>
                                                                <SortIcon field="status" />
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Follow-up Remark</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {paginatedNBDs.map((nbd) => {
                                                        const followUp = followUpDataMap.get(nbd.id);
                                                        const status = getEffectiveStatus(nbd);
                                                        const isOrderWon = (followUp?.order_won_count || 0) >= 3;
                                                    return (
                                                    <motion.tr
                                                        key={nbd.id}
                                                        className={`transition cursor-pointer ${isOrderWon
                                                            ? 'bg-green-200/40 hover:bg-green-200/60 dark:bg-green-900/10 dark:hover:bg-green-900/20'
                                                            : 'hover:bg-[var(--theme-lighter)]/50 dark:hover:bg-gray-700/50'
                                                            }`}
                                                        onClick={() => handleViewDetails(nbd)}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">#{nbd.id}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                    <p className="font-semibold text-gray-900 dark:text-white">{nbd.party_name}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 ml-6">
                                                                    <svg className="w-3.5 h-3.5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400">{nbd.contact_person || '-'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border font-medium text-xs" style={{
                                                                backgroundColor: nbd.type === 'PRINTER' ? '#dbeafe' : nbd.type === 'PAINT' ? '#fce7f3' : nbd.type === 'Type B' ? '#fef3c7' : '#e0f2fe',
                                                                color: nbd.type === 'PRINTER' ? '#1e40af' : nbd.type === 'PAINT' ? '#be185d' : nbd.type === 'Type B' ? '#92400e' : '#0369a1',
                                                                borderColor: nbd.type === 'PRINTER' ? '#93c5fd' : nbd.type === 'PAINT' ? '#fbcfe8' : nbd.type === 'Type B' ? '#fcd34d' : '#7dd3fc'
                                                            }}>
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                                </svg>
                                                                {nbd.type}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <svg className="w-3.5 h-3.5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <p className="text-gray-600 dark:text-gray-300">{nbd.email || '-'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <svg className="w-3.5 h-3.5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                    </svg>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{nbd.contact_no_1 || '-'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <svg className="w-3.5 h-3.5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                    </svg>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{nbd.contact_no_2 || '-'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <svg className="w-3.5 h-3.5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    </svg>
                                                                    <p className="text-gray-600 dark:text-gray-300">{nbd.location || '-'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <svg className="w-3.5 h-3.5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 4a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2V4z" />
                                                                    </svg>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{nbd.state || '-'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border font-medium text-xs" style={{
                                                                backgroundColor: nbd.stage === 'START' ? '#dbeafe' : nbd.stage === 'DEMO' ? '#cffafe' : nbd.stage === 'SAMPLING' ? '#e9d5ff' : nbd.stage === 'QUOTATION' ? '#fef3c7' : nbd.stage === 'NEGOTIATION' ? '#fed7aa' : '#dcfce7',
                                                                color: nbd.stage === 'START' ? '#1e40af' : nbd.stage === 'DEMO' ? '#0891b2' : nbd.stage === 'SAMPLING' ? '#6d28d9' : nbd.stage === 'QUOTATION' ? '#92400e' : nbd.stage === 'NEGOTIATION' ? '#92400e' : '#166534',
                                                                borderColor: nbd.stage === 'START' ? '#93c5fd' : nbd.stage === 'DEMO' ? '#67e8f9' : nbd.stage === 'SAMPLING' ? '#d8b4fe' : nbd.stage === 'QUOTATION' ? '#fcd34d' : nbd.stage === 'NEGOTIATION' ? '#fdba74' : '#86efac'
                                                            }}>
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    {nbd.stage === 'START' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /> :
                                                                        nbd.stage === 'DEMO' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> :
                                                                            nbd.stage === 'SAMPLING' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9" /> :
                                                                                nbd.stage === 'QUOTATION' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /> :
                                                                                    nbd.stage === 'NEGOTIATION' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> :
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    }
                                                                </svg>
                                                                {nbd.stage}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{nbd.field_person_name}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{getEffectiveFollowUpDate(nbd)}</td>
                                                        <td className="px-4 py-3">
                                                            {(() => {
                                                                const status = getEffectiveStatus(nbd);
                                                                return (
                                                                    <span
                                                                        className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${status === 'Order Won' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                            status === 'Dead' || status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                                status === 'Call Later' || status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                                    status === 'Upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                                        status === 'Planned' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                                            }`}
                                                                    >
                                                                        {status}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={getEffectiveRemark(nbd)}>
                                                            {getEffectiveRemark(nbd)}
                                                        </td>
                                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex gap-1">
                                                                
                                                                <button
                                                                    onClick={() => handleViewDetails(nbd)}
                                                                    className="p-2 hover:bg-[var(--theme-primary)]/10 dark:hover:bg-[var(--theme-primary)]/20 rounded-lg text-[var(--theme-primary)] transition-colors"
                                                                    title="View Details"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => openModal(nbd)}
                                                                    className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg text-blue-500 transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(nbd.id)}
                                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                    )
                                                })}

                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {viewMode === 'tile' && (
                                    <div className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {paginatedNBDs.map((nbd, index) => (
                                                <motion.div
                                                    key={nbd.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="bg-gradient-to-br from-white to-[var(--theme-light)] dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-[var(--theme-primary)] overflow-hidden"
                                                >
                                                    <div className="p-4">
                                                        {/* Header Row - Party Name & Status */}
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-start gap-2 flex-1">
                                                                <div className="w-9 h-9 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0 shadow-sm">
                                                                    <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                                            #{nbd.id}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${nbd.stage === 'START' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                                                                            nbd.stage === 'DEMO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                                nbd.stage === 'SAMPLING' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                                    nbd.stage === 'QUOTATION' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                                        nbd.stage === 'NEGOTIATION' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                            }`}>
                                                                            {nbd.stage}
                                                                        </span>
                                                                        {(() => {
                                                                            const status = getEffectiveStatus(nbd);
                                                                            return (
                                                                                <span
                                                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status === 'Order Won' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                                        status === 'Dead' || status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                                            status === 'Call Later' || status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                                                status === 'Upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                                                    status === 'Planned' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                                                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                                                        }`}
                                                                                >
                                                                                    {status}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white break-words leading-tight">
                                                                        {nbd.party_name}
                                                                    </h3>
                                                                </div>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex gap-1 ml-3">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleViewDetails(nbd);
                                                                    }}
                                                                    className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 rounded-lg transition"
                                                                    title="View Details"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openModal(nbd);
                                                                    }}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                                                                    title="Edit"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(nbd.id);
                                                                    }}
                                                                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition"
                                                                    title="Delete"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Details Grid */}
                                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                                            {/* Type */}
                                                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Type</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nbd.type}</p>
                                                                </div>
                                                            </div>

                                                            {/* Contact Person */}
                                                            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Contact</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nbd.contact_person || '-'}</p>
                                                                </div>
                                                            </div>

                                                            {/* Email */}
                                                            <div className="flex items-center gap-2 bg-pink-50 dark:bg-pink-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wide">Email</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nbd.email || '-'}</p>
                                                                </div>
                                                            </div>

                                                            {/* Contact No 1 */}
                                                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Ph 1</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nbd.contact_no_1 || '-'}</p>
                                                                </div>
                                                            </div>

                                                            {/* Contact No 2 */}
                                                            <div className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Ph 2</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nbd.contact_no_2 || '-'}</p>
                                                                </div>
                                                            </div>

                                                            {/* Location */}
                                                            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Loc</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nbd.location || '-'}</p>
                                                                </div>
                                                            </div>

                                                            {/* State */}
                                                            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 4a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2V4z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">State</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nbd.state || '-'}</p>
                                                                </div>
                                                            </div>

                                                            {/* Follow Up Date */}
                                                            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Follow Up</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{getEffectiveFollowUpDate(nbd)}</p>
                                                                </div>
                                                            </div>

                                                            {/* Field Person */}
                                                            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                                                                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Person</p>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nbd.field_person_name || '-'}</p>
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {viewMode === 'calendar' && (
                                    <div className="p-6">
                                        <div className="grid grid-cols-7 gap-2 mb-4">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                                <div key={day} className="text-center font-bold text-gray-900 dark:text-white py-2">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-2">
                                            {(() => {
                                                const today = new Date();
                                                const year = today.getFullYear();
                                                const month = today.getMonth();
                                                const firstDay = new Date(year, month, 1);
                                                const lastDay = new Date(year, month + 1, 0);
                                                const daysInMonth = lastDay.getDate();
                                                const startingDayOfWeek = firstDay.getDay();

                                                const days = [];

                                                // Empty cells for days before month starts
                                                for (let i = 0; i < startingDayOfWeek; i++) {
                                                    days.push(<div key={`empty-${i}`} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 h-24"></div>);
                                                }

                                                // Days of the month
                                                for (let day = 1; day <= daysInMonth; day++) {
                                                    const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
                                                    const nbdsOnDate = sortedNBDs.filter(nbd => getEffectiveFollowUpDate(nbd) === dateStr);
                                                    const isToday = day === today.getDate();

                                                    days.push(
                                                        <motion.div
                                                            key={day}
                                                            className={`rounded-lg p-2 min-h-24 transition-all ${isToday
                                                                ? 'bg-[var(--theme-primary)] text-white border-2 border-[var(--theme-primary)]'
                                                                : nbdsOnDate.length > 0
                                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                                                                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                                                                }`}
                                                            whileHover={{ scale: 1.05 }}
                                                        >
                                                            <div className={`font-bold mb-1 ${isToday ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                                {day}
                                                            </div>
                                                            <div className="space-y-1 text-xs">
                                                                {nbdsOnDate.slice(0, 2).map((nbd) => (
                                                                    <div
                                                                        key={nbd.id}
                                                                        className={`p-2 rounded-lg mb-1.5 transition-all cursor-pointer group border shadow-sm hover:shadow-md ${isToday
                                                                            ? 'bg-white/10 border-white/20'
                                                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                                                            }`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleViewDetails(nbd);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-1 mb-1.5">
                                                                            <span className={`text-xs font-bold truncate flex-1 ${isToday ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                                                {nbd.party_name}
                                                                            </span>

                                                                            {/* Actions - visible on hover */}
                                                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setEditingNBD(nbd);
                                                                                        setFormData(nbd);
                                                                                        setIsModalOpen(true);
                                                                                    }}
                                                                                    className={`p-0.5 rounded transition ${isToday ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'}`}
                                                                                    title="Edit"
                                                                                >
                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDelete(nbd.id);
                                                                                    }}
                                                                                    className={`p-0.5 rounded transition ${isToday ? 'hover:bg-white/20 text-white' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'}`}
                                                                                    title="Delete"
                                                                                >
                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Status Badge */}
                                                                        <div>
                                                                            {(() => {
                                                                                const status = getEffectiveStatus(nbd);
                                                                                return (
                                                                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${status === 'Order Won' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                                                                        status === 'Dead' || status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                                                                            status === 'Call Later' || status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                                                                                status === 'Upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                                                                                    status === 'Planned' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                                                                                        isToday ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                                                        }`}>
                                                                                        {status}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {nbdsOnDate.length > 2 && (
                                                                    <motion.button
                                                                        onClick={() => {
                                                                            setCalendarModalNBDs(nbdsOnDate);
                                                                            setShowCalendarModal(true);
                                                                        }}
                                                                        className={`w-full p-1 text-center font-semibold rounded transition ${isToday ? 'text-white bg-white/10 hover:bg-white/20' : 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/40'
                                                                            }`}
                                                                        whileHover={{ scale: 1.02 }}
                                                                        title={`Show all ${nbdsOnDate.length} entries`}
                                                                    >
                                                                        +{nbdsOnDate.length - 2} more
                                                                    </motion.button>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                }

                                                return days;
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Pagination */}
                            </>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Filter Modal */}
            <AnimatePresence>
                {showFilterModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowFilterModal(false)}
                        />
                        <motion.div
                            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]">
                                <h3 className="text-xl font-bold text-gray-900">Applied Filters</h3>
                                <button
                                    onClick={() => setShowFilterModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition"
                                >
                                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <SearchableDropdown
                                            label="Party Name"
                                            options={partyOptions}
                                            value={filters.partyNames[0] || null}
                                            onChange={(val) => setFilters({ ...filters, partyNames: val ? [val as string] : [] })}
                                            placeholder="Search party..."
                                        />
                                        <SearchableDropdown
                                            label="Field Person"
                                            options={fieldPersonOptions}
                                            value={filters.fieldPerson || null}
                                            onChange={(val) => setFilters({ ...filters, fieldPerson: val as string })}
                                            placeholder="Search person..."
                                        />
                                        <SearchableDropdown
                                            label="Contact Person"
                                            options={contactPersonOptions}
                                            value={filters.contactPerson || null}
                                            onChange={(val) => setFilters({ ...filters, contactPerson: val as string })}
                                            placeholder="Search contact person..."
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <SearchableDropdown
                                            label="Location"
                                            options={locationOptions}
                                            value={filters.location || null}
                                            onChange={(val) => setFilters({ ...filters, location: val as string })}
                                            placeholder="Search location..."
                                        />
                                        <SearchableDropdown
                                            label="State"
                                            options={stateOptions}
                                            value={filters.state || null}
                                            onChange={(val) => setFilters({ ...filters, state: val as string })}
                                            placeholder="Search state..."
                                        />
                                        <SearchableDropdown
                                            label="Email"
                                            options={emailOptions}
                                            value={filters.email || null}
                                            onChange={(val) => setFilters({ ...filters, email: val as string })}
                                            placeholder="Search email..."
                                        />

                                    </div>
                                </div>

                                {/* Type and Stage Filters */}
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="space-y-4">
                                        {/* Type Filter */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                                            <div className="flex flex-wrap gap-2">
                                                {TYPES.map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            const newTypes = filters.types.includes(type)
                                                                ? filters.types.filter(t => t !== type)
                                                                : [...filters.types, type];
                                                            setFilters({ ...filters, types: newTypes });
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filters.types.includes(type)
                                                            ? 'bg-[var(--theme-primary)] text-gray-900 shadow-md'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Stage Filter */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Stage</label>
                                            <div className="flex flex-wrap gap-2">
                                                {STAGES.map((stage) => (
                                                    <button
                                                        key={stage}
                                                        onClick={() => {
                                                            const newStages = filters.stages.includes(stage)
                                                                ? filters.stages.filter(s => s !== stage)
                                                                : [...filters.stages, stage];
                                                            setFilters({ ...filters, stages: newStages });
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filters.stages.includes(stage)
                                                            ? 'bg-[var(--theme-primary)] text-gray-900 shadow-md'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        {stage}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Date Range Section */}
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center">
                                            <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        Follow Up Date Range
                                    </label>
                                    <DateRangePicker
                                        fromDate={filters.followUpDateFrom}
                                        toDate={filters.followUpDateTo}
                                        onRangeChange={(from, to) => setFilters({ ...filters, followUpDateFrom: from, followUpDateTo: to })}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-800/50">
                                <motion.button
                                    onClick={() => {
                                        setFilters({
                                            parties: [],
                                            partyNames: [],
                                            types: [],
                                            stages: [],
                                            createdDateFrom: '',
                                            createdDateTo: '',
                                            followUpDateFrom: '',
                                            followUpDateTo: '',
                                            location: '',
                                            state: '',
                                            fieldPerson: '',
                                            contactPerson: '',
                                            email: '',
                                        });
                                        setCurrentPage(1);
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-bold hover:bg-white dark:hover:bg-gray-700 transition-all text-sm"
                                >
                                    Clear All
                                </motion.button>
                                <motion.button
                                    onClick={() => setShowFilterModal(false)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 font-bold hover:shadow-lg transition-all text-sm"
                                >
                                    Apply Filters
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Details Drawer */}
            <AnimatePresence>
                {showDetailsDrawer && selectedNBD && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-[9998]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeDetailsDrawer}
                        />

                        {/* Drawer */}
                        <motion.div
                            className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white dark:bg-gray-800 shadow-2xl z-[9999] overflow-y-auto"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] p-6 z-10">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedNBD.party_name}</h2>
                                    <button
                                        onClick={closeDetailsDrawer}
                                        className="p-2 hover:bg-white/20 rounded-lg transition"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-700 mt-1">#{selectedNBD.id} - {selectedNBD.type}</p>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Main Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        NBD Information
                                    </h3>
                                    <div className="bg-[var(--theme-light)] dark:bg-gray-700 rounded-xl p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Type</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.type}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Stage</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.stage}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Contact Person</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.contact_person}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Email</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white break-all text-sm">{selectedNBD.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Details */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Phone 1</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.contact_no_1}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Phone 2</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.contact_no_2 || '-'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Location Details */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Location</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.location}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21l-7-5m0 0l-7 5m7-5v10" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">State</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.state}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">TAT Days</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.tat_days}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Follow Up Date</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{getEffectiveFollowUpDate(selectedNBD)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Status</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{getEffectiveStatus(selectedNBD)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Field Person</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedNBD.field_person_name}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remarks and Created Date */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Remarks</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{getEffectiveRemark(selectedNBD)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Created Date</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{selectedNBD.created_at ? formatDateToLocalTimezone(selectedNBD.created_at) : '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Follow-up Status Selection */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Select Status
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Status Buttons in Single Row */}
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: 'Not Answered', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-gray-500 to-gray-600' },
                                                { label: 'Call Later', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', color: 'from-yellow-500 to-yellow-600' },
                                                { label: 'Dead', icon: 'M6 18L18 6M6 6l12 12', color: 'from-red-500 to-red-600' },
                                                { label: 'Order Won', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-green-500 to-green-600' }
                                            ].map((statusObj) => (
                                                <motion.button
                                                    key={statusObj.label}
                                                    onClick={() => {
                                                        setFollowUpStatus(statusObj.label);
                                                        // Reset next follow up date if status is Dead
                                                        if (statusObj.label === 'Dead') {
                                                            setNextFollowUpDate('');
                                                        }
                                                    }}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`flex-1 min-w-[110px] px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${followUpStatus === statusObj.label
                                                        ? `bg-gradient-to-r ${statusObj.color} text-white shadow-md scale-105`
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                                                        }`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={statusObj.icon} />
                                                    </svg>
                                                    <span className="hidden sm:inline">{statusObj.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>

                                        {/* Order Won Items Section */}
                                        <AnimatePresence>
                                            {followUpStatus === 'Order Won' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Order Items</label>
                                                        <button
                                                            onClick={addOrderItem}
                                                            type="button"
                                                            className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Add Item
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                        {orderItems.map((item) => (
                                                            <div key={item.id} className="flex gap-2 items-start">
                                                                <div className="flex-1">
                                                                    <input
                                                                        type="text"
                                                                        value={item.item}
                                                                        onChange={(e) => updateOrderItem(item.id, 'item', e.target.value)}
                                                                        placeholder="Item name"
                                                                        className="w-full px-2 py-1.5 bg-[var(--theme-light)] dark:bg-gray-700 border border-[var(--theme-primary)]/30 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition"
                                                                    />
                                                                </div>
                                                                <div className="w-24">
                                                                    <input
                                                                        type="number"
                                                                        value={item.qty}
                                                                        onChange={(e) => updateOrderItem(item.id, 'qty', e.target.value)}
                                                                        placeholder="Qty"
                                                                        className="w-full px-2 py-1.5 bg-[var(--theme-light)] dark:bg-gray-700 border border-[var(--theme-primary)]/30 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition"
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => removeOrderItem(item.id)}
                                                                    disabled={orderItems.length === 1}
                                                                    type="button"
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title="Remove item"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Next Follow-up Date Input */}
                                        <AnimatePresence>
                                            {followUpStatus !== 'Dead' && followUpStatus !== 'Order Won' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                >
                                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Next Follow-up Date</label>
                                                    <CustomDateTimePicker
                                                        value={nextFollowUpDate}
                                                        onChange={(val) => setNextFollowUpDate(val)}
                                                        placeholder="Select next follow-up date..."
                                                        dateOnly={true}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Type Buttons */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'No Requirement',
                                                    'Price Issue (Negotiation)',
                                                    'Quality Issue',
                                                    'Order Awaited',
                                                    'Ordered'
                                                ].map((type) => (
                                                    <motion.button
                                                        key={type}
                                                        onClick={() => setFollowUpType(type)}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${followUpType === type
                                                            ? 'bg-[var(--theme-primary)] text-gray-900 shadow-md scale-105'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        {type}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Remark Input */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Follow-up Remark</label>
                                            <textarea
                                                value={followUpRemark}
                                                onChange={(e) => setFollowUpRemark(e.target.value)}
                                                placeholder="Add a remark for this follow-up..."
                                                rows={3}
                                                className="w-full px-3 py-2 bg-[var(--theme-light)] dark:bg-gray-700 border border-[var(--theme-primary)]/30 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition resize-none text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        <motion.button
                                            onClick={async () => {
                                                if (!selectedNBD) return;

                                                // Validation
                                                if (!followUpStatus) {
                                                    toast.error('Please select a Status');
                                                    return;
                                                }

                                                // Order Won specific validation
                                                if (followUpStatus === 'Order Won') {
                                                    const validItems = orderItems.filter(item => item.item.trim() && item.qty.trim());
                                                    if (validItems.length === 0) {
                                                        toast.error('Please add at least one item with quantity');
                                                        return;
                                                    }

                                                    // Submit to O2D
                                                    try {
                                                        loader.showLoader();
                                                        const o2dRes = await fetch('/api/o2d', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                party_name: selectedNBD.party_name,
                                                                type: selectedNBD.type,
                                                                contact_person: selectedNBD.contact_person,
                                                                email: selectedNBD.email,
                                                                contact_no_1: selectedNBD.contact_no_1,
                                                                contact_no_2: selectedNBD.contact_no_2,
                                                                location: selectedNBD.location,
                                                                state: selectedNBD.state,
                                                                field_person_name: selectedNBD.field_person_name,
                                                                items: validItems
                                                            }),
                                                        });

                                                        if (!o2dRes.ok) {
                                                            const error = await o2dRes.json();
                                                            toast.error(error.error || 'Failed to submit order');
                                                            loader.hideLoader();
                                                            return;
                                                        }
                                                    } catch (error) {
                                                        console.error('Error submitting order:', error);
                                                        toast.error('Error submitting order');
                                                        loader.hideLoader();
                                                        return;
                                                    }
                                                }

                                                if (!followUpType) {
                                                    toast.error('Please select a Type');
                                                    return;
                                                }
                                                if (!followUpRemark.trim()) {
                                                    toast.error('Please enter a Remark');
                                                    return;
                                                }
                                                if (followUpStatus !== 'Dead' && followUpStatus !== 'Order Won' && !nextFollowUpDate) {
                                                    toast.error('Please select a Next Follow-up Date');
                                                    return;
                                                }

                                                try {
                                                    loader.showLoader();
                                                    const res = await fetch('/api/nbd-followup', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            nbd_id: selectedNBD.id,
                                                            status: followUpStatus,
                                                            remark: followUpRemark,
                                                            next_follow_up_date: nextFollowUpDate,
                                                            type: followUpType,
                                                            follow_up_date: followUpDataMap.get(selectedNBD.id)?.next_follow_up_date || selectedNBD.follow_up_date
                                                        }),
                                                    });

                                                    if (res.ok) {
                                                        toast.success(followUpStatus === 'Order Won' ? 'Order submitted successfully!' : 'Follow-up status and remark submitted');
                                                        setFollowUpStatus('');
                                                        setFollowUpRemark('');
                                                        setFollowUpType('');
                                                        setNextFollowUpDate('');
                                                        // Reset order items
                                                        itemIdCounter.current = Date.now();
                                                        setOrderItems([{ id: itemIdCounter.current, item: '', qty: '' }]);
                                                        fetchNBDs();
                                                        closeDetailsDrawer();
                                                    } else {
                                                        toast.error('Failed to submit status');
                                                    }
                                                } catch (error) {
                                                    console.error('Error:', error);
                                                    toast.error('Error submitting status');
                                                } finally {
                                                    loader.hideLoader();
                                                }
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="px-4 py-3 bg-[var(--theme-primary)] text-gray-900 rounded-xl font-bold hover:bg-[var(--theme-secondary)] hover:shadow-lg transition-all text-sm leading-tight"
                                        >
                                            Submit Status with Remark
                                        </motion.button>
                                        <motion.button
                                            onClick={async () => {
                                                if (!selectedNBD) return;

                                                // Validation
                                                if (!followUpRemark.trim()) {
                                                    toast.error('Please enter a Remark');
                                                    return;
                                                }

                                                try {
                                                    loader.showLoader();
                                                    const res = await fetch('/api/nbd-followup', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            nbd_id: selectedNBD.id,
                                                            status: '',
                                                            remark: followUpRemark,
                                                            next_follow_up_date: '',
                                                            type: '',
                                                            follow_up_date: followUpDataMap.get(selectedNBD.id)?.next_follow_up_date || selectedNBD.follow_up_date
                                                        }),
                                                    });

                                                    if (res.ok) {
                                                        toast.success('Remark submitted');
                                                        setFollowUpStatus('');
                                                        setFollowUpRemark('');
                                                        setFollowUpType('');
                                                        setNextFollowUpDate('');
                                                        fetchNBDs();
                                                        closeDetailsDrawer();
                                                    } else {
                                                        toast.error('Failed to submit remark');
                                                    }
                                                } catch (error) {
                                                    console.error('Error:', error);
                                                    toast.error('Error submitting remark');
                                                } finally {
                                                    loader.hideLoader();
                                                }
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="px-4 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 hover:shadow-lg transition-all text-sm leading-tight"
                                        >
                                            Remark Only
                                        </motion.button>
                                    </div>
                                    <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-8">
                                        <FollowUpRoadmap history={nbdHistory} nbd={selectedNBD} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-[9996]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            className="fixed inset-0 z-[9997] flex items-center justify-center p-4 pointer-events-none"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <div
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] p-6 sticky top-0 z-10">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {editingNBD ? 'Edit NBD' : 'Create New NBD'}
                                        </h2>
                                        <button
                                            onClick={() => setIsModalOpen(false)}
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
                                    {/* Row 1: Party Name, Type, Contact Person */}
                                    <motion.div
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                Party Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.party_name || ''}
                                                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Enter party name..."
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                                            <select
                                                value={formData.type || ''}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                            >
                                                <option value="">Select Type...</option>
                                                {TYPES.map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contact Person</label>
                                            <input
                                                type="text"
                                                value={formData.contact_person || ''}
                                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Enter contact person..."
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Row 2: Email, Contact No 1, Contact No 2 */}
                                    <motion.div
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Enter email..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contact No 1</label>
                                            <input
                                                type="text"
                                                value={formData.contact_no_1 || ''}
                                                onChange={(e) => setFormData({ ...formData, contact_no_1: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Enter contact no..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contact No 2</label>
                                            <input
                                                type="text"
                                                value={formData.contact_no_2 || ''}
                                                onChange={(e) => setFormData({ ...formData, contact_no_2: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Enter alternate contact..."
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Row 3: Location, State, Stage */}
                                    <motion.div
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Location</label>
                                            <input
                                                type="text"
                                                value={formData.location || ''}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Enter location..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">State</label>
                                            <input
                                                type="text"
                                                value={formData.state || ''}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Enter state..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Stage</label>
                                            <select
                                                value={formData.stage || ''}
                                                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                            >
                                                <option value="">Select Stage...</option>
                                                {STAGES.map(stage => (
                                                    <option key={stage} value={stage}>{stage}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </motion.div>

                                    {/* Row 4: TAT Days, Follow Up Date, Field Person */}
                                    <motion.div
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                    >
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">TAT Next Call (Days)</label>
                                            <input
                                                type="number"
                                                value={formData.tat_days || ''}
                                                onChange={(e) => setFormData({ ...formData, tat_days: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Enter days..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Follow Up Date</label>
                                            <input
                                                type="text"
                                                value={formData.follow_up_date || ''}
                                                disabled
                                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-600 border-0 rounded-xl text-gray-600 dark:text-gray-300 text-sm cursor-not-allowed"
                                                placeholder={formData.tat_days ? 'Auto-calculated' : 'Enter TAT Days'}
                                            />
                                        </div>
                                        <div className="relative" ref={fieldPersonSearchRef}>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Field Person</label>
                                            <input
                                                type="text"
                                                value={fieldPersonSearchQuery || formData.field_person_name || ''}
                                                onChange={(e) => {
                                                    setFieldPersonSearchQuery(e.target.value);
                                                    setFieldPersonSearchOpen(true);
                                                }}
                                                onFocus={() => setFieldPersonSearchOpen(true)}
                                                className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                                                placeholder="Search field person..."
                                            />
                                            {fieldPersonSearchOpen && (
                                                <motion.div
                                                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                >
                                                    {users && users.length > 0 ? (
                                                        users
                                                            .filter(user =>
                                                                user.username.toLowerCase().includes(fieldPersonSearchQuery.toLowerCase())
                                                            )
                                                            .map((user) => (
                                                                <button
                                                                    key={user.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, field_person_name: user.username });
                                                                        setFieldPersonSearchQuery(user.username);
                                                                        setFieldPersonSearchOpen(false);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-600 transition text-sm text-gray-900 dark:text-white"
                                                                >
                                                                    {user.username}
                                                                </button>
                                                            ))
                                                    ) : (
                                                        <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            No users available
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>

                                    {/* Row 4b: Created Date (Read-only, only shown when editing) */}
                                    {/* Removed - Created Date is shown in details drawer instead */}

                                    {/* Row 5: Remarks */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Remarks</label>
                                        <textarea
                                            value={formData.remarks || ''}
                                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition resize-none text-sm"
                                            placeholder="Add any additional remarks..."
                                        />
                                    </motion.div>

                                    {/* Submit Buttons */}
                                    <motion.div
                                        className="flex gap-3 pt-2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.35 }}
                                    >
                                        <button
                                            type="submit"
                                            className="flex-1 px-6 py-2.5 bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-gray-900 font-bold rounded-xl shadow-lg transition"
                                        >
                                            {editingNBD ? 'Update NBD' : 'Create NBD'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-[9990]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteId(null);
                            }}
                        />
                        <motion.div
                            className="fixed inset-0 z-[9991] flex items-center justify-center p-4 pointer-events-none"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <div
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-6">
                                    {/* Icon & Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                Are you sure you want to delete this NBD record?
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                                        This action cannot be undone. The record will be permanently removed from the system.
                                    </p>
                                    <div className="flex gap-3">
                                        <motion.button
                                            onClick={() => {
                                                setShowDeleteModal(false);
                                                setDeleteId(null);
                                            }}
                                            className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            onClick={confirmDelete}
                                            className="flex-1 px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all shadow-md"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Delete
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}

                {/* Calendar Modal - Show all entries for a date */}
                <AnimatePresence>
                    {showCalendarModal && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                            onClick={() => setShowCalendarModal(false)}
                        >
                            <motion.div
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-11/12 sm:w-96 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Entries ({calendarModalNBDs.length})</h3>
                                <div className="space-y-2">
                                    {calendarModalNBDs.map((nbd) => (
                                        <div
                                            key={nbd.id}
                                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer"
                                            onClick={() => {
                                                setSelectedNBD(nbd);
                                                setShowDetailsDrawer(true);
                                                setShowCalendarModal(false);
                                            }}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{nbd.party_name}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">ID: #{nbd.id} • {nbd.type}</p>
                                                </div>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedNBD(nbd);
                                                            setShowDetailsDrawer(true);
                                                            setShowCalendarModal(false);
                                                        }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition"
                                                        title="View"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingNBD(nbd);
                                                            setFormData(nbd);
                                                            setIsModalOpen(true);
                                                            setShowCalendarModal(false);
                                                        }}
                                                        className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 rounded-lg transition"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(nbd.id);
                                                            setShowCalendarModal(false);
                                                        }}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowCalendarModal(false)}
                                    className="w-full mt-4 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition"
                                >
                                    Close
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </AnimatePresence>
        </LayoutWrapper>
    );
}

export default function NBDPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <NBDContent />
        </Suspense>
    );
}
