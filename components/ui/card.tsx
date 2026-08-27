import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`adm-card ${className}`.trim()} {...props} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="adm-card-header">
      <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
      {action ? <div className="adm-card-action">{action}</div> : null}
    </div>
  );
}

export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`adm-card-content ${className}`.trim()} {...props} />;
}
