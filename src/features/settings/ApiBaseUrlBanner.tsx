import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { clearStoredApiBaseUrl, getConfiguredApiBaseUrl, needsApiOverride, setStoredApiBaseUrl } from '../../lib/api-config';

interface ApiBaseUrlBannerProps {
  onApplied: () => void;
}

export const ApiBaseUrlBanner = ({ onApplied }: ApiBaseUrlBannerProps) => {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');

  useEffect(() => {
    const shouldShow = needsApiOverride();
    setVisible(shouldShow);
    setValue(getConfiguredApiBaseUrl());
  }, []);

  if (!visible) return null;

  return (
    <div className="border-b border-amber-200/80 bg-amber-50/70 px-0 py-3 text-amber-950">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">API config needed</p>
      <h2 className="mt-1.5 text-base font-semibold">This deployed site still needs the Worker URL</h2>
      <p className="mt-1.5 text-sm leading-6 text-amber-900/80">
        The site is currently trying to use a local API URL. Paste your deployed Worker URL here so uploads and recent
        items can load correctly on production.
      </p>
      <div className="mt-3 space-y-2.5">
        <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://your-worker.workers.dev" />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              setStoredApiBaseUrl(value);
              setVisible(false);
              onApplied();
            }}
          >
            Save API URL
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              clearStoredApiBaseUrl();
              setValue('');
            }}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};
