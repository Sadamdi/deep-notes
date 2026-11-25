import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError, api } from "@/lib/api";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  course: string | null;
  lookingForPartners: boolean;
};

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await api<CurrentUser>("/auth/me");
      } catch (err) {
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
          return null;
        }
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => api<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null);
      void queryClient.invalidateQueries();
    },
  });

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isPending,
    isAuthenticated: Boolean(meQuery.data),
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    refreshAuth: () => queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
  };
}
