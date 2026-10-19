import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from "react";
import { toast } from "sonner";

import { ClientDownloadFormSchemaType, ClientDownloadSchema } from '../lib/static';
import { useOnSubmit } from '../lib/hooks/useOnSubmit';

import { useConnectionHub } from '@/widgets/generate-launcher-dialog';
import { useLauncherGithubVersions } from '@/shared/hooks';
import { cn, getApiBaseUrl } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Icons } from '@/shared/ui/icons';
import { Input } from '@/shared/ui/input';
import { Progress } from '@/shared/ui/progress';
import { FormCombobox } from "@/shared/ui/FormCombobox";

interface DownloadClientFormProps extends React.HTMLAttributes<HTMLDivElement> {
  connectionHub: ReturnType<typeof useConnectionHub>['connectionHub'];
  state: ReturnType<typeof useConnectionHub>['download'];
}

export function DownloadClientForm({
                                     className,
                                     connectionHub,
                                     state,
                                     ...props
                                   }: DownloadClientFormProps) {
  const { percent, isDownload } = state;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { onSubmit } = useOnSubmit({ connectionHub, state });

  const { data: branches } = useLauncherGithubVersions();

  const form = useForm<ClientDownloadFormSchemaType>({
    values: { branch: '', host: getApiBaseUrl() || '', folder: '' },
    resolver: zodResolver(ClientDownloadSchema),
    disabled: isDownload,
  });

  const refreshSource = async () => {
    const version = form.getValues('branch')?.trim();
    if (!version) {
      form.setError('branch', { message: 'Выберите версию для обновления' });
      return;
    }
    if (!connectionHub) {
      toast.error('Нет подключения к серверу сборки. Повторите попытку.');
      return;
    }

    setIsRefreshing(true);
    try {
      const revision = await connectionHub.invoke<string>('RefreshSource', version);
      toast.success('Исходники обновлены', {
        description: `Версия ${version}: GitHub master, коммит ${revision}. Можно запускать сборку.`,
      });
    } catch (error) {
      toast.error('Не удалось обновить исходники', {
        description: error instanceof Error ? error.message : 'Повторите попытку позднее.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={cn('grid gap-4', className)} {...props}>
      <Form {...form}>
        <form className="flex flex-col space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            control={form.control}
            name="branch"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Версия</FormLabel>
                <FormCombobox
                  name={field.name}
                  value={field.value}
                  placeholder="Выберите версию"
                  placeholderInputSearch="Поиск версии"
                  options={branches && branches.map(({ version }) => version) || []}
                  setValue={form.setValue}
                />
                {form.formState.errors.branch && (
                  <FormMessage>{form.formState.errors.branch.message}</FormMessage>
                )}
              </FormItem>
            )}
          />

          <Controller
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Введите URL к API</FormLabel>
                <FormControl>
                  <Input placeholder="Введите URL к API" {...field} />
                </FormControl>
                {form.formState.errors.host && (
                  <FormMessage>{form.formState.errors.host.message}</FormMessage>
                )}
              </FormItem>
            )}
          />

          <Controller
            control={form.control}
            name="folder"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Введите название папки</FormLabel>
                <FormControl>
                  <Input placeholder="Введите название папки" {...field} />
                </FormControl>
                {form.formState.errors.folder && (
                  <FormMessage>{form.formState.errors.folder.message}</FormMessage>
                )}
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Уже скачали эту версию? Обновите её исходники из ANDLINE master без удаления папки.
              Настройки подключения сохранятся; прежние исходники останутся для отката.
            </p>
            <div className="flex flex-wrap justify-end items-center gap-3">
            {isDownload && (
              <div className="w-full flex flex-col gap-y-1">
                <p className="text-gray-700 dark:text-gray-200 text-sm">
                  Загрузка завершена на {percent}% из 100%
                </p>
                <Progress className="h-2" value={percent}/>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={isDownload || isRefreshing || !connectionHub}
              onClick={refreshSource}
            >
              {isRefreshing && <Icons.spinner className="mr-2 h-4 w-4 animate-spin"/>}
              Обновить исходники
            </Button>
            <Button className="w-fit" disabled={isDownload || isRefreshing || !form.formState.isDirty}>
              {isDownload && <Icons.spinner className="mr-2 h-4 w-4 animate-spin"/>}
              Скачать исходники
            </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
