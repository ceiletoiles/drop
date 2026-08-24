import { clsx } from 'clsx';
import type { ExpirationType, ItemType } from '../../../shared/types';
import { getExpirationOptionLabel } from '../../lib/expiration';

interface ExpirationSelectorProps {
  itemType: ItemType;
  value: ExpirationType;
  onChange: (value: ExpirationType) => void;
  disabled?: boolean;
  allowConsume?: boolean;
}

const options: ExpirationType[] = ['CONSUME', '24_HOURS', '7_DAYS', '1_MONTH'];

export const ExpirationSelector = ({ itemType, value, onChange, disabled = false, allowConsume = true }: ExpirationSelectorProps) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 text-left shadow-sm">
    <div className="pb-3">
      <p className="text-sm font-medium text-slate-900">Expiration</p>
      <p className="text-xs text-slate-500">Choose when this item disappears.</p>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {options.filter((option) => allowConsume || option !== 'CONSUME').map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={clsx(
              'flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition disabled:pointer-events-none disabled:opacity-50',
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
        );
      })}
    </div>
  </div>
);
