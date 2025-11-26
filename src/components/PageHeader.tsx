// src/components/PageHeader.tsx
'use client';

interface PageHeaderProps {
  badge?: string;
  title: string;
  description?: string;
  className?: string;
}

export default function PageHeader({ badge, title, description, className = '' }: PageHeaderProps) {
  return (
    <header className={`bg-brand-dark text-white pt-20 pb-24 relative overflow-hidden ${className}`}>
      {/* Dot Pattern Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
        {badge && (
          <span className="inline-block text-brand-red font-marker text-xl mb-4 transform -rotate-2">
            {badge}
          </span>
        )}
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
          {title}
        </h1>
        {description && (
          <p className="text-gray-400 text-xl font-medium max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
