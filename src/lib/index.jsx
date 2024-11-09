import React, { useReducer, useRef } from 'react';

const context = React.createContext();

export function QueryClientProvider({ children, client }) {
  return <context.Provider value={client}>{children}</context.Provider>;
}

export class QueryClient {
  constructor() {
    this.queries = [];
  }

  getQuery = (options) => {
    const queryHash = JSON.stringify(options.queryKey);

    let query = this.queries.find((q) => q.queryHash === queryHash);

    if (!query) {
      query = createQuery(this, options);
      this.queries.push(query);
    }

    return query;
  };
}

function createQuery(client, { queryKey, queryFn }) {
  let query = {
    queryKey,
    queryHash: JSON.stringify(queryKey),
    promise: null,
    state: {
      status: 'loading',
      isFetching: true,
      data: undefined,
      error: undefined,
    },
    subscribers: [],
    setState: (updater) => {
      query.state = updater(query.state);
      query.subscribers.forEach((sub) => sub.notify());
    },
    subscribe: (subscriber) => {
      query.subscribers.push(subscriber);

      return () => {
        query.subscribers = query.subscribers.filter(
          (sub) => sub !== subscriber,
        );
      };
    },
    fetch: () => {
      if (!query.promise) {
        query.promise = (async () => {
          query.setState((old) => ({
            ...old,
            isFetching: true,
            error: undefined,
          }));
          try {
            const data = await queryFn();
            query.setState((old) => ({
              ...old,
              status: 'success',
              data,
            }));
          } catch (e) {
            query.setState((old) => ({
              ...old,
              status: 'error',
              e,
            }));
          } finally {
            query.promise = null;
            query.setState((old) => ({
              ...old,
              isFetching: false,
            }));
          }
        })();
      }

      return query.promise;
    },
  };

  return query;
}

export function createQueryObserver(client, { queryKey, queryFn }) {
  const query = client.getQuery({ queryKey, queryFn });

  const observer = {
    notify: () => {},
    getResult: () => query.state,
    subscribe: (cb) => {
      // чаще всего в качестве cb будет выступать
      // функция обеспечивающая ререндер
      observer.notify = cb;
      const unsub = query.subscribe(observer);

      query.fetch();

      return unsub;
    },
  };

  return observer;
}

export function useQuery({ queryKey, queryFn }) {
  const client = React.useContext(context);

  const [, rerender] = useReducer((v) => v + 1, 0);

  const observerRef = useRef();

  if (!observerRef.current) {
    observerRef.current = createQueryObserver(client, { queryKey, queryFn });
  }

  React.useEffect(() => {
    return observerRef.current.subscribe(rerender);
  }, []);

  return observerRef.current.getResult();
}
