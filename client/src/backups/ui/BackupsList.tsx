/**
 * @fileoverview Backups list component - PURE VIEW LAYER.
 * Displays and manages ARK save backups with Clean Architecture pattern.
 *
 * Clean Architecture: View Layer
 * - Renders JSX only
 * - Receives view model from UseCases
 * - Wires DOM events to UseCase callbacks
 * - NO business logic
 * - NO API calls
 * - NO complex data transformations
 *
 * @example
 * ```typescript
 * <BackupsList serverStatus={serverStatus} />
 * ```
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableBody,
  Spinner,
  Pagination,
  Tooltip,
} from '@heroui/react';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';

// Clean Architecture imports - organized by layer
import {
  useBackupsRepository,
  useCreateBackup,
  useDeleteBackup,
  useBackupActions,
  useUpdateBackupMetadata,
  useRelativeTimeRefresh,
} from '..';
import type { Backup } from '../domain/backup';
import type { Server } from '../../server/domain/server';

// UI helper hooks (Clean Architecture: UI layer utilities)
import { useBackupSort, useBackupFilters, useBackupPagination, useRestoreProgress } from '../hooks';
import BackupDetailsDrawer from './BackupDetailsDrawer';
import BackupsCardHeader from './BackupsCardHeader';
import BackupsSearchBar from './BackupsSearchBar';
import BackupsTableHeader from './BackupsTableHeader';
import BackupTableRow from './BackupTableRow';
import BackupsModals from './BackupsModals';

/**
 * Props for BackupsList component.
 */
interface BackupsListProps {
  readonly serverStatus: Server | null;
}

/**
 * BackupsList component - displays and manages backups.
 * Uses Clean Architecture pattern with strict layer separation.
 */
