import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoginInput, RegisterInput, UserResponse } from "@deep-notes/shared";
import { api, jsonBody } from "@/lib/api";

export const authQueryKey = ["auth", "me"] as const;

export function useAuthMe() {
  return useQuery({
    queryKey: authQueryKey,
    queryFn: () => api<UserResponse>("/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api<UserResponse>("/auth/login", jsonBody("POST", input)),
    onSuccess: (user) => queryClient.setQueryData(authQueryKey, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api<UserResponse>("/auth/register", jsonBody("POST", input)),
    onSuccess: (user) => queryClient.setQueryData(authQueryKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ loggedOut: true }>("/auth/logout", jsonBody("POST")),
    onSettled: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
    },
  });
}
