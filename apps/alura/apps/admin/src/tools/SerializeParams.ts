export default function serializeParams(params: object) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach(val => {
                if (val !== undefined && val !== null) {
                    searchParams.append(key, val);
                }
            });
        } else if (value !== undefined && value !== null) {
            searchParams.set(key, value);
        }
    });

    return searchParams.toString();
}