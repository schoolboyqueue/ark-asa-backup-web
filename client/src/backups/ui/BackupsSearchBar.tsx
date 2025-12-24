/**
 * @fileoverview Search and filter bar component for backups.
 * Handles search input and filter popover.
 */

import { FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@heroui/react';

interface BackupsSearchBarProps {
  readonly searchQuery: string;
  readonly hasActiveFilters: boolean;
  readonly dateRangeStart: string;
  readonly dateRangeEnd: string;
  readonly isFilterPopoverOpen: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onDateRangeStartChange: (value: string) => void;
  readonly onDateRangeEndChange: (value: string) => void;
  readonly onFilterPopoverOpenChange: (isOpen: boolean) => void;
  readonly onClearFilters: () => void;
}

export default function BackupsSearchBar({
  searchQuery,
  hasActiveFilters,
  dateRangeStart,
  dateRangeEnd,
  isFilterPopoverOpen,
  onSearchChange,
  onDateRangeStartChange,
  onDateRangeEndChange,
  onFilterPopoverOpenChange,
  onClearFilters,
}: BackupsSearchBarProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <Input
        className="flex-1"
        placeholder="Search backups..."
        value={searchQuery}
        onValueChange={onSearchChange}
        startContent={<MagnifyingGlassIcon className="h-4 w-4 text-default-400" />}
        endContent={
          searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="p-1 hover:bg-default-100 rounded transition-colors"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-4 w-4 text-default-400" />
            </button>
          )
        }
        size="sm"
        variant="bordered"
      />

      <Popover
        isOpen={isFilterPopoverOpen}
        onOpenChange={onFilterPopoverOpenChange}
        placement="bottom"
      >
        <PopoverTrigger>
          <Button
            size="sm"
            variant="flat"
            color={hasActiveFilters ? 'primary' : 'default'}
            startContent={<FunnelIcon className="h-4 w-4" />}
          >
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Filters</h4>
              {hasActiveFilters && (
                <Button size="sm" variant="light" onPress={onClearFilters}>
                  Clear
                </Button>
              )}
            </div>
            <Input
              type="date"
              label="Start Date"
              size="sm"
              value={dateRangeStart}
              onValueChange={onDateRangeStartChange}
            />
            <Input
              type="date"
              label="End Date"
              size="sm"
              value={dateRangeEnd}
              onValueChange={onDateRangeEndChange}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