export default function BackupsList({ serverStatus }: BackupsListProps): JSX.Element {
  // ========================================================================
  // REPOSITORY - Get data and state
  // ========================================================================
  const { backups, isLoading, error: repoError } = useBackupsRepository();

  // ========================================================================
  // USE CASES - Get orchestration logic and actions
  // ========================================================================
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const backupActions = useBackupActions();
  const updateMetadata = useUpdateBackupMetadata();

  // ========================================================================
  // HOOKS - View-level state (sorting, filtering, pagination)
  // ========================================================================

  const sort = useBackupSort(backups as Backup[]);
  const filters = useBackupFilters(sort.sortedBackups);
  const pagination = useBackupPagination(filters.filteredBackups, 10);
  const restoreProgress = useRestoreProgress();

  // Refresh relative times every 30 seconds (triggers re-render)
  useRelativeTimeRefresh();

  // ========================================================================
  // LOCAL VIEW STATE - Modal visibility, animations, selections
  // ========================================================================
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [selectedBackupForDelete, setSelectedBackupForDelete] = useState<Backup | null>(null);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<Backup | null>(null);
  const [selectedBackupNameForDetails, setSelectedBackupNameForDetails] = useState<string | null>(
    null
  );
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // Derive fresh backup data from the live backups array (for real-time updates in drawer)
  const selectedBackupForDetails = selectedBackupNameForDetails
    ? backups.find((backup) => backup.name === selectedBackupNameForDetails) || null
    : null;

  // ========================================================================
  // EVENT HANDLERS - Wire UI events to UseCase actions
  // ========================================================================

  const handleCreateBackupClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleSubmitCreate = async () => {
    createBackup.actions.handleSubmit();
    setIsCreateModalOpen(false);
  };

  const handleDeleteClick = useCallback((backup: Backup) => {
    setSelectedBackupForDelete(backup);
    setIsDeleteModalVisible(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!selectedBackupForDelete) return;
    setIsDeleteModalVisible(false);
    await deleteBackup.deleteBackup(selectedBackupForDelete);
    setSelectedBackupForDelete(null);
  };

  const handleRestoreClick = useCallback(
    (backup: Backup) => {
      if (serverStatus?.status === 'running') return;
      setSelectedBackupForRestore(backup);
      setIsRestoreModalVisible(true);
    },
    [serverStatus?.status]
  );

  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore) return;
    setIsRestoreModalVisible(false);
    restoreProgress.startRestore(selectedBackupForRestore.name);
    setSelectedBackupForRestore(null);
  };

  const handleOpenDetails = useCallback((backup: Backup) => {
    setSelectedBackupNameForDetails(backup.name);
    setIsDetailsDrawerOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsDrawerOpen(false);
    setTimeout(() => setSelectedBackupNameForDetails(null), 300);
  }, []);

  const handleClearFilters = useCallback(() => {
    filters.clearFilters();
    pagination.setPage(1);
  }, [filters, pagination]);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const renderVerificationIcon = (backup: Backup): JSX.Element => {
    const status = backup.verificationStatus;
    const fileCount = backup.verifiedFileCount || 0;

    switch (status) {
      case 'verified':
        return (
          <Tooltip content={`Verified - ${fileCount} files`} showArrow>
            <ShieldCheckIcon className="h-4 w-4 text-success" />
          </Tooltip>
        );
      case 'failed':
        return (
          <Tooltip content={`Failed: ${backup.verificationError}`} showArrow color="danger">
            <ShieldCheckIcon className="h-4 w-4 text-danger" />
          </Tooltip>
        );
      case 'pending':
        return (
          <Tooltip content="Verifying..." showArrow>
            <Spinner size="sm" color="warning" />
          </Tooltip>
        );
      default:
        return (
          <Tooltip content="Not verified" showArrow>
            <ShieldCheckIcon className="h-4 w-4 text-default-400" />
          </Tooltip>
        );
    }
  };

  const isServerRunning = serverStatus?.status === 'running';

  const columns = useMemo(
    () => [
      { key: 'name', label: 'BACKUP NAME', sortable: true },
      { key: 'size', label: 'SIZE', sortable: true },
      { key: 'date', label: 'CREATED', sortable: true },
      { key: 'notes', label: 'NOTES', sortable: false },
      { key: 'actions', label: 'ACTIONS', sortable: false },
    ],
    []
  );

  // ========================================================================
  // RENDER - Pure JSX, no business logic
  // ========================================================================

  if (repoError) {
    return (
      <Card className="w-full">
        <CardBody>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-danger">Error loading backups: {repoError}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <BackupsCardHeader
            backupCount={backups.length}
            isLoading={isLoading}
            onCreateBackup={handleCreateBackupClick}
          />

          <BackupsSearchBar
            searchQuery={filters.searchQuery}
            hasActiveFilters={filters.hasActiveFilters}
            dateRangeStart={filters.dateRangeStart}
            dateRangeEnd={filters.dateRangeEnd}
            isFilterPopoverOpen={isFilterPopoverOpen}
            onSearchChange={filters.setSearchQuery}
            onDateRangeStartChange={filters.setDateRangeStart}
            onDateRangeEndChange={filters.setDateRangeEnd}
            onFilterPopoverOpenChange={setIsFilterPopoverOpen}
            onClearFilters={handleClearFilters}
          />
        </CardHeader>

        <CardBody>
          <Table
            aria-label="Backups table"
            isStriped
            className="min-h-[400px]"
            bottomContent={
              pagination.totalPages > 1 ? (
                <div className="flex w-full justify-center">
                  <Pagination
                    isCompact
                    showControls
                    color="primary"
                    page={pagination.page}
                    total={pagination.totalPages}
                    onChange={pagination.setPage}
                  />
                </div>
              ) : null
            }
          >
            <BackupsTableHeader
              columns={columns}
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={(columnKey) => sort.toggleSort(columnKey as any)}
            />
            <TableBody
              items={pagination.paginatedBackups}
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading..." />}
              emptyContent="No backups found"
            >
              {(item: Backup) => (
                <BackupTableRow
                  backup={item}
                  isServerRunning={isServerRunning}
                  isVerifying={backupActions.verifyingBackupName === item.name}
                  isDownloading={backupActions.downloadingBackupName === item.name}
                  isDeleting={deleteBackup.deletingBackupName === item.name}
                  renderVerificationIcon={renderVerificationIcon}
                  onOpenDetails={handleOpenDetails}
                  onCopyName={backupActions.copyBackupName}
                  onVerify={backupActions.verifyBackup}
                  onRestore={handleRestoreClick}
                  onDownload={backupActions.downloadBackup}
                  onDelete={handleDeleteClick}
                />
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <BackupsModals
        isCreateModalOpen={isCreateModalOpen}
        isDeleteModalVisible={isDeleteModalVisible}
        isRestoreModalVisible={isRestoreModalVisible}
        createNotes={createBackup.formState.notes}
        createError={createBackup.error}
        isCreating={createBackup.isCreating}
        selectedDeleteBackupName={selectedBackupForDelete?.name || null}
        selectedRestoreBackupName={selectedBackupForRestore?.name || null}
        onCreateModalOpenChange={setIsCreateModalOpen}
        onDeleteModalOpenChange={setIsDeleteModalVisible}
        onRestoreModalOpenChange={setIsRestoreModalVisible}
        onCreateNotesChange={createBackup.actions.setNotes}
        onSubmitCreate={handleSubmitCreate}
        onConfirmDelete={handleConfirmDelete}
        onConfirmRestore={handleConfirmRestore}
      />

      <BackupDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        onClose={handleCloseDetails}
        backup={selectedBackupForDetails}
        serverStatus={serverStatus}
        onRestore={async (backupName: string) => {
          const backup = backups.find((b) => b.name === backupName);
          if (backup) {
            handleRestoreClick(backup);
          }
        }}
        onDelete={async (backupName: string) => {
          const backup = backups.find((b) => b.name === backupName);
          if (backup) {
            handleDeleteClick(backup);
          }
        }}
        onDownload={async (backupName: string) => {
          const backup = backups.find((b) => b.name === backupName);
          if (backup) {
            backupActions.downloadBackup(backup);
          }
        }}
        onVerify={async (backupName: string) => {
          const backup = backups.find((b) => b.name === backupName);
          if (backup) {
            backupActions.verifyBackup(backup);
          }
        }}
        onSaveMetadata={async (_backupName: string, notes: string, tags: string[]) => {
          if (selectedBackupForDetails) {
            updateMetadata.updateMetadata(selectedBackupForDetails, notes, tags);
          }
        }}
        isRestoring={false}
        isDeleting={
          selectedBackupForDetails
            ? deleteBackup.deletingBackupName === selectedBackupForDetails.name
            : false
        }
        isDownloading={
          selectedBackupForDetails
            ? backupActions.downloadingBackupName === selectedBackupForDetails.name
            : false
        }
        isVerifying={
          selectedBackupForDetails
            ? backupActions.verifyingBackupName === selectedBackupForDetails.name
            : false
        }
      />
    </>
  );
}
