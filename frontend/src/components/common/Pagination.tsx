// frontend/src/components/common/Pagination.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
            onPageChange(val);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const val = parseInt((e.target as HTMLInputElement).value);
            if (!isNaN(val) && val >= 1 && val <= totalPages) {
                onPageChange(val);
            }
        }
    };

    // Helper to generate page numbers
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5; // Number of pages to show around current
        
        // Always show first page
        pages.push(1);

        let start = Math.max(2, currentPage - 2);
        let end = Math.min(totalPages - 1, currentPage + 2);

        // Adjust range if close to start
        if (currentPage <= 4) {
            end = Math.min(totalPages - 1, 5);
        }
        // Adjust range if close to end
        if (currentPage >= totalPages - 3) {
            start = Math.max(2, totalPages - 4);
        }

        if (start > 2) {
            pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages - 1) {
            pages.push('...');
        }

        // Always show last page if > 1
        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex justify-center mt-12 gap-2 items-center flex-wrap">
            <Button 
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => onPageChange(1)}
                className="h-9 w-9 p-0 hidden md:flex"
                title="First Page"
            >
                <ChevronsLeft size={16} />
            </Button>
            <Button 
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="h-9 w-9 p-0"
                title="Previous Page"
            >
                <ChevronLeft size={16} />
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
                {pageNumbers.map((p, idx) => (
                    <React.Fragment key={idx}>
                        {p === '...' ? (
                            <span className="px-2 text-neutral-400">...</span>
                        ) : (
                            <Button
                                variant={currentPage === p ? "default" : "ghost"}
                                size="sm"
                                onClick={() => onPageChange(p as number)}
                                className={`h-9 min-w-[36px] px-2 ${currentPage === p ? 'pointer-events-none' : ''}`}
                            >
                                {p}
                            </Button>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Input Jump */}
            <div className="flex items-center gap-1 mx-2">
                <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder="Go"
                    onKeyDown={handleKeyDown}
                    className="h-9 w-16 text-center px-1"
                />
            </div>

            <Button 
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="h-9 w-9 p-0"
                title="Next Page"
            >
                <ChevronRight size={16} />
            </Button>
            <Button 
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(totalPages)}
                className="h-9 w-9 p-0 hidden md:flex"
                title="Last Page"
            >
                <ChevronsRight size={16} />
            </Button>
        </div>
    );
};

export default Pagination;
