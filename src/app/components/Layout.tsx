import { Outlet } from 'react-router';
import { AbstractBackground } from './AbstractBackground';

export function Layout() {
  return (
    <div className="min-h-screen text-foreground relative">
      <AbstractBackground />
      <Outlet />
    </div>
  );
}