/**
 * Modal — Reusable modal dialog with backdrop.
 * Props:
 *   isOpen   - boolean to show/hide
 *   onClose  - callback to close the modal
 *   title    - header text
 *   width    - optional Tailwind width class (default: 'w-96')
 *   children - modal body content
 */

export default function Modal({ isOpen, onClose, title, width = 'w-96', children }) {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className={`bg-white p-6 rounded-lg ${width} shadow-2xl max-h-[90vh] overflow-y-auto relative`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    className="absolute top-2 right-3 text-gray-400 hover:text-red-500 text-xl font-bold"
                    onClick={onClose}
                >
                    ×
                </button>

                {/* Title */}
                {title && (
                    <h3 className="font-bold text-xl mb-4 border-b pb-2 text-gray-800">{title}</h3>
                )}

                {/* Body */}
                {children}
            </div>
        </div>
    );
}
