
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, KeyRound, LockKeyhole, FileText, BarChart2, Tags } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ApiKey, Password, Note } from '@/lib/types';

interface CountState {
    apiKeys: number;
    passwords: number;
    notes: number;
}

interface TagCount {
    [key: string]: number;
}

interface PlatformCount {
    [key: string]: number;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function DashboardPage() {
    const { user } = useAuth();
    const [counts, setCounts] = useState<CountState>({ apiKeys: 0, passwords: 0, notes: 0 });
    const [tagCounts, setTagCounts] = useState<TagCount>({});
    const [platformCounts, setPlatformCounts] = useState<PlatformCount>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const [apiKeysSnapshot, passwordsSnapshot, notesSnapshot] = await Promise.all([
                        getDocs(collection(db, `users/${user.uid}/apiKeys`)),
                        getDocs(collection(db, `users/${user.uid}/passwords`)),
                        getDocs(collection(db, `users/${user.uid}/notes`)),
                    ]);

                    const apiKeys = apiKeysSnapshot.docs.map(doc => doc.data() as ApiKey);
                    const passwords = passwordsSnapshot.docs.map(doc => doc.data() as Password);
                    const notes = notesSnapshot.docs.map(doc => doc.data() as Note);

                    setCounts({
                        apiKeys: apiKeys.length,
                        passwords: passwords.length,
                        notes: notes.length,
                    });
                    
                    const allTags: TagCount = {};
                    [...apiKeys, ...passwords, ...notes].forEach(item => {
                        item.tags?.forEach(tag => {
                            allTags[tag] = (allTags[tag] || 0) + 1;
                        });
                    });
                    setTagCounts(allTags);

                    const allPlatforms: PlatformCount = {};
                    passwords.forEach(item => {
                        allPlatforms[item.appName] = (allPlatforms[item.appName] || 0) + 1;
                    });
                    setPlatformCounts(allPlatforms);

                } catch (error) {
                    console.error("Failed to fetch dashboard data:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [user]);

    const overviewChartData = [
        { name: 'API Keys', total: counts.apiKeys, fill: 'var(--color-apiKeys)' },
        { name: 'Passwords', total: counts.passwords, fill: 'var(--color-passwords)' },
        { name: 'Notes', total: counts.notes, fill: 'var(--color-notes)' },
    ];
    
    const overviewChartConfig = {
      total: { label: "Total" },
      apiKeys: { label: "API Keys", color: "hsl(var(--chart-1))" },
      passwords: { label: "Passwords", color: "hsl(var(--chart-2))" },
      notes: { label: "Notes", color: "hsl(var(--chart-3))" },
    }
    
    const platformChartData = Object.entries(platformCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
        
    const tagChartData = Object.entries(tagCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);


    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const totalItems = counts.apiKeys + counts.passwords + counts.notes;

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.apiKeys}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Passwords</CardTitle>
                        <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.passwords}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Secure Notes</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.notes}</div>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Credentials Overview</CardTitle>
                    <CardDescription>A summary of all your stored items.</CardDescription>
                </CardHeader>
                <CardContent>
                   {totalItems > 0 ? (
                    <ChartContainer config={overviewChartConfig} className="min-h-[200px] w-full">
                        <BarChart accessibilityLayer data={overviewChartData}>
                             <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                            <YAxis />
                            <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="total" radius={8} />
                        </BarChart>
                    </ChartContainer>
                     ) : (
                         <div className="flex items-center justify-center h-48">
                            <p className="text-muted-foreground">No data to display. Add some credentials to get started!</p>
                         </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />Top 5 Platforms</CardTitle>
                        <CardDescription>Password distribution by application/platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {platformChartData.length > 0 ? (
                        <ChartContainer config={{}} className="min-h-[250px] w-full">
                            <PieChart>
                                <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                <Pie data={platformChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>
                                     {platformChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                        ) : (
                             <div className="flex items-center justify-center h-48">
                                <p className="text-muted-foreground">No platform data available.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5" />Top 5 Tags</CardTitle>
                        <CardDescription>Your most frequently used tags.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tagChartData.length > 0 ? (
                        <ChartContainer config={{}} className="min-h-[250px] w-full">
                             <BarChart accessibilityLayer data={tagChartData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} width={80} />
                                <Tooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                <Bar dataKey="value" layout="vertical" radius={5}>
                                    {tagChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                        ) : (
                             <div className="flex items-center justify-center h-48">
                                <p className="text-muted-foreground">No tag data available.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

