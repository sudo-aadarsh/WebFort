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

export const Card = ({ children, className = '', hoverable = false, style = {}, ...props }) => {
  const baseStyle = {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    ...style
  };
  
  return (
    <div className={`card ${hoverable ? 'card-hover' : ''} ${className}`} style={baseStyle} {...props}>
      {children}
    </div>
  );
};

export const Panel = ({ children, className = '', style = {}, ...props }) => {
  const baseStyle = {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    ...style
  };
  
  return (
    <div className={`panel ${className}`} style={baseStyle} {...props}>
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
    <div className="card stat-box animate-fade-in hover-lift" style={{ padding: '1.25rem', cursor: 'default' }}>
      <div className="stat-header" style={{ marginBottom: '0.5rem' }}>
        <div>
          <div className="stat-title" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>{title}</div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>{value}</div>
        </div>
        <div className={`stat-icon-wrapper bg-${colorClass.replace('text-', '')}`} style={{ padding: '0.625rem', borderRadius: '12px', background: `var(--${colorClass.replace('text-', '')}-container)`, color: `var(--${colorClass.replace('text-', '')})` }}>
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <div style={{ fontSize: '0.75rem', color: trendColor, display: 'flex', alignItems: 'center', marginTop: '0.25rem', fontWeight: 600 }}>
          <span style={{ marginRight: '0.25rem' }}>{trendIcon} {Math.abs(trend)}%</span> 
          <span style={{ opacity: 0.7, fontWeight: 400 }}>vs last week</span>
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
