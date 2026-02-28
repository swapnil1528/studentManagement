/**
 * Badge — Status badge with color variants.
 * Props:
 *   text    - Badge text
 *   variant - 'green' | 'blue' | 'yellow' | 'red'
 */

const variants = {
    green: 'b-green',
    blue: 'b-blue',
    yellow: 'b-yellow',
    red: 'b-red',
};

export default function Badge({ text, variant = 'blue' }) {
    return (
        <span className={`badge ${variants[variant] || variants.blue}`}>
            {text}
        </span>
    );
}
