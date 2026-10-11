import { useContext } from 'react';
import { AuthCtx } from './AuthContext';

// The one place that turns a user's account role into booleans. The server
// reads the role live from the database (authMiddleware), so /auth/me is the
// truth; components must not compare `user.role` strings themselves.
//   isAdmin - Storyteller
//   isCourt - admin OR court user (anything a court user may do, admins may too)
export function roleFlags(user) {
  const isAdmin = user?.role === 'admin';
  return { isAdmin, isCourt: isAdmin || user?.role === 'courtuser' };
}

export default function useRole() {
  const { user } = useContext(AuthCtx) || {};
  return roleFlags(user);
}
