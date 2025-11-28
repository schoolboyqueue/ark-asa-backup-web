/**
 * @fileoverview Backups list component for displaying and managing ARK save backups.
 * Provides table view with restore and delete operations, including safety checks.
 * Implements repository pattern for backup management operations.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress,
  Chip,
  Spinner,
  Pagination,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
} from '@heroui/react';
import {
  CircleStackIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid';
import { flushSync } from 'react-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api } from '../services/api';
import { toast } from '../services/toast';
import type { BackupMetadata, ServerStatus } from '../types';

// Enable relative time plugin for dayjs
dayjs.extend(relativeTime);

/**
 * Props interface for the BackupsList component.
 * @interface BackupsListProps
 */
interface BackupsListProps {
  /** Array of available backup metadata */
  backups: BackupMetadata[];
  /** Current server status for safety checks */
  serverStatus: ServerStatus | null;
  /** Whether the component is currently loading data */
  loading: boolean;
  /** Callback to handle backup deletion */
  onDelete: (backupName: string) => Promise<void>;
  /** Callback to handle backup restoration */
  onRestore: (backupName: string) => Promise<void>;
}

/** Bytes per megabyte conversion factor */
const BYTES_PER_MEGABYTE = 1024 * 1024;

/** Unix timestamp to milliseconds multiplier */
const UNIX_TIMESTAMP_TO_MS = 1000;

/** Primary brand color */
const PRIMARY_COLOR = '#0ea5e9';

/**
 * Backups list component that displays available backups in a table format.
 * Features:
 * - Paginated table (10 items per page) with navigation controls
 * - Real-time restore progress display in card header
 * - Safety warnings when server is running
 * - Confirmation dialogs for destructive operations
 * - Per-row loading states with animations
 * - Theme-aware styling
 * - Empty state with helpful messaging
 *
 * Design Patterns:
 * - Repository: Abstracts backup data access through callbacks
 * - Observer: Watches server status to enable/disable restore operations
 * - Template Method: Table column rendering follows consistent pattern
 *
 * @param {BackupsListProps} props - Component props
 * @returns {JSX.Element} Backups table card
 */
