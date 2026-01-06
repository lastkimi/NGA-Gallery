import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import CollectionPage from './CollectionPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchObjects } = useAppStore();
  const searchQuery = useMemo(() => searchParams.get('q') || '', [searchParams]);
  const [query, setQuery] = useState(searchQuery);
  
  useEffect(() => {
    const q = searchQuery;
    setQuery(q);
    if (q) {
      searchObjects(q);
    } else {
      searchObjects('');
    }
  }, [searchQuery, searchObjects]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    } else {
      setSearchParams({});
    }
  };
  
  return (
    <div>
      {/* Search header */}
      <div className="bg-gradient-to-b from-neutral-900 to-neutral-800 text-white py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-center">
            搜索藏品
          </h1>
          
          
          {searchParams.get('q') && (
            <p className="mt-4 text-center opacity-90">
              搜索结果: "{searchParams.get('q')}"
            </p>
          )}
        </div>
      </div>
      
      {/* Results */}
      <CollectionPage />
    </div>
  );
};

export default SearchPage;
