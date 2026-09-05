import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import type { ExpirationType } from '../../../shared/types';
import type { Item } from './types';
import { ExpirationSelector } from './ExpirationSelector';

interface ExpirationModalProps {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onSave: (itemId: string, expirationType: ExpirationType) => Promise<void>;
  onExtend?: (itemId: string, expirationType: Exclude<ExpirationType, 'CONSUME'>) => Promise<void>;
  onReduce?: (itemId: string, expirationType: Exclude<ExpirationType, 'CONSUME'>) => Promise<void>;
  allowConsume?: boolean;
}

export const ExpirationModal = ({ open, item, onClose, onSave, onExtend, onReduce, allowConsume = true }: ExpirationModalProps) => {
  const [expirationType, setExpirationType] = useState<ExpirationType>('24_HOURS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extensionInFlightRef = useRef(false);

  useEffect(() => {
    if (open) {
      setExpirationType(item?.expirationType ?? '24_HOURS');
      setError(null);
    }
  }, [item?.expirationType, open]);

  const extend = async (type: Exclude<ExpirationType, 'CONSUME'>) => {
    if (!item || !onExtend || extensionInFlightRef.current) return;
    extensionInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await onExtend(item.id, type);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      extensionInFlightRef.current = false;
      setLoading(false);
    }
  };

  const reduce = async (type: Exclude<ExpirationType, 'CONSUME'>) => {
    if (!item || !onReduce) return;
    setLoading(true);
    setError(null);
    try {
      await onReduce(item.id, type);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!item) return;
    if (expirationType === item.expirationType) {
      onClose();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(item.id, expirationType);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={item ? `Change expiration` : 'Change expiration'}
      open={open}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={() => void save()} disabled={loading || !item}>
            {loading ? <Spinner /> : 'Save'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <ExpirationSelector
          itemType={item?.type ?? 'text'}
          value={expirationType}
          onChange={setExpirationType}
          disabled={loading}
          allowConsume={allowConsume}
          onExtend={item && onExtend ? extend : undefined}
          expiresAt={item?.expiresAt}
          onReduce={item && onReduce ? reduce : undefined}
        />
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </div>
    </Modal>
  );
};
