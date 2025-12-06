/**
 * @fileoverview Backup details slideout drawer component for viewing and managing individual backups.
 * Provides comprehensive backup information, actions, notes editing, and tag management.
 * Uses Hero UI Modal configured as a right-sliding drawer for better UX.
 */

import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  Chip,
  Textarea,
  Input,
  Divider,
  Tooltip,
} from '@heroui/react';
import {
  ArrowPathIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  PencilIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  TagIcon,
  MapIcon,
  UserGroupIcon,
  UsersIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';
import NumberFlow from '@number-flow/react';

// Clean Architecture: Domain type imports
import type { Server } from '../../server/domain/server';
import type { Backup } from '../domain/backup';
import { parseFileSize, formatTimestamp, formatRelativeTime, useRelativeTimeRefresh } from '..';
import { backupApiAdapter } from '../adapters/backupApiAdapter';
import { toast } from '../../shared/services/toast';

/**
 * Props interface for BackupDetailsDrawer component.
 * @interface BackupDetailsDrawerProps
 */
interface BackupDetailsDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly backup: Backup | null;
  readonly serverStatus: Server | null;
  readonly onRestore: (backupName: string) => Promise<void>;
  readonly onDelete: (backupName: string) => Promise<void>;
  readonly onDownload: (backupName: string) => Promise<void>;
  readonly onVerify: (backupName: string) => Promise<void>;
  readonly onSaveMetadata: (backupName: string, notes: string, tags: string[]) => Promise<void>;
  readonly isRestoring?: boolean;
  readonly isDeleting?: boolean;
  readonly isDownloading?: boolean;
  readonly isVerifying?: boolean;
}

/** Standard predefined tags for quick selection */
const STANDARD_TAGS = [
  'pre-boss-fight',
  'pre-breeding',
  'pre-base-move',
  'pre-raid',
  'milestone',
  'clean-slate',
  'pre-update',
  'emergency',
  'manual',
  'auto',
];

/**
 * Backup details drawer component that slides in from the right.
 * Displays comprehensive backup information and provides all backup actions.
 *
 * Features:
 * - Slideout panel design for contextual viewing
 * - In-place notes editing
 * - Tag management with autocomplete
 * - All backup actions (restore, delete, download, verify)
 * - Safety checks and confirmations
 * - Copy-to-clipboard for backup names
 *
 * @param {BackupDetailsDrawerProps} props - Component props
 * @returns {JSX.Element} Backup details drawer
 */
