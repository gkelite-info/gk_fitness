# React Query & Caching Guidelines for GK Fitness

This document outlines the standard pattern for data fetching, caching, and state management in the GK Fitness application using **React Query** (`@tanstack/react-query`).

By following these guidelines, you ensure that the app remains fast, works offline, and avoids redundant network requests.

---

## 1. Core Principles

- **No more `useEffect` for data fetching:** Do not use `useEffect` and `useState` to manually track `loading`, `error`, or `data` states.
- **Custom Hooks:** All Supabase queries must be encapsulated inside custom React hooks (e.g., `useCustomers.ts`, `useMemberships.ts`) located in the `/hooks` directory.
- **Offline Persistence:** The cache is persisted automatically to `AsyncStorage`. If a user opens the app without the internet, they will see the last loaded data.
- **Cache Invalidation:** Always use `CustomRefreshControl` for pull-to-refresh interactions to invalidate the cache and fetch fresh data.

---

## 2. How to Fetch Data (Queries)

When you need to fetch a list of items or a single item, create a custom hook using `useQuery` or `useInfiniteQuery`.

### Example: Fetching a Simple List (`useQuery`)
Create a new file in `hooks/useMemberships.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useMemberships(gymId: string | null) {
  return useQuery({
    // 1. Unique query key array (if gymId changes, it automatically refetches)
    queryKey: ['memberships', gymId], 
    
    // 2. The async fetching function
    queryFn: async () => {
      if (!gymId) throw new Error('Gym ID is required');

      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('gymId', gymId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data;
    },
    
    // 3. Optional configurations
    enabled: !!gymId, // Will not fetch until gymId is available
  });
}
```

### Consuming the Hook in a Component
Inside your screen/component (e.g., `membership/index.tsx`):

```tsx
import { useMemberships } from '@/hooks/useMemberships';
import { ActivityIndicator, Text } from 'react-native';

export default function MembershipScreen({ gymId }) {
  // Use the hook
  const { data: memberships, isLoading, isError, error } = useMemberships(gymId);

  if (isLoading) return <ActivityIndicator />;
  if (isError) return <Text>Error: {error.message}</Text>;

  return (
    <FlatList 
      data={memberships}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  );
}
```

---

## 3. Infinite Scrolling (`useInfiniteQuery`)

For large lists (like Customers or Trainers), use `useInfiniteQuery`. See `hooks/useCustomers.ts` as a reference.

When consuming an infinite query in a `FlatList`:
- Use `data.pages.flatMap(page => page.data)` to flatten the array.
- Use `onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}`.

---

## 4. Pull-to-Refresh Setup

Always use the shared `CustomRefreshControl` component for consistency and to trigger a background cache refresh.

```tsx
import { useState } from 'react';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

// ... inside your component
const { refetch } = useMemberships(gymId);
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = async () => {
  setRefreshing(true);
  await refetch();
  setRefreshing(false);
};

<FlatList
  // ... other props
  refreshControl={
    <CustomRefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  }
/>
```

---

## 5. Mutating Data (Create, Update, Delete)

When you modify data, you must tell React Query to invalidate the old cache so it knows to fetch the fresh data. Use `useMutation` for this.

### Example: Adding a Membership

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useAddMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newMembership) => {
      const { data, error } = await supabase
        .from('memberships')
        .insert([newMembership])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // 🎯 CRITICAL: Invalidate the cache so the list screen updates immediately!
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}
```

### Consuming the Mutation

```tsx
import { useAddMembership } from '@/hooks/useAddMembership';

export default function AddMembershipForm() {
  const mutation = useAddMembership();

  const handleSave = () => {
    mutation.mutate({ name: 'Gold Plan', price: 99, gymId: '123' }, {
      onSuccess: () => {
        router.back(); // Navigate back on success
      },
      onError: (error) => {
        toast.error('Failed to save');
      }
    });
  };

  return (
    <Button 
      onPress={handleSave} 
      disabled={mutation.isPending} // Show loading state
    >
      Save
    </Button>
  );
}
```

---

## Summary Checklist for New Screens:
1. [ ] Did I create a custom hook (`useQuery` / `useInfiniteQuery`) for fetching?
2. [ ] Am I using `CustomRefreshControl` for pull-to-refresh?
3. [ ] If I am saving/editing data, am I using `useMutation`?
4. [ ] Does my mutation call `queryClient.invalidateQueries()` on success?
