'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import Icon from '@/components/Icon';
import { formatDateToLocalTimezone } from '@/utils/timezone';

interface User {
  id: number;
  username: string;
  name: string;
}

interface Ticket {
  id: number;
  ticket_number: string;
  raised_by: number;
  raised_by_name: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  accountable_person: number | null;
  accountable_person_name: string | null;
  desired_date: string | null;
  status: string;
  attachments: any;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface Remark {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name: string;
  remark: string;
  created_at: string;
}

const statusConfig = [
  { key: 'raised', label: 'Raised', icon: 'warning', color: 'from-red-400 to-red-600' },
  { key: 'verified', label: 'Verified', icon: 'check-circle', color: 'from-blue-400 to-blue-600' },
  { key: 'in-progress', label: 'In Progress', icon: 'clock', color: 'from-yellow-400 to-yellow-600' },
  { key: 'solved', label: 'Solved', icon: 'check', color: 'from-green-400 to-green-600' },
  { key: 'follow-up', label: 'Follow-up', icon: 'message', color: 'from-purple-400 to-purple-600' },
  { key: 'closed', label: 'Closed', icon: 'close', color: 'from-gray-400 to-gray-600' }
];

const categories = [
  'Hardware Issue',
  'Software Issue',
  'Network Problem',
  'Access Request',
  'Email Problem',
  'Application Error',
  'Other'
];

const priorities = ['Low', 'Medium', 'High', 'Critical'];

export default function HelpDeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketRemarks, setTicketRemarks] = useState<Remark[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    category: '',
    priority: 'Medium',
    subject: '',
    description: '',
    assignedTo: '',
    accountablePerson: '',
    desiredDate: '',
    desiredTime: ''
  });

  const [remarkText, setRemarkText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [assignedToSearch, setAssignedToSearch] = useState('');
  const [showAssignedToDropdown, setShowAssignedToDropdown] = useState(false);
  const [accountablePersonSearch, setAccountablePersonSearch] = useState('');
  const [showAccountablePersonDropdown, setShowAccountablePersonDropdown] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
    fetchTickets();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/helpdesk');
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketRemarks = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/helpdesk/remarks?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        setTicketRemarks(data);
      }
    } catch (error) {
      console.error('Error fetching ticket remarks:', error);
    }
  };

  const handleAddTicket = async () => {
    if (!formData.category || !formData.subject || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    if (!currentUser) {
      alert('User session not found. Please refresh the page.');
      return;
    }

    try {
      const assignedUser = users.find(u => u.id === parseInt(formData.assignedTo));
      const accountableUser = users.find(u => u.id === parseInt(formData.accountablePerson));

      let desiredDateTime = null;
      if (formData.desiredDate && formData.desiredTime) {
        const [hours, minutes] = formData.desiredTime.split(':');
        const date = new Date(formData.desiredDate);
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        desiredDateTime = date.toISOString();
      }

      const response = await fetch('/api/helpdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raisedBy: currentUser.id,
          raisedByName: currentUser.name,
          category: formData.category,
          priority: formData.priority,
          subject: formData.subject,
          description: formData.description,
          assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
          assignedToName: assignedUser?.name || null,
          accountablePerson: formData.accountablePerson ? parseInt(formData.accountablePerson) : null,
          accountablePersonName: accountableUser?.name || null,
          desiredDate: desiredDateTime
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({
          category: '',
          priority: 'Medium',
          subject: '',
          description: '',
          assignedTo: '',
          accountablePerson: '',
          desiredDate: '',
          desiredTime: ''
        });
        fetchTickets();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    }
  };

  const handleStatusChange = async () => {
    if (!selectedTicket || !newStatus) return;

    try {
      const updateData: any = { id: selectedTicket.id, status: newStatus };
      
      if (newStatus === 'solved' || newStatus === 'closed') {
        updateData.resolvedAt = new Date().toISOString();
      }

      const response = await fetch('/api/helpdesk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        fetchTickets();
        if (selectedTicket) {
          const updatedTickets = await fetch('/api/helpdesk');
          const data = await updatedTickets.json();
          const updated = data.find((t: Ticket) => t.id === selectedTicket.id);
          setSelectedTicket(updated);
        }
        setNewStatus('');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const handleAddRemark = async () => {
    if (!selectedTicket || !remarkText.trim()) return;

    try {
      const response = await fetch('/api/helpdesk/remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          userId: currentUser.id,
          userName: currentUser.name,
          remark: remarkText
        })
      });

      if (response.ok) {
        setRemarkText('');
        fetchTicketRemarks(selectedTicket.id);
      }
    } catch (error) {
      console.error('Error adding remark:', error);
    }
  };

  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    fetchTicketRemarks(ticket.id);
    setShowDetailModal(true);
  };

  const filteredTickets = selectedStatus === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === selectedStatus);

  const getTicketCountByStatus = (status: string) => {
    return tickets.filter(t => t.status === status).length;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <LayoutWrapper>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] bg-clip-text text-transparent mb-2">
                HelpDesk
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Manage and track support tickets</p>
            </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            <Icon name="plus" size={20} />
            Raise Ticket
          </motion.button>
        </div>
      </div>

      {/* Status Tiles */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* All Tickets Tile */}
          <motion.div
            whileHover={{ scale: 1.05, rotateY: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedStatus('all')}
            className={`cursor-pointer p-6 rounded-2xl shadow-lg ${
              selectedStatus === 'all'
                ? 'bg-gradient-to-br from-[#f4d24a] to-[#e5c33a] text-gray-900'
                : 'bg-white dark:bg-gray-800 hover:shadow-xl'
            } transition-all`}
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                animate={{ rotate: selectedStatus === 'all' ? 360 : 0 }}
                transition={{ duration: 0.5 }}
              >
                <Icon name="list" size={32} />
              </motion.div>
              <h3 className="font-bold text-lg mt-3">All Tickets</h3>
              <p className="text-2xl font-bold mt-2">{tickets.length}</p>
            </div>
          </motion.div>

          {/* Status Tiles */}
          {statusConfig.map((status, index) => (
            <motion.div
              key={status.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, rotateY: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedStatus(status.key)}
              className={`cursor-pointer p-6 rounded-2xl shadow-lg ${
                selectedStatus === status.key
                  ? `bg-gradient-to-br ${status.color} text-white`
                  : 'bg-white dark:bg-gray-800 hover:shadow-xl'
              } transition-all`}
            >
              <div className="flex flex-col items-center text-center">
                <motion.div
                  animate={{ rotate: selectedStatus === status.key ? 360 : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon name={status.icon as any} size={32} />
                </motion.div>
                <h3 className="font-bold text-lg mt-3">{status.label}</h3>
                <p className="text-2xl font-bold mt-2">{getTicketCountByStatus(status.key)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-6">
            {selectedStatus === 'all' ? 'All Tickets' : `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Tickets`}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4d24a] mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="inbox" size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredTickets.map((ticket, index) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => openTicketDetail(ticket)}
                    className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg hover:border-[#f4d24a] transition-all cursor-pointer bg-gradient-to-r from-transparent to-transparent hover:from-yellow-50 hover:to-transparent dark:hover:from-yellow-900/10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                            {ticket.ticket_number}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {ticket.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{ticket.subject}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Icon name="user" size={14} />
                            {ticket.raised_by_name}
                          </span>
                          {ticket.assigned_to_name && (
                            <span className="flex items-center gap-1">
                              <Icon name="user-check" size={14} />
                              Assigned to: {ticket.assigned_to_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Icon name="clock" size={14} />
                            {formatDateToLocalTimezone(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r ${
                        statusConfig.find(s => s.key === ticket.status)?.color || 'from-gray-400 to-gray-600'
                      } text-white`}>
                        {statusConfig.find(s => s.key === ticket.status)?.label || ticket.status}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Add Ticket Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Raise New Ticket</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Icon name="close" size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent"
                  >
                    {priorities.map(pri => (
                      <option key={pri} value={pri}>{pri}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Subject *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Brief summary of the issue"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the problem..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent resize-none"
                  />
                </div>

                {/* Assigned To - Searchable */}
                <div className="relative">
                  <label className="block text-sm font-semibold mb-2">Assign To (Problem Solver)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.assignedTo ? users.find(u => u.id === parseInt(formData.assignedTo))?.name || '' : assignedToSearch}
                      onChange={(e) => {
                        setAssignedToSearch(e.target.value);
                        setFormData({ ...formData, assignedTo: '' });
                        setShowAssignedToDropdown(true);
                      }}
                      onFocus={() => setShowAssignedToDropdown(true)}
                      placeholder="Search or select user..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent"
                    />
                    <svg className="absolute right-3 top-4 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {showAssignedToDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAssignedToDropdown(false)} />
                      <motion.div
                        className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {users
                          .filter(u => u.name.toLowerCase().includes(assignedToSearch.toLowerCase()))
                          .map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, assignedTo: u.id.toString() });
                                setAssignedToSearch('');
                                setShowAssignedToDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-[#f5f1e8] dark:hover:bg-gray-700 transition text-sm text-gray-900 dark:text-white"
                            >
                              {u.name}
                            </button>
                          ))}
                        {users.filter(u => u.name.toLowerCase().includes(assignedToSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">No results found</div>
                        )}
                      </motion.div>
                    </>
                  )}
                </div>

                {/* Accountable Person - Searchable */}
                <div className="relative">
                  <label className="block text-sm font-semibold mb-2">Accountable Person</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.accountablePerson ? users.find(u => u.id === parseInt(formData.accountablePerson))?.name || '' : accountablePersonSearch}
                      onChange={(e) => {
                        setAccountablePersonSearch(e.target.value);
                        setFormData({ ...formData, accountablePerson: '' });
                        setShowAccountablePersonDropdown(true);
                      }}
                      onFocus={() => setShowAccountablePersonDropdown(true)}
                      placeholder="Search or select user..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent"
                    />
                    <svg className="absolute right-3 top-4 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {showAccountablePersonDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAccountablePersonDropdown(false)} />
                      <motion.div
                        className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {users
                          .filter(u => u.name.toLowerCase().includes(accountablePersonSearch.toLowerCase()))
                          .map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, accountablePerson: u.id.toString() });
                                setAccountablePersonSearch('');
                                setShowAccountablePersonDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-[#f5f1e8] dark:hover:bg-gray-700 transition text-sm text-gray-900 dark:text-white"
                            >
                              {u.name}
                            </button>
                          ))}
                        {users.filter(u => u.name.toLowerCase().includes(accountablePersonSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">No results found</div>
                        )}
                      </motion.div>
                    </>
                  )}
                </div>

                {/* Desired Resolution Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Desired Date</label>
                    <input
                      type="date"
                      value={formData.desiredDate}
                      onChange={(e) => setFormData({ ...formData, desiredDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Desired Time</label>
                    <input
                      type="time"
                      value={formData.desiredTime}
                      onChange={(e) => setFormData({ ...formData, desiredTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddTicket}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Raise Ticket
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] p-6 rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTicket.subject}</h2>
                    <p className="font-mono text-sm text-gray-700">{selectedTicket.ticket_number}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Icon name="close" size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Ticket Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 dark:bg-gray-700">
                      {selectedTicket.category}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                    Created: {formatDateToLocalTimezone(selectedTicket.created_at)}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="font-semibold mb-1 text-sm">Raised By</h3>
                    <p className="text-gray-700 dark:text-gray-300">{selectedTicket.raised_by_name}</p>
                  </div>
                  {selectedTicket.assigned_to_name && (
                    <div>
                      <h3 className="font-semibold mb-1 text-sm">Assigned To</h3>
                      <p className="text-gray-700 dark:text-gray-300">{selectedTicket.assigned_to_name}</p>
                    </div>
                  )}
                  {selectedTicket.accountable_person_name && (
                    <div>
                      <h3 className="font-semibold mb-1 text-sm">Accountable Person</h3>
                      <p className="text-gray-700 dark:text-gray-300">{selectedTicket.accountable_person_name}</p>
                    </div>
                  )}
                  {selectedTicket.desired_date && (
                    <div>
                      <h3 className="font-semibold mb-1 text-sm">Desired Resolution</h3>
                      <p className="text-gray-700 dark:text-gray-300">{formatDateToLocalTimezone(selectedTicket.desired_date)}</p>
                    </div>
                  )}
                </div>

                {/* Status Update */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <h3 className="font-semibold mb-3">Update Status</h3>
                  <div className="flex gap-3">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    >
                      {statusConfig.map(status => (
                        <option key={status.key} value={status.key}>{status.label}</option>
                      ))}
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStatusChange}
                      disabled={newStatus === selectedTicket.status}
                      className="px-6 py-2 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update
                    </motion.button>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <h3 className="font-semibold mb-3">Follow-up Notes</h3>
                  <div className="space-y-3 mb-4">
                    {ticketRemarks.map(remark => (
                      <div key={remark.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-sm">{remark.user_name}</span>
                          <span className="text-xs text-gray-500">{formatDateToLocalTimezone(remark.created_at)}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{remark.remark}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="Add a follow-up note..."
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddRemark()}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddRemark}
                      className="px-6 py-2 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 rounded-xl font-semibold"
                    >
                      Add Note
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </LayoutWrapper>
  );
}
