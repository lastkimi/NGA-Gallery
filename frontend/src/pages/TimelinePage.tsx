import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { analysisApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TimelineData {
  period: string;
  count: number;
  startYear: number;
}

const TimelinePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TimelineData[]>([]);
  const [interval, setInterval] = useState('decade');
  const [startYear, setStartYear] = useState(1000);
  const [endYear, setEndYear] = useState(2024);
  
  const intervals = [
    { value: 'year', label: '年度' },
    { value: 'decade', label: '十年' },
    { value: 'century', label: '世纪' },
  ];
  
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const timelineData = await analysisApi.getTimeline(
          startYear,
          endYear,
          interval
        );
        console.log('Timeline response:', timelineData);
        setData(timelineData);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || err?.message || '无法加载时间线数据';
        setError(errorMessage);
        console.error('Error fetching timeline:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimeline();
  }, [startYear, endYear, interval]);
  
  if (loading) {
    return (
      <div className="bg-white min-h-screen py-12">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <Card className="mb-8">
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen bg-white">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="bg-white min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8">艺术时间线</h1>
        
        {/* Controls */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="interval">时间间隔</Label>
                <Select value={interval} onValueChange={setInterval}>
                  <SelectTrigger id="interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intervals.map((int) => (
                      <SelectItem key={int.value} value={int.value}>
                        {int.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2 space-y-4">
                <Label>年份范围: {startYear} - {endYear}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startYear">起始年份</Label>
                    <Input
                      id="startYear"
                      type="number"
                      min="1000"
                      max={endYear}
                      value={startYear}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1000;
                        if (value >= 1000 && value <= endYear) {
                          setStartYear(value);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endYear">结束年份</Label>
                    <Input
                      id="endYear"
                      type="number"
                      min={startYear}
                      max="2024"
                      value={endYear}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 2024;
                        if (value >= startYear && value <= 2024) {
                          setEndYear(value);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Timeline chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif">作品数量时间分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={Math.ceil(data.length / 20) - 1}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number | undefined) => [value ?? 0, '作品数量']}
                    labelFormatter={(label) => `${label}年代`}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'white'
                    }}
                  />
                  <Bar dataKey="count" fill="#8884d8" name="作品数量" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">总计作品</h3>
              <div className="text-4xl md:text-5xl font-serif font-bold text-neutral-900">
                {data.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">时间跨度</h3>
              <div className="text-4xl md:text-5xl font-serif font-bold text-neutral-900">
                {endYear - startYear}
                <span className="text-lg ml-2 font-normal text-neutral-500">年</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">最密集时期</h3>
              <div className="text-2xl md:text-3xl font-serif font-bold text-neutral-900 mb-1">
                {data.reduce((max, item) =>
                  item.count > max.count ? item : max
                , data[0] || { period: '', count: 0 }).period}
              </div>
              <div className="text-sm text-neutral-500">作品最多</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TimelinePage;
