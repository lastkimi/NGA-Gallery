import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Cell
} from 'recharts';
import { analysisApi } from '../../services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface TimelineFilterProps {
  beginYear: number | null;
  endYear: number | null;
  onChange: (start: number | null, end: number | null) => void;
  className?: string;
}

interface TimelineData {
  period: string;
  count: number;
  startYear: number;
}

const TimelineFilter: React.FC<TimelineFilterProps> = ({ 
  beginYear, 
  endYear, 
  onChange,
  className 
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch full timeline data once
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        // Get data for the whole relevant range with decade interval
        const timelineData = await analysisApi.getTimeline(1200, 2024, 'decade');
        setData(timelineData);
      } catch (err) {
        console.error('Error fetching timeline for filter:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimeline();
  }, []);

  const handleBrushChange = (range: any) => {
    if (!range || !data.length) return;
    
    const startIndex = range.startIndex;
    const endIndex = range.endIndex;
    
    if (startIndex !== undefined && endIndex !== undefined && data[startIndex] && data[endIndex]) {
        const start = data[startIndex].startYear;
        // End year is the start of the last selected decade + 9
        const end = data[endIndex].startYear + 9;
        
        // Only trigger change if values are different to avoid loops
        if (start !== beginYear || end !== endYear) {
            onChange(start, end);
        }
    }
  };

  // Calculate brush indexes based on props
  const { startIndex, endIndex } = useMemo(() => {
    if (!data.length) return { startIndex: 0, endIndex: data.length - 1 };
    
    let startIdx = 0;
    let endIdx = data.length - 1;
    
    if (beginYear) {
        const idx = data.findIndex(d => d.startYear >= beginYear);
        if (idx !== -1) startIdx = idx;
    }
    
    if (endYear) {
        // Find the last decade that starts before or in the endYear
        // We look for the first decade that starts AFTER the endYear, then go back one
        const idx = data.findIndex(d => d.startYear > endYear);
        if (idx !== -1) {
            endIdx = Math.max(0, idx - 1);
        } else {
            // If all decades start before endYear, select until the end
            endIdx = data.length - 1;
        }
    }
    
    return { startIndex: startIdx, endIndex: endIdx };
  }, [data, beginYear, endYear]);

  if (loading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  if (!data.length) return null;

  return (
    <div className={className}>
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <XAxis 
                dataKey="period" 
                hide 
            />
            <Tooltip
              formatter={(value: number) => [value, t('common.artworks')]}
              labelFormatter={(label) => `${label}s`}
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="count" fill="#e5e5e5" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={index >= startIndex && index <= endIndex ? "#171717" : "#e5e5e5"} 
                    />
                ))}
            </Bar>
            <Brush 
                dataKey="period" 
                height={20} 
                stroke="#888888"
                fill="#f5f5f5"
                tickFormatter={() => ''}
                startIndex={startIndex}
                endIndex={endIndex}
                onChange={handleBrushChange}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-xs text-neutral-500 mt-1 px-2 md:block hidden">
        <span>1200</span>
        <span>2024</span>
      </div>
    </div>
  );
};

export default TimelineFilter;
