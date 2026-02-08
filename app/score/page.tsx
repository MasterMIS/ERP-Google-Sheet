'use client';

import { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ensureSessionId } from '@/utils/session';

interface DelegationData {
    id: string;
    task_title: string;
    status: string;
    doer_name: string;
    delegator_name: string;
    due_date: string;
    priority: string;
}

interface ChecklistData {
    id: string;
    title: string;
    status: string;
    assignee: string;
    due_date: string;
}

interface ScoreStats {
    totalDelegations: number;
    totalChecklists: number;
    completedDelegations: number;
    completedChecklists: number;
}

export default function ScorePage() {
    const [delegations, setDelegations] = useState<DelegationData[]>([]);
    const [checklists, setChecklists] = useState<ChecklistData[]>([]);
    const [stats, setStats] = useState<ScoreStats>({
        totalDelegations: 0,
        totalChecklists: 0,
        completedDelegations: 0,
        completedChecklists: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const sessionId = ensureSessionId();

            // Fetch delegations
            const delResponse = await fetch('/api/delegations', {
                headers: { 'x-session-id': sessionId }
            });
            const delData = await delResponse.json();
            const delegationsList = delData.delegations || [];
            setDelegations(delegationsList);

            // Fetch checklists
            const checkResponse = await fetch('/api/checklists', {
                headers: { 'x-session-id': sessionId }
            });
            const checkData = await checkResponse.json();
            const checklistsList = checkData.checklists || [];
            setChecklists(checklistsList);

            // Calculate stats
            setStats({
                totalDelegations: delegationsList.length,
                totalChecklists: checklistsList.length,
                completedDelegations: delegationsList.filter((d: DelegationData) => d.status === 'completed').length,
                completedChecklists: checklistsList.filter((c: ChecklistData) => c.status === 'completed').length,
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    return (
        <LayoutWrapper>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4 sm:p-6 md:p-8 text-white">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Performance Scoring</h1>
                    <p className="text-sm sm:text-base text-purple-100">
                        Track and analyze performance metrics from delegations and checklists
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Total Delegations</p>
                                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                                    {loading ? '...' : stats.totalDelegations}
                                </p>
                            </div>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-xl sm:text-2xl">
                                📋
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Completed Delegations</p>
                                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                                    {loading ? '...' : stats.completedDelegations}
                                </p>
                            </div>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-xl sm:text-2xl">
                                ✅
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Total Checklists</p>
                                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                                    {loading ? '...' : stats.totalChecklists}
                                </p>
                            </div>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-xl sm:text-2xl">
                                📝
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Completed Checklists</p>
                                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                                    {loading ? '...' : stats.completedChecklists}
                                </p>
                            </div>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-xl sm:text-2xl">
                                ✨
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Delegations Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Delegation Data
                        </h2>
                        <div className="space-y-2">
                            {loading ? (
                                <p className="text-slate-600 dark:text-slate-400 text-sm">Loading delegations...</p>
                            ) : delegations.length === 0 ? (
                                <p className="text-slate-600 dark:text-slate-400 text-sm">No delegations found</p>
                            ) : (
                                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    {delegations.length} delegation(s) loaded. Scoring logic will be implemented here.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Checklists Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Checklist Data
                        </h2>
                        <div className="space-y-2">
                            {loading ? (
                                <p className="text-slate-600 dark:text-slate-400 text-sm">Loading checklists...</p>
                            ) : checklists.length === 0 ? (
                                <p className="text-slate-600 dark:text-slate-400 text-sm">No checklists found</p>
                            ) : (
                                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    {checklists.length} checklist(s) loaded. Scoring logic will be implemented here.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Placeholder for Scoring Logic */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Scoring System
                    </h2>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-blue-800 dark:text-blue-300 text-sm">
                            ℹ️ Scoring logic will be implemented based on your instructions.
                            Data from {stats.totalDelegations} delegations and {stats.totalChecklists} checklists is ready for processing.
                        </p>
                    </div>
                </div>
            </div>
        </LayoutWrapper>
    );
}
