/**
 * @fileoverview Modal components for backup operations.
 * Handles create, delete, and restore confirmation modals.
 */

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@heroui/react';

interface BackupsModalsProps {
  readonly isCreateModalOpen: boolean;
  readonly isDeleteModalVisible: boolean;
  readonly isRestoreModalVisible: boolean;
  readonly createNotes: string;
  readonly createError: string | null;
  readonly isCreating: boolean;
  readonly selectedDeleteBackupName: string | null;
  readonly selectedRestoreBackupName: string | null;
  readonly onCreateModalOpenChange: (isOpen: boolean) => void;
  readonly onDeleteModalOpenChange: (isOpen: boolean) => void;
  readonly onRestoreModalOpenChange: (isOpen: boolean) => void;
  readonly onCreateNotesChange: (notes: string) => void;
  readonly onSubmitCreate: () => void;
  readonly onConfirmDelete: () => void;
  readonly onConfirmRestore: () => void;
}

export default function BackupsModals({
  isCreateModalOpen,
  isDeleteModalVisible,
  isRestoreModalVisible,
  createNotes,
  createError,
  isCreating,
  selectedDeleteBackupName,
  selectedRestoreBackupName,
  onCreateModalOpenChange,
  onDeleteModalOpenChange,
  onRestoreModalOpenChange,
  onCreateNotesChange,
  onSubmitCreate,
  onConfirmDelete,
  onConfirmRestore,
}: BackupsModalsProps) {
  return (
    <>
      {/* Create Backup Modal */}
      <Modal isOpen={isCreateModalOpen} onOpenChange={onCreateModalOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Create Backup</ModalHeader>
              <ModalBody>
                <Input
                  label="Notes (optional)"
                  placeholder="Pre-boss fight, milestone, etc."
                  value={createNotes}
                  onValueChange={onCreateNotesChange}
                  maxLength={500}
                />
                {createError && <p className="text-sm text-danger">{createError}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} disableRipple>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  isLoading={isCreating}
                  onPress={onSubmitCreate}
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
      <Modal isOpen={isDeleteModalVisible} onOpenChange={onDeleteModalOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Delete Backup?</ModalHeader>
              <ModalBody>
                <p>
                  Delete <strong>{selectedDeleteBackupName}</strong>?
                </p>
                <p className="text-sm text-danger">This action cannot be undone.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={onConfirmDelete}>
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Restore Modal */}
      <Modal isOpen={isRestoreModalVisible} onOpenChange={onRestoreModalOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Restore Backup?</ModalHeader>
              <ModalBody>
                <p>
                  Restore <strong>{selectedRestoreBackupName}</strong>?
                </p>
                <p className="text-sm text-warning">This will replace all current saves.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={onConfirmRestore}>
                  Restore
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
