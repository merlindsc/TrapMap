export default function Card({ children, className = '', hover = false }) {
    const hoverClass = hover ? 'hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer' : '';
    
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${hoverClass} ${className}`}>
        {children}
      </div>
    );
  }
  
  export function CardHeader({ children, className = '' }) {
    return <div className={`mb-4 ${className}`}>{children}</div>;
  }
  
  export function CardTitle({ children, className = '' }) {
    return <h3 className={`text-xl font-bold text-white ${className}`}>{children}</h3>;
  }
  
  export function CardDescription({ children, className = '' }) {
    return <p className={`text-sm text-gray-400 ${className}`}>{children}</p>;
  }
  
  export function CardContent({ children, className = '' }) {
    return <div className={className}>{children}</div>;
  }
  
  export function CardFooter({ children, className = '' }) {
    return <div className={`mt-6 ${className}`}>{children}</div>;
  }