export default function BackupsList({
  backups,
  serverStatus,
  loading,
  onDelete,
  onRestore,
}: BackupsListProps): JSX.Element {
  const [restoringBackupName, setRestoringBackupName] = useState<string | null>(null);
  const [deletingBackupName, setDeletingBackupName] = useState<string | null>(null);
  const [downloadingBackupName, setDownloadingBackupName] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [restoreMessage, setRestoreMessage] = useState<string>('');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const [isRestoreConfirmModalVisible, setIsRestoreConfirmModalVisible] = useState<boolean>(false);
  const [selectedBackupForDelete, setSelectedBackupForDelete] = useState<string | null>(null);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [previousBackupCount, setPreviousBackupCount] = useState<number>(backups.length);
  const [newBackupName, setNewBackupName] = useState<string | null>(null);
  const [displayedBackups, setDisplayedBackups] = useState<BackupMetadata[]>(backups);
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(10);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [copiedBackupName, setCopiedBackupName] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'name' | 'size' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);
  const [isCreateBackupModalOpen, setIsCreateBackupModalOpen] = useState<boolean>(false);
  const [backupNotes, setBackupNotes] = useState<string>('');
  const [isEditNotesModalOpen, setIsEditNotesModalOpen] = useState<boolean>(false);
  const [selectedBackupForEdit, setSelectedBackupForEdit] = useState<BackupMetadata | null>(null);
  const [editNotesValue, setEditNotesValue] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [verifyingBackupName, setVerifyingBackupName] = useState<string | null>(null);

  const previousCountRef = useRef(backups.length);
  const previousBackupsRef = useRef<BackupMetadata[]>(backups);
  const deletionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter displayedBackups based on search query and date range
  const filteredBackups = useMemo(() => {
    let filtered = [...displayedBackups];

    // Apply search filter (searches both backup name and notes)
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((backup) => {
        const nameMatch = backup.name.toLowerCase().includes(lowerQuery);
        const notesMatch = backup.notes?.toLowerCase().includes(lowerQuery) || false;
        return nameMatch || notesMatch;
      });
    }

    // Apply date range filter
    if (dateRangeStart || dateRangeEnd) {
      const startTimestamp = dateRangeStart
        ? dayjs(dateRangeStart).startOf('day').unix()
        : 0;
      const endTimestamp = dateRangeEnd
        ? dayjs(dateRangeEnd).endOf('day').unix()
        : Number.MAX_SAFE_INTEGER;

      filtered = filtered.filter((backup) => {
        return backup.mtime >= startTimestamp && backup.mtime <= endTimestamp;
      });
    }

    return filtered;
  }, [displayedBackups, searchQuery, dateRangeStart, dateRangeEnd]);

  // Sort filteredBackups based on current sort settings
  const sortedBackups = useMemo(() => {
    const backupsCopy = [...filteredBackups];
    backupsCopy.sort((backupA, backupB) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = backupA.name.localeCompare(backupB.name);
          break;
        case 'size':
          comparison = backupA.size_bytes - backupB.size_bytes;
          break;
        case 'date':
          comparison = backupA.mtime - backupB.mtime;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return backupsCopy;
  }, [filteredBackups, sortColumn, sortDirection]);

  // Calculate pagination
  const totalPages = useMemo(
    () => Math.ceil(sortedBackups.length / rowsPerPage),
    [sortedBackups.length, rowsPerPage]
  );

  const paginatedBackups = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedBackups.slice(startIndex, endIndex);
  }, [sortedBackups, page, rowsPerPage]);

  useEffect(() => {
    previousCountRef.current = backups.length;
  }, [backups.length]);

  // Reset to page 1 when backups list changes significantly
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [page, totalPages]);

  /**
   * Effect to detect new backups and show celebration animation.
   * Compares current backup list with previous count to detect additions.
   */
  useEffect(() => {
    if (backups.length > previousBackupCount && !loading) {
      // Find the newest backup (should be first in the list if sorted by date)
      const newestBackup = backups[0];
      if (newestBackup) {
        setNewBackupName(newestBackup.name);

        // Clear the highlight after animation
        setTimeout(() => {
          setNewBackupName(null);
        }, 3000);
      }
    }
    setPreviousBackupCount(backups.length);
  }, [backups, previousBackupCount, loading]);

  /**
   * Effect to synchronize displayedBackups with backups prop.
   * Handles deletion animations by keeping deleted backups visible during the animation.
   */
  useEffect(() => {
    // Clear any existing deletion timeout
    if (deletionTimeoutRef.current) {
      clearTimeout(deletionTimeoutRef.current);
      deletionTimeoutRef.current = null;
    }

    const previousBackupNames = new Set(previousBackupsRef.current.map((backup) => backup.name));
    const currentBackupNames = new Set(backups.map((backup) => backup.name));

    // Find backups that were removed
    const removedBackupNames = Array.from(previousBackupNames).filter(
      (backupName) => !currentBackupNames.has(backupName)
    );

    if (removedBackupNames.length > 0) {
      // A backup was deleted - capture the current backups in closure
      const removedBackupName = removedBackupNames[0];
      const oldBackupsList = [...previousBackupsRef.current];
      const newBackupsList = [...backups];

      // Use flushSync to ensure DOM updates happen synchronously in the correct order
      flushSync(() => {
        // First: Set displayed backups to OLD list (with deleted backup still visible)
        setDisplayedBackups(oldBackupsList);
      });

      // Then: Apply the deleting CSS class (this should trigger animation on existing DOM element)
      flushSync(() => {
        setDeletingBackupName(removedBackupName);
      });

      // After animation completes, update to new list
      deletionTimeoutRef.current = setTimeout(() => {
        setDisplayedBackups(newBackupsList);
        setDeletingBackupName(null);
        previousBackupsRef.current = newBackupsList;
        deletionTimeoutRef.current = null;
      }, 500);
    } else {
      // No deletion, just sync normally
      setDisplayedBackups(backups);
      previousBackupsRef.current = backups;
    }

    // Cleanup function
    return () => {
      if (deletionTimeoutRef.current) {
        clearTimeout(deletionTimeoutRef.current);
      }
    };
  }, [backups]);

  /**
   * Handles backup restore request with safety checks and confirmation.
   * Prevents restore while server is running to avoid data corruption.
   * Shows detailed warning modal before executing restore with real-time progress.
   *
   * @param {string} backupName - The name of the backup to restore
   */
  const handleRestoreBackup = (backupName: string): void => {
    const isServerRunning = serverStatus?.status === 'running';

    if (isServerRunning) {
      return;
    }

    setSelectedBackupForRestore(backupName);
    setIsRestoreConfirmModalVisible(true);
  };

  /**
   * Confirms and executes the restore operation.
   */
  const confirmRestore = async (): Promise<void> => {
    if (!selectedBackupForRestore) return;

    setIsRestoreConfirmModalVisible(false);
    setRestoringBackupName(selectedBackupForRestore);
    setRestoreProgress(0);
    setRestoreMessage('Starting restore...');
    const backupNameToRestore = selectedBackupForRestore;

    try {
      await api.restoreBackup(backupNameToRestore, (progressEvent) => {
        setRestoreProgress(progressEvent.percent);
        if (progressEvent.message) {
          setRestoreMessage(progressEvent.message);
        }
      });
      toast.success(`Backup "${backupNameToRestore}" restored successfully!`);
      // Trigger parent refresh to update backup list
      onRestore(backupNameToRestore).catch(() => {
        // Ignore errors from parent callback since restore already succeeded
      });
    } catch (error) {
      console.error('Failed to restore backup:', error);
      toast.error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Keep the progress visible briefly after completion
      setTimeout(() => {
        setRestoringBackupName(null);
        setSelectedBackupForRestore(null);
        setRestoreProgress(0);
        setRestoreMessage('');
      }, 2000);
    }
  };

  /**
   * Handles backup deletion request with confirmation dialog.
   * Shows warning modal before executing delete operation with animation.
   * The deletion animation is handled automatically by the displayedBackups sync effect.
   *
   * @param {string} backupName - The name of the backup to delete
   */
  const handleDeleteBackup = (backupName: string): void => {
    setSelectedBackupForDelete(backupName);
    setIsDeleteModalVisible(true);
  };

  /**
   * Confirms and executes the delete operation.
   */
  const confirmDelete = async (): Promise<void> => {
    if (!selectedBackupForDelete) return;

    setIsDeleteModalVisible(false);
    const backupNameToDelete = selectedBackupForDelete;
    try {
      await onDelete(backupNameToDelete);
      toast.success(`Backup "${backupNameToDelete}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      toast.error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSelectedBackupForDelete(null);
    }
  };

  /**
   * Opens the create backup modal.
   */
  const openCreateBackupModal = (): void => {
    setBackupNotes('');
    setIsCreateBackupModalOpen(true);
  };

  /**
   * Triggers an immediate manual backup creation with optional notes.
   * Creates a new backup archive outside the automatic backup schedule.
   */
  const handleCreateBackup = async (): Promise<void> => {
    setIsCreatingBackup(true);
    try {
      const trimmedNotes = backupNotes.trim();
      const response = await api.triggerBackup(trimmedNotes || undefined);
      console.log('Manual backup created successfully:', response);
      toast.success('Backup created successfully!');
      setIsCreateBackupModalOpen(false);
      setBackupNotes('');
      // The parent component will refresh the backup list via polling
    } catch (error) {
      console.error('Failed to create manual backup:', error);
      toast.error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  /**
   * Opens the edit notes modal for a specific backup.
   *
   * @param {BackupMetadata} backup - The backup to edit notes for
   */
  const openEditNotesModal = (backup: BackupMetadata): void => {
    setSelectedBackupForEdit(backup);
    setEditNotesValue(backup.notes || '');
    setIsEditNotesModalOpen(true);
  };

  /**
   * Saves updated notes for the selected backup.
   * Updates the .meta.json file on the backend.
   */
  const handleSaveNotes = async (): Promise<void> => {
    if (!selectedBackupForEdit) return;

    setIsSavingNotes(true);
    try {
      const trimmedNotes = editNotesValue.trim();
      await api.updateBackupNotes(selectedBackupForEdit.name, trimmedNotes || undefined);
      toast.success('Notes updated successfully!');
      setIsEditNotesModalOpen(false);
      setSelectedBackupForEdit(null);
      setEditNotesValue('');
      // The parent component will refresh the backup list via polling
    } catch (error) {
      console.error('Failed to update notes:', error);
      toast.error(`Failed to update notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  /**
   * Copies backup name to clipboard for easy sharing in Discord/support.
   * Shows temporary success indicator for 2 seconds.
   * Uses modern Clipboard API with fallback to deprecated execCommand for compatibility.
   *
   * @param {string} backupName - Name of the backup to copy
   */
  const handleCopyBackupName = async (backupName: string): Promise<void> => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(backupName);
      } else {
        // Fallback to deprecated execCommand for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = backupName;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) {
          throw new Error('execCommand copy failed');
        }
      }
      setCopiedBackupName(backupName);
      toast.success('Backup name copied to clipboard!');
      setTimeout(() => {
        setCopiedBackupName(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy backup name:', error);
      toast.error('Failed to copy backup name');
    }
  };

  /**
   * Downloads a backup archive to the user's local machine.
   * Provides extra safety by storing backups locally.
   *
   * @param {string} backupName - Name of the backup to download
   */
  const handleDownloadBackup = async (backupName: string): Promise<void> => {
    setDownloadingBackupName(backupName);
    try {
      await api.downloadBackup(backupName);
      toast.success(`Backup "${backupName}" download started!`);
    } catch (error) {
      console.error('Failed to download backup:', error);
      toast.error(`Failed to download backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Keep the loading state briefly to show user the action was registered
      setTimeout(() => {
        setDownloadingBackupName(null);
      }, 1000);
    }
  };

  /**
   * Manually verifies a backup archive's integrity.
   * Tests that the tar.gz file is readable and counts files.
   *
   * @param {string} backupName - Name of the backup to verify
   */
  const handleVerifyBackup = async (backupName: string): Promise<void> => {
    setVerifyingBackupName(backupName);
    try {
      const response = await api.verifyBackup(backupName);
      const verificationResult = response.verification;

      if (verificationResult.status === 'verified') {
        toast.success(
          `Backup verified! ${verificationResult.file_count} files found.`
        );
      } else if (verificationResult.status === 'failed') {
        toast.error(
          `Verification failed: ${verificationResult.error || 'Unknown error'}`
        );
      }

      // The parent component will refresh the backup list via SSE stream
    } catch (error) {
      console.error('Failed to verify backup:', error);
      toast.error(
        `Failed to verify backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Keep the loading state briefly to show user the action was registered
      setTimeout(() => {
        setVerifyingBackupName(null);
      }, 1000);
    }
  };

  /**
   * Handles column header click to toggle sort order.
   * Clicking the same column toggles between asc/desc.
   * Clicking a different column switches to that column with desc order.
   *
   * @param {string} columnKey - The column key that was clicked
   */
  const handleSortChange = (columnKey: 'name' | 'size' | 'date'): void => {
    if (sortColumn === columnKey) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Switch to new column with descending order
      setSortColumn(columnKey);
      setSortDirection('desc');
    }
  };

  /**
   * Clears all active filters and resets search query.
   * Returns the backups list to unfiltered state.
   */
  const handleClearFilters = (): void => {
    setSearchQuery('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setPage(1);
  };

  /**
   * Checks if any filters are currently active.
   *
   * @returns {boolean} True if search query or date range is set
   */
  const hasActiveFilters = (): boolean => {
    return !!(searchQuery.trim() || dateRangeStart || dateRangeEnd);
  };

  /**
   * Formats byte size to megabytes with 2 decimal places.
   *
   * @param {number} sizeInBytes - Size in bytes
   * @returns {string} Formatted size string (e.g., "123.45 MB")
   */
  const formatSizeInMegabytes = (sizeInBytes: number): string => {
    return `${(sizeInBytes / BYTES_PER_MEGABYTE).toFixed(2)} MB`;
  };

  /**
   * Formats Unix timestamp to human-readable date string.
   *
   * @param {number} unixTimestamp - Unix timestamp in seconds
   * @returns {string} Formatted date string (e.g., "Jan 1, 2024 12:00:00 PM")
   */
  const formatTimestamp = (unixTimestamp: number): string => {
    return dayjs(unixTimestamp * UNIX_TIMESTAMP_TO_MS).format('MMM D, YYYY h:mm:ss A');
  };

  /**
   * Formats Unix timestamp to relative time string.
   * Uses dayjs relativeTime plugin for human-friendly output.
   *
   * @param {number} unixTimestamp - Unix timestamp in seconds
   * @returns {string} Relative time string (e.g., "2 hours ago", "3 days ago")
   */
  const formatRelativeTime = (unixTimestamp: number): string => {
    return dayjs(unixTimestamp * UNIX_TIMESTAMP_TO_MS).fromNow();
  };

  /**
   * Renders a verification status icon with appropriate color and tooltip.
   *
   * @param {BackupMetadata} backup - The backup to render verification icon for
   * @returns {JSX.Element} Icon component with verification status
   */
  const renderVerificationIcon = (backup: BackupMetadata): JSX.Element => {
    const status = backup.verification_status || 'unknown';
    const fileCount = backup.verified_file_count || 0;

    switch (status) {
      case 'verified':
        return (
          <Tooltip content={`Verified - ${fileCount} files`} showArrow>
            <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-success" />
          </Tooltip>
        );
      case 'failed':
        return (
          <Tooltip
            content={`Verification failed: ${backup.verification_error || 'Unknown error'}`}
            showArrow
            color="danger"
          >
            <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-danger" />
          </Tooltip>
        );
      case 'pending':
        return (
          <Tooltip content="Verifying backup..." showArrow>
            <Spinner size="sm" className="flex-shrink-0" color="warning" />
          </Tooltip>
        );
      case 'unknown':
      default:
        return (
          <Tooltip content="Not verified - click verify button to check integrity" showArrow>
            <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-default-400" />
          </Tooltip>
        );
    }
  };

  const isServerRunning = serverStatus?.status === 'running';

  const columns = [
    { key: 'name', label: 'BACKUP NAME', sortable: true },
    { key: 'size', label: 'SIZE', sortable: true },
    { key: 'date', label: 'CREATED', sortable: true },
    { key: 'notes', label: 'NOTES', sortable: false },
    { key: 'actions', label: 'ACTIONS', sortable: false },
  ];

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleStackIcon className="h-5 w-5" style={{ color: PRIMARY_COLOR }} />
              <h2 className="text-lg font-semibold">Backups</h2>
            </div>
            <div className="flex items-center gap-4">
              <Button
                color="primary"
                variant="flat"
                size="sm"
                startContent={<PlusCircleIcon className="h-4 w-4" />}
                onPress={openCreateBackupModal}
                isDisabled={loading}
              >
                Create Backup
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-default-500">Total:</span>
                <span
                  className="text-xl font-bold"
                  style={{ color: PRIMARY_COLOR, minWidth: 30 }}
                >
                  {backups.length}
                </span>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex w-full items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Search backups by name or notes..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<MagnifyingGlassIcon className="h-4 w-4 text-default-400" />}
              endContent={
                searchQuery && (
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setSearchQuery('')}
                  >
                    <XMarkIcon className="h-4 w-4 text-default-400 hover:text-default-600" />
                  </button>
                )
              }
              size="sm"
              variant="bordered"
            />

            <Popover
              placement="bottom-end"
              isOpen={isFilterPopoverOpen}
              onOpenChange={setIsFilterPopoverOpen}
            >
              <PopoverTrigger>
                <Button
                  size="sm"
                  variant="flat"
                  color={hasActiveFilters() ? 'primary' : 'default'}
                  startContent={<FunnelIcon className="h-4 w-4" />}
                >
                  Filters
                  {hasActiveFilters() && (
                    <Chip size="sm" color="primary" variant="flat" className="ml-1">
                      {(dateRangeStart || dateRangeEnd) ? '1' : '0'}
                    </Chip>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Date Range Filter</h4>
                    {hasActiveFilters() && (
                      <Button size="sm" variant="light" onPress={handleClearFilters}>
                        Clear All
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Input
                      type="date"
                      label="Start Date"
                      size="sm"
                      variant="bordered"
                      value={dateRangeStart}
                      onValueChange={setDateRangeStart}
                    />
                    <Input
                      type="date"
                      label="End Date"
                      size="sm"
                      variant="bordered"
                      value={dateRangeEnd}
                      onValueChange={setDateRangeEnd}
                    />
                  </div>

                  <div className="text-xs text-default-500">
                    {filteredBackups.length} of {displayedBackups.length} backups match filters
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Restore Progress Display */}
          {restoringBackupName && (
            <div className="w-full animate-appearance-in">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Restoring: {restoringBackupName}
                </span>
                <Chip
                  size="sm"
                  color={restoreProgress === 100 ? 'success' : 'primary'}
                  variant="flat"
                >
                  {restoreProgress}%
                </Chip>
              </div>
              <Progress
                value={restoreProgress}
                color={restoreProgress === 100 ? 'success' : 'primary'}
                size="md"
                className="w-full"
                aria-label="Restore progress"
              />
              <p className="mt-2 text-xs text-default-500">{restoreMessage}</p>
            </div>
          )}
        </CardHeader>
        <CardBody>
          {/* Mobile Card View (hidden on md and larger) */}
          <div className="block md:hidden space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner label="Loading backups..." />
              </div>
            ) : paginatedBackups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CircleStackIcon className="h-12 w-12 text-default-300" />
                <p className="mt-4 text-default-600">No backups found yet</p>
                <p className="mt-2 text-xs text-default-400 text-center px-4">
                  Backups will appear here automatically based on your schedule
                </p>
              </div>
            ) : (
              paginatedBackups.map((backup) => (
                <Card key={backup.name} className="shadow-sm">
                  <CardBody className="gap-3">
                    {/* Backup Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {renderVerificationIcon(backup)}
                        <span className="font-semibold text-sm truncate">{backup.name}</span>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleCopyBackupName(backup.name)}
                        aria-label="Copy backup name"
                        className="flex-shrink-0"
                      >
                        {copiedBackupName === backup.name ? (
                          <CheckIcon className="h-4 w-4 text-success" />
                        ) : (
                          <ClipboardDocumentIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-4 text-xs text-default-500">
                      <span>{formatSizeInMegabytes(backup.size_bytes)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(backup.mtime)}</span>
                    </div>

                    {/* Notes */}
                    {backup.notes && (
                      <div className="text-sm text-default-600 italic">{backup.notes}</div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        color="default"
                        variant="flat"
                        startContent={<PencilIcon className="h-4 w-4" />}
                        onPress={() => openEditNotesModal(backup)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        color="warning"
                        variant="flat"
                        isLoading={verifyingBackupName === backup.name}
                        onPress={() => handleVerifyBackup(backup.name)}
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        startContent={<ArrowPathIcon className="h-4 w-4" />}
                        isDisabled={isServerRunning}
                        isLoading={restoringBackupName === backup.name}
                        onPress={() => handleRestoreBackup(backup.name)}
                        className="flex-1"
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        color="success"
                        variant="flat"
                        startContent={<ArrowDownTrayIcon className="h-4 w-4" />}
                        isLoading={downloadingBackupName === backup.name}
                        onPress={() => handleDownloadBackup(backup.name)}
                        className="flex-1"
                      >
                        Download
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="flat"
                        isLoading={deletingBackupName === backup.name}
                        onPress={() => handleDeleteBackup(backup.name)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
            {totalPages > 1 && (
              <div className="flex w-full justify-center pt-4">
                <Pagination
                  isCompact
                  showControls
                  showShadow
                  color="primary"
                  page={page}
                  total={totalPages}
                  onChange={(newPage) => setPage(newPage)}
                />
              </div>
            )}
          </div>

          {/* Desktop Table View (hidden on mobile) */}
          <Table
            aria-label="Backups table"
            className="hidden md:block min-h-[400px]"
            isStriped
            classNames={{
              wrapper: 'shadow-none',
              table: '[&>table]:table-auto',
            }}
            bottomContent={
              totalPages > 1 ? (
                <div className="flex w-full justify-center">
                  <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="primary"
                    page={page}
                    total={totalPages}
                    onChange={(newPage) => setPage(newPage)}
                  />
                </div>
              ) : null
            }
          >
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  className={`text-xs font-semibold uppercase tracking-wider ${column.sortable ? 'cursor-pointer select-none hover:bg-default-100' : ''}`}
                  onClick={() => column.sortable && handleSortChange(column.key as 'name' | 'size' | 'date')}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      )
                    )}
                  </div>
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              items={paginatedBackups}
              isLoading={loading}
              loadingContent={<Spinner label="Loading backups..." />}
              emptyContent={
                <div className="flex flex-col items-center justify-center py-12">
                  <CircleStackIcon className="h-12 w-12 text-default-300" />
                  <p className="mt-4 text-default-600">No backups found yet</p>
                  <p className="mt-2 text-xs text-default-400">
                    Backups will appear here automatically based on your schedule
                  </p>
                </div>
              }
            >
              {(backup) => (
                <TableRow
                  key={backup.name}
                  className={
                    backup.name === newBackupName
                      ? 'new-backup-row'
                      : backup.name === deletingBackupName
                        ? 'deleting-backup-row'
                        : ''
                  }
                >
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {renderVerificationIcon(backup)}
                      <span className="font-semibold">{backup.name}</span>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleCopyBackupName(backup.name)}
                        aria-label="Copy backup name"
                        className="min-w-unit-6 h-6 w-6"
                      >
                        {copiedBackupName === backup.name ? (
                          <CheckIcon className="h-4 w-4 text-success" />
                        ) : (
                          <ClipboardDocumentIcon className="h-4 w-4 text-default-400 hover:text-default-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatSizeInMegabytes(backup.size_bytes)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm">{formatTimestamp(backup.mtime)}</span>
                      <span className="text-xs text-default-400">{formatRelativeTime(backup.mtime)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {backup.notes ? (
                      <span className="text-sm text-default-600 italic">{backup.notes}</span>
                    ) : (
                      <span className="text-xs text-default-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex gap-1">
                      <Tooltip content="Edit notes">
                        <Button
                          isIconOnly
                          size="sm"
                          color="default"
                          variant="flat"
                          onPress={() => openEditNotesModal(backup)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Verify backup integrity">
                        <Button
                          isIconOnly
                          size="sm"
                          color="warning"
                          variant="flat"
                          isLoading={verifyingBackupName === backup.name}
                          onPress={() => handleVerifyBackup(backup.name)}
                        >
                          <ShieldCheckIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip
                        content={isServerRunning ? "Stop the server to restore backups" : "Restore this backup"}
                        showArrow
                      >
                        <span>
                          <Button
                            isIconOnly
                            size="sm"
                            color="primary"
                            variant="flat"
                            isDisabled={isServerRunning}
                            isLoading={restoringBackupName === backup.name}
                            onPress={() => handleRestoreBackup(backup.name)}
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip content="Download backup">
                        <Button
                          isIconOnly
                          size="sm"
                          color="success"
                          variant="flat"
                          isLoading={downloadingBackupName === backup.name}
                          onPress={() => handleDownloadBackup(backup.name)}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete backup">
                        <Button
                          isIconOnly
                          size="sm"
                          color="danger"
                          variant="flat"
                          isLoading={deletingBackupName === backup.name}
                          onPress={() => handleDeleteBackup(backup.name)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={isRestoreConfirmModalVisible}
        onClose={() => {
          setIsRestoreConfirmModalVisible(false);
          setSelectedBackupForRestore(null);
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Restore Backup?</ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to restore <strong>{selectedBackupForRestore}</strong>?
                </p>
                <div className="mt-4 rounded-lg border border-warning-400/40 bg-warning-50/10 p-3 dark:bg-warning-900/20">
                  <strong className="text-warning-600 dark:text-warning-500">⚠️ Warning</strong>
                  <div className="mt-1 text-sm">
                    This will replace all current save files with the backup data. This action
                    cannot be undone.
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={confirmRestore}>
                  Restore Backup
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalVisible}
        onClose={() => {
          setIsDeleteModalVisible(false);
          setSelectedBackupForDelete(null);
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Delete Backup?</ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete <strong>{selectedBackupForDelete}</strong>? This
                  action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={confirmDelete}>
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Create Backup Modal */}
      <Modal
        isOpen={isCreateBackupModalOpen}
        onOpenChange={setIsCreateBackupModalOpen}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Create Manual Backup</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600 mb-4">
                  Create a backup snapshot of your current ARK save files. You can optionally add notes to help identify this backup later.
                </p>
                <Input
                  label="Notes (optional)"
                  placeholder="e.g., Before boss fight, Pre-update backup"
                  value={backupNotes}
                  onValueChange={setBackupNotes}
                  variant="bordered"
                  maxLength={200}
                  description="Add a description or tag to help identify this backup"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={isCreatingBackup}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateBackup}
                  isLoading={isCreatingBackup}
                >
                  Create Backup
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Notes Modal */}
      <Modal
        isOpen={isEditNotesModalOpen}
        onOpenChange={setIsEditNotesModalOpen}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Edit Backup Notes</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600 mb-2">
                  Backup: <span className="font-mono text-xs">{selectedBackupForEdit?.name}</span>
                </p>
                <Input
                  label="Notes (optional)"
                  placeholder="e.g., Before boss fight, Pre-update backup"
                  value={editNotesValue}
                  onValueChange={setEditNotesValue}
                  variant="bordered"
                  maxLength={200}
                  description="Add a description or tag to help identify this backup"
                  autoFocus
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={isSavingNotes}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSaveNotes}
                  isLoading={isSavingNotes}
                >
                  Save Notes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
