import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { SESSION_TOKEN_KEY } from "@shared/const";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

function getStoredUser() {
  try {
    const raw = localStorage.getItem("manus-runtime-user-info");
    if (!raw || raw === "undefined" || raw === "null") return undefined;
    return JSON.parse(raw) ?? undefined;
  } catch {
    return undefined;
  }
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const [storedUser] = useState(getStoredUser);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: storedUser,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // đã hết session — tiếp tục cleanup
      } else {
        throw error;
      }
    } finally {
      localStorage.removeItem("manus-runtime-user-info");
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      utils.auth.me.setData(undefined, null);
      window.location.href = "/";
    }
  }, [logoutMutation, utils]);

  useEffect(() => {
    if (!meQuery.isPlaceholderData) {
      if (meQuery.data) {
        localStorage.setItem("manus-runtime-user-info", JSON.stringify(meQuery.data));
      } else {
        // Server xác nhận không đăng nhập → xóa cache cũ để tránh flash lần sau
        localStorage.removeItem("manus-runtime-user-info");
      }
    }
    if (meQuery.error) {
      localStorage.removeItem("manus-runtime-user-info");
    }
  }, [meQuery.data, meQuery.isPlaceholderData, meQuery.error]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: (meQuery.isLoading && !meQuery.isPlaceholderData) || logoutMutation.isPending,
      // true sau khi server đã xác nhận trạng thái auth (không còn dùng placeholder)
      isAuthReady: !meQuery.isPlaceholderData && !meQuery.isLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    meQuery.isPlaceholderData,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };

}
