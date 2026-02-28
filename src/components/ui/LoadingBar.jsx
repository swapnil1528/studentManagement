/**
 * LoadingBar — Top progress bar shown during API calls.
 * Usage: Import { setLoading } and call setLoading(true/false).
 * Include <LoadingBar /> once in App.jsx.
 */

import { useState, useEffect, useCallback } from 'react';

let globalSetLoading = () => { };

export function setLoading(show) {
    globalSetLoading(show);
}

export default function LoadingBar() {
    const [width, setWidth] = useState('0');

    const handleLoading = useCallback((show) => {
        if (show) {
            setWidth('70%');
        } else {
            setWidth('100%');
            setTimeout(() => setWidth('0'), 200);
        }
    }, []);

    useEffect(() => {
        globalSetLoading = handleLoading;
    }, [handleLoading]);

    return (
        <div className="loading-bar">
            <div className="bar" style={{ width }} />
        </div>
    );
}
