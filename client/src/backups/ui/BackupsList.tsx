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

import { useState } from 'react';
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
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid';
import NumberFlow from '@number-flow/react';

// Clean Architecture imports - organized by layer
import {
  useBackupsRepository,
  useCreateBackup,
  useDeleteBackup,
  useBackupActions,
  useUpdateBackupMetadata,
  parseFileSize,
  formatTimestamp,
  formatRelativeTime,
} from '..';
import type { Backup } from '../domain/backup';
import type { Server } from '../../server/domain/server';

// UI helper hooks (Clean Architecture: UI layer utilities)
import { useBackupSort, useBackupFilters, useBackupPagination, useRestoreProgress } from '../hooks';
import BackupDetailsDrawer from './BackupDetailsDrawer';

/**
 * Props for BackupsList component.
 */
interface BackupsListProps {
  /** Server status for safety checks */
  serverStatus: Server | null;
}

/** Primary brand color */
const PRIMARY_COLOR = '#0ea5e9';

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

  const handleCreateBackup = () => {
    setIsCreateModalOpen(true);
  };

  const handleSubmitCreate = async () => {
    await createBackup.actions.handleSubmit();
    setIsCreateModalOpen(false);
  };

  const handleDeleteClick = (backup: Backup) => {
    setSelectedBackupForDelete(backup);
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBackupForDelete) return;
    setIsDeleteModalVisible(false);
    await deleteBackup.deleteBackup(selectedBackupForDelete);
    setSelectedBackupForDelete(null);
  };

  const handleRestoreClick = (backup: Backup) => {
    if (serverStatus?.status === 'running') return;
    setSelectedBackupForRestore(backup);
    setIsRestoreModalVisible(true);
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore) return;
    setIsRestoreModalVisible(false);
    // TODO: Create useRestoreBackup UseCase
    // For now, use legacy restore progress hook
    restoreProgress.startRestore(selectedBackupForRestore.name);
    setSelectedBackupForRestore(null);
  };

  const handleOpenDetails = (backup: Backup) => {
    setSelectedBackupNameForDetails(backup.name);
    setIsDetailsDrawerOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsDrawerOpen(false);
    setTimeout(() => setSelectedBackupNameForDetails(null), 300);
  };

  const handleClearFilters = () => {
    filters.clearFilters();
    pagination.setPage(1);
  };

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

  const columns = [
    { key: 'name', label: 'BACKUP NAME', sortable: true },
    { key: 'size', label: 'SIZE', sortable: true },
    { key: 'date', label: 'CREATED', sortable: true },
    { key: 'notes', label: 'NOTES', sortable: false },
    { key: 'actions', label: 'ACTIONS', sortable: false },
  ];

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
                onPress={handleCreateBackup}
                isDisabled={isLoading}
              >
                Create Backup
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-default-500">Total:</span>
                <NumberFlow
                  value={backups.length}
                  className="text-xl font-bold"
                  style={{ color: PRIMARY_COLOR }}
                />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex w-full items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Search backups..."
              value={filters.searchQuery}
              onValueChange={filters.setSearchQuery}
              startContent={<MagnifyingGlassIcon className="h-4 w-4 text-default-400" />}
              endContent={
                filters.searchQuery && (
                  <button onClick={() => filters.setSearchQuery('')}>
                    <XMarkIcon className="h-4 w-4 text-default-400" />
                  </button>
                )
              }
              size="sm"
              variant="bordered"
            />

            <Popover
              isOpen={isFilterPopoverOpen}
              onOpenChange={setIsFilterPopoverOpen}
              placement="bottom"
            >
              <PopoverTrigger>
                <Button
                  size="sm"
                  variant="flat"
                  color={filters.hasActiveFilters ? 'primary' : 'default'}
                  startContent={<FunnelIcon className="h-4 w-4" />}
                >
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Filters</h4>
                    {filters.hasActiveFilters && (
                      <Button size="sm" variant="light" onPress={handleClearFilters}>
                        Clear
                      </Button>
                    )}
                  </div>
                  <Input
                    type="date"
                    label="Start Date"
                    size="sm"
                    value={filters.dateRangeStart}
                    onValueChange={filters.setDateRangeStart}
                  />
                  <Input
                    type="date"
                    label="End Date"
                    size="sm"
                    value={filters.dateRangeEnd}
                    onValueChange={filters.setDateRangeEnd}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  className={column.sortable ? 'cursor-pointer' : ''}
                  onClick={() => column.sortable && sort.toggleSort(column.key as any)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable &&
                      sort.sortColumn === column.key &&
                      (sort.sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              items={pagination.paginatedBackups}
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading..." />}
              emptyContent="No backups found"
            >
              {(item: Backup) => {
                return (
                  <TableRow
                    key={item.name}
                    className="cursor-pointer"
                    onClick={() => handleOpenDetails(item)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderVerificationIcon(item)}
                        <span className="font-semibold hover:text-primary">{item.name}</span>
                        <Tooltip content="Copy name">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => backupActions.copyBackupName(item)}
                            onClick={(clickEvent: React.MouseEvent) => clickEvent.stopPropagation()}
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const parsed = parseFileSize(item.sizeBytes);
                        return (
                          <span className="font-mono tabular-nums">
                            <NumberFlow value={parsed.value} suffix={` ${parsed.unit}`} />
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatTimestamp(item.createdAt)}</span>
                        <span className="text-xs text-default-400">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{item.notes || '—'}</TableCell>
                    <TableCell
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex gap-1">
                        <Tooltip content="Verify">
                          <Button
                            isIconOnly
                            size="sm"
                            color="warning"
                            variant="flat"
                            isLoading={backupActions.verifyingBackupName === item.name}
                            onPress={() => backupActions.verifyBackup(item)}
                          >
                            <ShieldCheckIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content={isServerRunning ? 'Stop server first' : 'Restore'}>
                          <Button
                            isIconOnly
                            size="sm"
                            color="primary"
                            variant="flat"
                            isDisabled={isServerRunning}
                            onPress={() => handleRestoreClick(item)}
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Download">
                          <Button
                            isIconOnly
                            size="sm"
                            color="success"
                            variant="flat"
                            isLoading={backupActions.downloadingBackupName === item.name}
                            onPress={() => backupActions.downloadBackup(item)}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Delete">
                          <Button
                            isIconOnly
                            size="sm"
                            color="danger"
                            variant="flat"
                            isLoading={deleteBackup.deletingBackupName === item.name}
                            onPress={() => handleDeleteClick(item)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Create Backup Modal */}
      <Modal isOpen={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Create Backup</ModalHeader>
              <ModalBody>
                <Input
                  label="Notes (optional)"
                  placeholder="Pre-boss fight, milestone, etc."
                  value={createBackup.formState.notes}
                  onValueChange={createBackup.actions.setNotes}
                  maxLength={500}
                />
                {createBackup.error && <p className="text-sm text-danger">{createBackup.error}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} disableRipple>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  isLoading={createBackup.isCreating}
                  onPress={handleSubmitCreate}
                  disableRipple
                >
                  Create
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalVisible} onOpenChange={setIsDeleteModalVisible}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Delete Backup?</ModalHeader>
              <ModalBody>
                <p>
                  Delete <strong>{selectedBackupForDelete?.name}</strong>?
                </p>
                <p className="text-sm text-danger">This action cannot be undone.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={handleConfirmDelete}>
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Restore Modal */}
      <Modal isOpen={isRestoreModalVisible} onOpenChange={setIsRestoreModalVisible}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Restore Backup?</ModalHeader>
              <ModalBody>
                <p>
                  Restore <strong>{selectedBackupForRestore?.name}</strong>?
                </p>
                <p className="text-sm text-warning">This will replace all current saves.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={handleConfirmRestore}>
                  Restore
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Details Drawer - Legacy (will be refactored) */}
      <BackupDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        onClose={handleCloseDetails}
        backup={selectedBackupForDetails}
        serverStatus={serverStatus}
        onRestore={async () => {
          if (selectedBackupForDetails) {
            await handleRestoreClick(selectedBackupForDetails);
          }
        }}
        onDelete={async () => {
          if (selectedBackupForDetails) {
            await handleDeleteClick(selectedBackupForDetails);
          }
        }}
        onDownload={async () => {
          if (selectedBackupForDetails) {
            await backupActions.downloadBackup(selectedBackupForDetails);
          }
        }}
        onVerify={async () => {
          if (selectedBackupForDetails) {
            await backupActions.verifyBackup(selectedBackupForDetails);
          }
        }}
        onSaveMetadata={async (_backupName: string, notes: string, tags: string[]) => {
          if (selectedBackupForDetails) {
            await updateMetadata.updateMetadata(selectedBackupForDetails, notes, tags);
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
