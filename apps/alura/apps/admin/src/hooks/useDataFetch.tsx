import axios, { type CancelTokenSource } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";


export default function useDataFetch<TArgs extends object>(autoExecute: boolean, url: string | undefined, args?: string) {
    const [data, setData] = useState<TArgs | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const isMounted = useRef(true);
    const cancelSourceRef = useRef<CancelTokenSource | null>(null);

    useEffect(() => {
        isMounted.current = true;
        return () => {
        isMounted.current = false;
        if (cancelSourceRef.current) {
            cancelSourceRef.current.cancel('Component unmounted.');
            console.warn('Request cancelled due to unmount.');
        }
        };
    }, []);

    const sendData = useCallback(async (params: string = '') => {
        if (!isMounted.current || !url) return;

        const finalUrl = params ? `${url}?${params}` : url;

        setLoading(true);
        setError(null);

        const source = axios.CancelToken.source();
        cancelSourceRef.current = source;

        try {
            const response = await axios.get(finalUrl, {
                withCredentials: true,
                cancelToken: source.token,
            });

            if (isMounted.current) {
                setData(response.data);
                // console.log("executed!");
            }
        } catch (err) {
            if (axios.isCancel(err)) {
                console.warn('Request canceled:', err.message);
            } else if (isMounted.current) {
                setError(err instanceof Error ? err : new Error("Unknown error"));
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                cancelSourceRef.current = null;
            }
        }
    }, [url]);

    useEffect(() => {
        if (autoExecute && url !== undefined) {
            sendData(args ?? '');
        }
    }, [autoExecute, url, args, sendData]);

    return { data, loading, error, sendData };
}