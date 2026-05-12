'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { Phi, ProjectMetadata } from '@qr-bc/shared';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  type ListProjectsParams,
  type UpdateProjectPayload,
} from './api-client';

export function useProjects(
  opts: {
    params?: ListProjectsParams;
    enabled?: boolean;
  } = {},
): ReturnType<typeof useQuery<{ items: ProjectMetadata[]; total: number }>> {
  const { data: session } = useSession();
  const accessToken = session?.accessToken ?? '';
  return useQuery({
    queryKey: ['projects', accessToken, opts.params ?? {}],
    queryFn: () => listProjects(accessToken, opts.params ?? {}),
    enabled: (opts.enabled ?? true) && Boolean(accessToken),
  });
}

export function useProject(
  phi: Phi | undefined,
): ReturnType<typeof useQuery<ProjectMetadata & { _version?: number }>> {
  const { data: session } = useSession();
  const accessToken = session?.accessToken ?? '';
  return useQuery({
    queryKey: ['project', accessToken, phi],
    queryFn: () => getProject(accessToken, phi as Phi),
    enabled: Boolean(accessToken && phi),
  });
}

export function useCreateProject(): ReturnType<
  typeof useMutation<ProjectMetadata, Error, Parameters<typeof createProject>[1]>
> {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createProject(session?.accessToken ?? '', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(): ReturnType<
  typeof useMutation<ProjectMetadata, Error, { phi: Phi; payload: UpdateProjectPayload }>
> {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ phi, payload }) => updateProject(session?.accessToken ?? '', phi, payload),
    onSuccess: (_data, { phi }) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Match any ['project', token, phi] regardless of token value.
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'project' && q.queryKey[2] === phi,
      });
    },
  });
}

export function useDeleteProject(): ReturnType<typeof useMutation<void, Error, Phi>> {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phi) => deleteProject(session?.accessToken ?? '', phi),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
