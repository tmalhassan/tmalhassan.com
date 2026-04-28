import { useCallback, useEffect, useRef, useState } from "react";
import axios, { type CancelTokenSource, type AxiosResponse } from "axios";

export default function useDataSend<T = unknown>() {
    const [data, setData] = useState<T | null>(null);
    const [statusCode, setStatusCode] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
  
    // Track if component is mounted
    const isMounted = useRef(true);
  
    // Store cancel token source so we can cancel on unmount
    const cancelSourceRef = useRef<CancelTokenSource | null>(null);
  
    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (cancelSourceRef.current) {
                cancelSourceRef.current.cancel('Component unmounted.');
                console.warn('Request cancelled due to unmount.');
            }
        };
    }, []);
  
    const sendData = useCallback(async (method: string, url: string, reqData: FormData | object) => {
        setLoading(true);
        setError(null);
    
        const source = axios.CancelToken.source();
        cancelSourceRef.current = source;
            
        const isFormData = reqData instanceof FormData;

        let response: AxiosResponse<T>;

        try {

            switch (method) {
                case 'POST':
                    response = await axios.post<T>(url, reqData, {
                        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
                        withCredentials: true,
                        cancelToken: source.token,
                    });
                    break;
                case 'PUT':
                    response = await axios.put<T>(url, reqData, {
                        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
                        withCredentials: true,
                        cancelToken: source.token,
                    });
                    break;
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }

            if (isMounted.current) {
                setData(response.data);
                setStatusCode(response.status);
                return response;
            }
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                setData(err.response.data as T);
            } else if (err instanceof Error) {
                setError(err);
            } else {
                setError(new Error('Unknown error'));
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, []);

    return { data, statusCode, loading, error, sendData };
}
