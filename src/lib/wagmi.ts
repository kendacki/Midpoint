"use client";

import { QueryClient } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi-config";

export { wagmiConfig };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
    },
  },
});
