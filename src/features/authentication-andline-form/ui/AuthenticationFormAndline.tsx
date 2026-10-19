'use client';

import React, { useEffect, useState } from 'react';

import { useActiveAuthIntegrations, useEditIntegration } from '@/shared/hooks';
import { AuthenticationType } from '@/shared/enums';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

interface Props {
  onOpenChange: (open: boolean) => void;
}

/** ANDLINE needs only the site origin, never a user-entered API path. */
function normalizeSiteOrigin(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback)) ||
        !!parsed.username || !!parsed.password || !!parsed.search || !!parsed.hash ||
        parsed.pathname !== '/' || !parsed.hostname) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function AuthenticationFormAndline({ onOpenChange }: Props) {
  const { data: active } = useActiveAuthIntegrations();
  const { mutateAsync, isPending } = useEditIntegration();
  const [siteUrl, setSiteUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (active?.authType === AuthenticationType.AUTHENTICATION_TYPE_ANDLINE) {
      setSiteUrl(active.endpoint || '');
    }
  }, [active?.authType, active?.endpoint]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const origin = normalizeSiteOrigin(siteUrl);
    if (!origin) {
      setError('Укажите только адрес сайта, например https://andline.pro — без /api, пути или параметров.');
      return;
    }
    setError('');
    try {
      await mutateAsync({
        authType: AuthenticationType.AUTHENTICATION_TYPE_ANDLINE,
        endpoint: origin,
      });
      onOpenChange(false);
    } catch {
      // useEditIntegration displays an API error toast; never fake success.
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label htmlFor="andline-site-url" className="text-sm font-medium">
          Адрес сайта ANDLINE
        </label>
        <Input
          id="andline-site-url"
          type="url"
          required
          autoComplete="url"
          placeholder="https://andline.pro"
          value={siteUrl}
          onChange={(event) => {
            setSiteUrl(event.target.value);
            setError('');
          }}
          aria-describedby="andline-url-description"
          aria-invalid={Boolean(error)}
        />
        <p id="andline-url-description" className="text-sm text-gray-600 dark:text-gray-300">
          Укажите только основной адрес сайта. Путь авторизации /api/gml/auth
          настроится автоматически. Пароли и коды подтверждения не сохраняются в панели.
        </p>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </div>
      <Button type="submit" className="ml-auto w-fit" disabled={isPending}>
        {isPending ? 'Сохранение…' : 'Сохранить'}
      </Button>
    </form>
  );
}
