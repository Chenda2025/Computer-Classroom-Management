'use client';
import { useState } from 'react';

export default function RecentStudentAvatar({ id, name, className, style }: { id: string; name: string; className?: string; style?: React.CSSProperties }) {
  const [error, setError] = useState(false);
  if (error) {
    return <div className={className} style={style}>{name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'}</div>;
  }
  return (
    <img
      src={`/api/students/${id}/photo`}
      alt={name}
      className={className}
      style={{ ...style, objectFit: 'cover' }}
      onError={() => setError(true)}
    />
  );
}
