import { useRef, useEffect, useState } from 'react';

export default function CameraCapture({ onCapture, onCancel }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [error, setError] = useState('');
    const [stream, setStream] = useState(null);

    // Initialize camera stream
    useEffect(() => {
        let activeStream = null;
        async function startCamera() {
            try {
                // Request camera with front-facing preference
                activeStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false
                });
                setStream(activeStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = activeStream;
                }
            } catch (err) {
                console.error("Camera error:", err);
                setError('Camera access denied or device not found.');
            }
        }
        startCamera();

        // Cleanup function to stop tracks when component unmounts
        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current || !stream) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // --- DRAW TIMESTAMP OVERLAY ---
        const now = new Date();
        const timestampStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        // Build a semi-transparent background bar for the text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

        // Add text
        ctx.font = '20px Arial';
        ctx.fillStyle = '#ffffff'; // White text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Recorded at: ${timestampStr}`, canvas.width / 2, canvas.height - 20);

        // Convert the painted canvas to a base64 JPEG
        const base64Data = canvas.toDataURL('image/jpeg', 0.8); // 80% quality

        // Stop stream before popping component
        stream.getTracks().forEach(track => track.stop());

        onCapture(base64Data);
    };

    const handleCancel = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        onCancel();
    };

    return (
        <div className="flex flex-col items-center bg-gray-900 rounded-xl overflow-hidden shadow-lg p-4">
            {error ? (
                <div className="text-red-400 p-4 text-center">
                    <i className="fas fa-exclamation-triangle block text-3xl mb-2"></i>
                    {error}
                </div>
            ) : (
                <div className="relative w-full max-w-[400px]">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-auto rounded-lg shadow-inner bg-black"
                        style={{ transform: 'scaleX(-1)' }} // Mirror the view for users
                    ></video>
                    {/* Hidden canvas used explicitly for processing the image capture */}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
            )}

            <div className="flex gap-4 mt-4 w-full justify-center">
                <button
                    onClick={handleCancel}
                    className="px-6 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleCapture}
                    disabled={!!error || !stream}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition disabled:opacity-50 flex items-center gap-2"
                >
                    <i className="fas fa-camera"></i> Capture Photo
                </button>
            </div>
        </div>
    );
}
