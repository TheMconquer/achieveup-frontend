import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
/*
This component is to determine the proper home page for the user based on their role. 
*/

const RoleHome: React.FC = () => {
  const { user } = useAuth();
  return (
    <Navigate
      to={user?.role === 'instructor' ? '/instructor-dashboard' : '/student-dashboard'}
      replace
    />
  );
};

export default RoleHome;
