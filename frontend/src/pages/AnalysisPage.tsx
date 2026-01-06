import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { analysisApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface StatisticsData {
  totalObjects: number;
  byClassification: { classification: string; count: number }[];
  byDepartment: { department: string; count: number }[];
  byCentury: { century: string; count: number }[];
  dateRange: { earliest: number; latest: number };
  topArtists: { attribution: string; count: number }[];
}

const AnalysisPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatisticsData | null>(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await analysisApi.getStatistics();
        console.log('Statistics response:', response);
        setStats(response as unknown as StatisticsData);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || err?.message || '无法加载统计数据';
        setError(errorMessage);
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  if (loading) {
    return (
      <div className="bg-white min-h-screen py-12">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-10 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !stats) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen bg-white">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="bg-white min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8">数据分析</h1>
        
        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">总藏品数</h3>
              <div className="text-4xl font-bold text-neutral-900">
                {stats.totalObjects.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">最早作品</h3>
              <div className="text-4xl font-bold text-neutral-900">
                {stats.dateRange.earliest}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">最近作品</h3>
              <div className="text-4xl font-bold text-neutral-900">
                {stats.dateRange.latest}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">分类数量</h3>
              <div className="text-4xl font-bold text-neutral-900">
                {stats.byClassification.length}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Classification distribution */}
          <Card>
            <CardHeader>
              <CardTitle>分类分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byClassification.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="classification" type="category" width={100} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Department distribution */}
          <Card>
            <CardHeader>
              <CardTitle>部门分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byDepartment}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => {
                        const { name, percent, department } = props;
                        const labelText = name || department || '';
                        const labelStr = typeof labelText === 'string' ? labelText : String(labelText || '');
                        return percent && percent > 0.05 && labelStr ? `${labelStr.substring(0, 10)}${labelStr.length > 10 ? '...' : ''}` : '';
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="department"
                    >
                      {stats.byDepartment.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Century distribution */}
          <Card>
            <CardHeader>
              <CardTitle>世纪分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.byCentury}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="century" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name="作品数量"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Top artists */}
          <Card>
            <CardHeader>
              <CardTitle>作品最多的艺术家</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.topArtists.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="attribution" type="category" width={120} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
