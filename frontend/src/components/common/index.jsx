import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading = false, 
  icon: Icon,
  ...props 
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${className}`}
      disabled={isLoading || props.disabled}
      style={{ opacity: isLoading ? 0.8 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', glass = true, ...props }) => {
  return (
    <div className={`${glass ? 'glass-card' : 'glass-panel'} ${className}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }} {...props}>
      {children}
    </div>
  );
};

export const Badge = ({ children, severity = 'info', className = '' }) => {
  return (
    <span className={`badge badge-${severity} ${className}`}>
      {children}
    </span>
  );
};

export const StatsCard = ({ title, value, icon: Icon, trend, colorClass = 'text-primary' }) => {
  const isPositive = trend > 0;
  const trendColor = isPositive ? 'var(--critical)' : 'var(--success)';
  const trendIcon = isPositive ? '↑' : '↓';
  
  return (
    <div className="glass-card stat-box animate-fade-in">
      <div className="stat-header">
        <div>
          <div className="stat-title">{title}</div>
          <div className="stat-value">{value}</div>
        </div>
        <div className={`stat-icon-wrapper bg-${colorClass.replace('text-', '')}`} style={{ background: `var(--${colorClass.replace('text-', '')})`, color: 'white', opacity: 0.9 }}>
          <Icon size={24} />
        </div>
      </div>
      {trend && (
        <div style={{ fontSize: '0.875rem', color: trendColor, display: 'flex', alignItems: 'center', marginTop: 'auto', fontWeight: 500 }}>
          {trendIcon} {Math.abs(trend)}% from last week
        </div>
      )}
    </div>
  );
};

export const Input = React.forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input ref={ref} className={`form-input ${className}`} style={{ borderColor: error ? 'var(--critical)' : '' }} {...props} />
      {error && <div style={{ color: 'var(--critical)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</div>}
    </div>
  );
});
