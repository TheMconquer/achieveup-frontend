import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/* 
This component is used as part of the authentication / routing system. 
It checks if the user is authenticated and has the required role(s) to access a specific route.
*/

function RequireRole({ roles }: { roles?: Array<'student' | 'instructor'> }) {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!user!.role) {
    logout();
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.some((r) => r === user!.role)) {
    return (
      <Navigate
        to={user!.role === 'instructor' ? '/instructor-dashboard' : '/settings'}
        replace
      />
    );
  }
  return <Outlet />;
}

export default RequireRole;