export default function BackupDetailsDrawer({
  isOpen,
  onClose,
  backup,
  serverStatus,
  onRestore,
  onDelete,
  onDownload,
  onVerify,
  onSaveMetadata,
  isRestoring = false,
  isDeleting = false,
  isDownloading = false,
  isVerifying = false,
}: BackupDetailsDrawerProps): JSX.Element {
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [animatedSizeValue, setAnimatedSizeValue] = useState<number>(0);

  // Refresh relative times every 30 seconds (triggers re-render)
  useRelativeTimeRefresh();

  // Animate the file size when drawer opens
  useEffect(() => {
    if (isOpen && backup) {
      // Reset to 0 first, then animate to actual value
      setAnimatedSizeValue(0);
      const timeoutId = setTimeout(() => {
        setAnimatedSizeValue(parseFileSize(backup.sizeBytes).value);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, backup?.name]);

  // Update animated size when backup size changes while drawer is open
  useEffect(() => {
    if (isOpen && backup) {
      setAnimatedSizeValue(parseFileSize(backup.sizeBytes).value);
    }
  }, [backup?.sizeBytes]);

  if (!backup) {
    return <></>;
  }

  const handleStartEdit = (): void => {
    setEditedNotes(backup.notes || '');
    setEditedTags(backup.tags ? [...backup.tags] : []);
    setIsEditingNotes(true);
  };

  const handleCancelEdit = (): void => {
    setIsEditingNotes(false);
    setEditedNotes('');
    setEditedTags([]);
  };

  const handleSaveMetadata = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await onSaveMetadata(backup.name, editedNotes, editedTags);
      setIsEditingNotes(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (tagToAdd: string): void => {
    const trimmedTag = tagToAdd.trim().toLowerCase();
    if (trimmedTag && !editedTags.includes(trimmedTag)) {
      setEditedTags([...editedTags, trimmedTag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string): void => {
    setEditedTags(editedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleCopyName = async (): Promise<void> => {
    try {
      await backupApiAdapter.copyToClipboard(backup.name);
      toast.success('Backup name copied to clipboard');
    } catch (clipboardError) {
      console.error('Failed to copy to clipboard:', clipboardError);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleRestore = async (): Promise<void> => {
    await onRestore(backup.name);
    onClose();
  };

  const handleDelete = async (): Promise<void> => {
    await onDelete(backup.name);
    onClose();
  };

  const handleDownload = async (): Promise<void> => {
    await onDownload(backup.name);
  };

  const handleVerify = async (): Promise<void> => {
    await onVerify(backup.name);
  };

  const parsedSize = parseFileSize(backup.sizeBytes);
  const formattedDate = formatTimestamp(backup.createdAt);
  const relativeDate = formatRelativeTime(backup.createdAt);

  const isServerRunning = serverStatus?.status === 'running';
  const canRestore = !isServerRunning && !isRestoring;

  // Get verification status chip
  const getVerificationChip = (): JSX.Element | null => {
    if (!backup.verificationStatus || backup.verificationStatus === 'unknown') {
      return (
        <Chip color="default" variant="flat" size="sm">
          Not Verified
        </Chip>
      );
    }

    switch (backup.verificationStatus) {
      case 'verified':
        return (
          <Chip
            color="success"
            variant="flat"
            size="sm"
            startContent={<CheckIcon className="w-3 h-3" />}
          >
            Verified ({backup.verifiedFileCount} files)
          </Chip>
        );
      case 'failed':
        return (
          <Chip color="danger" variant="flat" size="sm">
            Verification Failed
          </Chip>
        );
      case 'pending':
        return (
          <Chip color="warning" variant="flat" size="sm">
            Verifying...
          </Chip>
        );
      default:
        return null;
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md" scrollBehavior="inside">
      <DrawerContent>
        {(closeDrawer) => (
          <>
            <DrawerHeader className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Backup Details</h3>
              <p className="text-sm font-normal text-default-500">{backup.name}</p>
            </DrawerHeader>

            <DrawerBody>
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-default-500">Size:</span>
                      <span className="font-mono tabular-nums">
                        <NumberFlow value={animatedSizeValue} suffix={` ${parsedSize.unit}`} />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">Created:</span>
                      <span className="text-right">
                        {formattedDate}
                        <span className="text-default-400 text-xs ml-2">({relativeDate})</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-default-500">Status:</span>
                      {getVerificationChip()}
                    </div>
                    {backup.verificationTime && (
                      <div className="flex justify-between">
                        <span className="text-default-500">Last Verified:</span>
                        <span className="text-xs text-default-400">
                          {formatRelativeTime(backup.verificationTime)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Info Section - Only show if save info exists */}
                {backup.saveInfo && (
                  <>
                    <Divider />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">ARK Save Data</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-default-500 flex items-center gap-1.5">
                            <MapIcon className="w-4 h-4" />
                            Map:
                          </span>
                          <Chip size="sm" variant="flat" color="primary">
                            {backup.saveInfo.mapDisplayName}
                          </Chip>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-default-500 flex items-center gap-1.5">
                            <UserGroupIcon className="w-4 h-4" />
                            Players:
                          </span>
                          <span className="font-mono tabular-nums">
                            {backup.saveInfo.playerCount}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-default-500 flex items-center gap-1.5">
                            <UsersIcon className="w-4 h-4" />
                            Tribes:
                          </span>
                          <span className="font-mono tabular-nums">
                            {backup.saveInfo.tribeCount}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-default-500 flex items-center gap-1.5">
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            Auto-saves:
                          </span>
                          <span className="font-mono tabular-nums">
                            {backup.saveInfo.autoSaveCount}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-default-500">Total Files:</span>
                          <span className="font-mono tabular-nums">
                            {backup.saveInfo.totalFileCount}
                          </span>
                        </div>
                      </div>

                      {/* Suggested Tags */}
                      {backup.saveInfo.suggestedTags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-default-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-default-500 flex items-center gap-1">
                              <SparklesIcon className="w-3 h-3" />
                              Suggested Tags
                            </span>
                            {isEditingNotes && (
                              <Button
                                size="sm"
                                variant="flat"
                                color="secondary"
                                onPress={() => {
                                  const newTags = [...editedTags];
                                  for (const suggestedTag of backup.saveInfo?.suggestedTags || []) {
                                    if (!newTags.includes(suggestedTag)) {
                                      newTags.push(suggestedTag);
                                    }
                                  }
                                  setEditedTags(newTags);
                                }}
                              >
                                Apply All
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {backup.saveInfo.suggestedTags.map((suggestedTag) => {
                              const isAlreadyAdded = isEditingNotes
                                ? editedTags.includes(suggestedTag)
                                : backup.tags?.includes(suggestedTag);
                              return (
                                <Chip
                                  key={suggestedTag}
                                  size="sm"
                                  variant={isAlreadyAdded ? 'flat' : 'bordered'}
                                  color={isAlreadyAdded ? 'success' : 'default'}
                                  className={
                                    !isAlreadyAdded && isEditingNotes
                                      ? 'cursor-pointer hover:bg-default-100'
                                      : ''
                                  }
                                  onClick={() => {
                                    if (isEditingNotes && !isAlreadyAdded) {
                                      setEditedTags([...editedTags, suggestedTag]);
                                    }
                                  }}
                                >
                                  {isAlreadyAdded ? '✓ ' : '+ '}
                                  {suggestedTag}
                                </Chip>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Divider />

                {/* Notes Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Notes</h4>
                    {!isEditingNotes && (
                      <Button
                        size="sm"
                        variant="light"
                        startContent={<PencilIcon className="w-4 h-4" />}
                        onPress={handleStartEdit}
                      >
                        Edit
                      </Button>
                    )}
                  </div>

                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedNotes}
                        onValueChange={setEditedNotes}
                        placeholder="Add notes for this backup..."
                        minRows={3}
                        maxRows={6}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          color="primary"
                          onPress={handleSaveMetadata}
                          isLoading={isSaving}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={handleCancelEdit}
                          isDisabled={isSaving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-default-600">{backup.notes || 'No notes added'}</p>
                  )}
                </div>

                <Divider />

                {/* Tags Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Tags</h4>

                  {isEditingNotes ? (
                    <div className="space-y-3">
                      {/* Current tags */}
                      <div className="flex flex-wrap gap-2">
                        {editedTags.length > 0 ? (
                          editedTags.map((tag) => (
                            <Chip
                              key={tag}
                              onClose={() => handleRemoveTag(tag)}
                              variant="flat"
                              size="sm"
                              startContent={<TagIcon className="w-3 h-3" />}
                            >
                              {tag}
                            </Chip>
                          ))
                        ) : (
                          <p className="text-xs text-default-400">No tags</p>
                        )}
                      </div>

                      {/* Add new tag input */}
                      <Input
                        size="sm"
                        placeholder="Type a tag name and press Enter..."
                        value={newTagInput}
                        onValueChange={setNewTagInput}
                        onKeyDown={(keyEvent) => {
                          if (keyEvent.key === 'Enter') {
                            keyEvent.preventDefault();
                            handleAddTag(newTagInput);
                          }
                        }}
                        endContent={
                          newTagInput.trim() && (
                            <Button
                              size="sm"
                              isIconOnly
                              variant="light"
                              onPress={() => handleAddTag(newTagInput)}
                            >
                              <CheckIcon className="w-4 h-4" />
                            </Button>
                          )
                        }
                      />

                      {/* Quick add standard tags */}
                      <div>
                        <p className="text-xs text-default-500 mb-2">Quick Add:</p>
                        <div className="flex flex-wrap gap-1">
                          {STANDARD_TAGS.filter((tag) => !editedTags.includes(tag)).map((tag) => (
                            <Chip
                              key={tag}
                              size="sm"
                              variant="bordered"
                              className="cursor-pointer hover:bg-default-100"
                              onClick={() => handleAddTag(tag)}
                            >
                              + {tag}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {backup.tags && backup.tags.length > 0 ? (
                        backup.tags.map((tag: string) => (
                          <Chip
                            key={tag}
                            variant="flat"
                            size="sm"
                            startContent={<TagIcon className="w-3 h-3" />}
                          >
                            {tag}
                          </Chip>
                        ))
                      ) : (
                        <p className="text-sm text-default-400">No tags</p>
                      )}
                    </div>
                  )}
                </div>

                <Divider />

                {/* Actions Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Actions</h4>
                  <div className="space-y-2">
                    {/* Restore Button */}
                    <Tooltip
                      content={
                        isServerRunning
                          ? 'Server must be stopped before restore'
                          : 'Restore this backup'
                      }
                      placement="left"
                    >
                      <Button
                        fullWidth
                        color="primary"
                        variant="flat"
                        startContent={<ArrowPathIcon className="w-4 h-4" />}
                        onPress={handleRestore}
                        isDisabled={!canRestore}
                        isLoading={isRestoring}
                      >
                        Restore Backup
                      </Button>
                    </Tooltip>

                    {/* Verify Button */}
                    <Button
                      fullWidth
                      variant="flat"
                      startContent={<ShieldCheckIcon className="w-4 h-4" />}
                      onPress={handleVerify}
                      isLoading={isVerifying}
                    >
                      Verify Integrity
                    </Button>

                    {/* Download Button */}
                    <Button
                      fullWidth
                      variant="flat"
                      startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
                      onPress={handleDownload}
                      isLoading={isDownloading}
                    >
                      Download
                    </Button>

                    {/* Copy Name Button */}
                    <Button
                      fullWidth
                      variant="flat"
                      startContent={<ClipboardDocumentIcon className="w-4 h-4" />}
                      onPress={handleCopyName}
                    >
                      Copy Name
                    </Button>

                    {/* Delete Button */}
                    <Button
                      fullWidth
                      color="danger"
                      variant="flat"
                      startContent={<TrashIcon className="w-4 h-4" />}
                      onPress={handleDelete}
                      isLoading={isDeleting}
                    >
                      Delete Backup
                    </Button>
                  </div>
                </div>
              </div>
            </DrawerBody>

            <DrawerFooter>
              <Button variant="light" onPress={closeDrawer}>
                Close
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
