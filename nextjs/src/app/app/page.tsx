"use client";
import React from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CalendarDays, Settings, ExternalLink, SearchCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type RecentAudit = {
    id: string;
    marketplace: string;
    asin: string | null;
    product_title: string | null;
    overall_score: number | null;
    created_at: string;
};

type UsageSnapshot = {
    plan: string;
    auditCreditsMonthly: number;
    auditsRemaining: number;
    aiCreditsMonthly: number;
    aiRemaining: number;
    competitorCreditsMonthly: number;
    competitorsRemaining: number;
};

export default function DashboardContent() {
    const { loading, user } = useGlobal();
    const [recentAudits, setRecentAudits] = useState<RecentAudit[]>([]);
    const [usage, setUsage] = useState<UsageSnapshot | null>(null);

    useEffect(() => {
        async function loadRecentAudits() {
            try {
                const response = await fetch('/api/audit?limit=3', {
                    method: 'GET',
                    cache: 'no-store',
                });
                if (!response.ok) {
                    return;
                }
                const data = await response.json() as { audits?: RecentAudit[] };
                setRecentAudits(data.audits || []);
            } catch (error) {
                console.error('Failed to load recent audits:', error);
            }
        }

        async function loadUsage() {
            try {
                const response = await fetch('/api/usage', {
                    method: 'GET',
                    cache: 'no-store',
                });
                if (!response.ok) {
                    return;
                }
                const data = await response.json() as { usage?: UsageSnapshot };
                setUsage(data.usage || null);
            } catch (error) {
                console.error('Failed to load usage:', error);
            }
        }

        loadRecentAudits();
        loadUsage();
    }, []);

    const getDaysSinceRegistration = () => {
        if (!user?.registered_at) return 0;
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - user.registered_at.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const daysSinceRegistration = getDaysSinceRegistration();

    return (
        <div className="space-y-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Welcome, {user?.email?.split('@')[0]}! 👋</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Member for {daysSinceRegistration} days
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Frequently used features</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Link
                            href="/app/audit"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-primary-50 rounded-full">
                                <SearchCheck className="h-4 w-4 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">Listing Audit</h3>
                                <p className="text-sm text-gray-500">Analyze Amazon listings and save results</p>
                            </div>
                        </Link>

                        <Link
                            href="/app/user-settings"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-primary-50 rounded-full">
                                <Settings className="h-4 w-4 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">User Settings</h3>
                                <p className="text-sm text-gray-500">Manage your account preferences</p>
                            </div>
                        </Link>

                        <Link
                            href="/app/table"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-primary-50 rounded-full">
                                <ExternalLink className="h-4 w-4 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">Example Page</h3>
                                <p className="text-sm text-gray-500">Check out example features</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {usage && (
                <Card>
                    <CardHeader>
                        <CardTitle>Usage Overview</CardTitle>
                        <CardDescription>Current plan and remaining monthly credits</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="rounded-lg border p-4">
                                <div className="text-sm text-gray-500">Plan</div>
                                <div className="mt-2 text-2xl font-semibold capitalize">{usage.plan}</div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-sm text-gray-500">Audit Credits</div>
                                <div className="mt-2 text-2xl font-semibold">
                                    {usage.auditsRemaining} / {usage.auditCreditsMonthly}
                                </div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-sm text-gray-500">AI Credits</div>
                                <div className="mt-2 text-2xl font-semibold">
                                    {usage.aiRemaining} / {usage.aiCreditsMonthly}
                                </div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-sm text-gray-500">Competitor Credits</div>
                                <div className="mt-2 text-2xl font-semibold">
                                    {usage.competitorsRemaining} / {usage.competitorCreditsMonthly}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Recent Listing Audits</CardTitle>
                    <CardDescription>Your latest saved Amazon listing reviews</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentAudits.length ? (
                        <div className="space-y-3">
                            {recentAudits.map((audit) => (
                                <Link
                                    key={audit.id}
                                    href={`/app/audit/${audit.id}`}
                                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div>
                                        <h3 className="font-medium">{audit.product_title || 'Untitled audit'}</h3>
                                        <p className="text-sm text-gray-500">
                                            {audit.marketplace}
                                            {audit.asin ? ` • ${audit.asin}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-primary-600">
                                            {audit.overall_score ?? '—'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(audit.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
                            No audits yet. Run your first listing review from the audit page.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
