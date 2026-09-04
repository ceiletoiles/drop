import { clsx } from 'clsx';
import type { ExpirationType, ItemType } from '../../../shared/types';
import { getExpirationOptionLabel } from '../../lib/expiration';
import { MinusIcon, PlusIcon } from '../../components/ui/Icon';

interface ExpirationSelectorProps {
  itemType: ItemType;
  value: ExpirationType;
  onChange: (value: ExpirationType) => void;
  disabled?: boolean;
  allowConsume?: boolean;
  onExtend?: (value: Exclude<ExpirationType, 'CONSUME'>) => Promise<void>;
  expiresAt?: string | null;
  onReduce?: (value: Exclude<ExpirationType, 'CONSUME'>) => Promise<void>;
}

const options: ExpirationType[] = ['CONSUME', '24_HOURS', '7_DAYS', '1_MONTH'];

export const ExpirationSelector = ({ itemType, value, onChange, disabled = false, allowConsume = true, onExtend, expiresAt, onReduce }: ExpirationSelectorProps) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 text-left shadow-sm">
    <div className="pb-3">
      <p className="text-sm font-medium text-slate-900">Expiration</p>
      <p className="text-xs text-slate-500">Choose when this item disappears.</p>
    </div>
    <div className="space-y-1.5">
      {options.filter((option) => allowConsume || option !== 'CONSUME').map((option) => {
        const active = value === option;
        const canReduce = active && option !== 'CONSUME' && expiresAt
          ? new Date(expiresAt).getTime() > Date.now() + (option === '24_HOURS' ? 48 : option === '7_DAYS' ? 14 : 60) * 24 * 60 * 60 * 1000
          : false;
        return (
          <div key={option} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={clsx(
                'flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition disabled:pointer-events-none disabled:opacity-50',
                active ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'hover:bg-slate-100'
              )}
            >
            <span
              className={clsx(
                'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                active ? 'border-indigo-500' : 'border-slate-300'
              )}
            >
              {active ? <span className="h-2 w-2 rounded-full bg-indigo-600" /> : null}
            </span>
            <span className="min-w-0 flex-1 whitespace-nowrap text-[11px] font-medium leading-none">
              {getExpirationOptionLabel(option, itemType)}
            </span>
            </button>
            {active && option !== 'CONSUME' ? (
              <div className="flex shrink-0 items-center gap-1.5">
                {onReduce ? (
                  <button
                    type="button"
                    aria-label={`Remove ${getExpirationOptionLabel(option, itemType)}`}
                    title={`Remove ${getExpirationOptionLabel(option, itemType)}`}
                    disabled={disabled || !canReduce}
                    onClick={() => void onReduce(option)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <MinusIcon />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`Add ${getExpirationOptionLabel(option, itemType)}`}
                  title={`Add ${getExpirationOptionLabel(option, itemType)}`}
                  disabled={disabled || !onExtend}
                  onClick={() => void onExtend?.(option)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  <PlusIcon />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  </div>
);
