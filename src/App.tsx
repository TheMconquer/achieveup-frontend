import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RequireRole from './components/common/RequireRole';
import RoleHome from './components/common/RoleHome';
import PageLoading from './components/common/PageLoading';
import RouteAnnouncer from './components/common/RouteAnnouncer';

// Route pages load on demand, so each role only downloads the screens it can open.
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentCourses = lazy(() => import('./pages/StudentCourses'));
const StudentCourseDetail = lazy(() => import('./pages/StudentCourseDetail'));
const StudentSkills = lazy(() => import('./pages/StudentSkills'));
const StudentSkillVideos = lazy(() => import('./pages/StudentSkillVideos'));
const StudentBadges = lazy(() => import('./pages/StudentBadges'));
const Settings = lazy(() => import('./pages/Settings'));
const StudentProgress = lazy(() => import('./pages/StudentProgress'));
const SkillMatrixCreator = lazy(() => import('./components/SkillMatrixCreator/SkillMatrixCreator'));
const SkillAssignmentInterface = lazy(
  () => import('./components/SkillAssignmentInterface/SkillAssignmentInterface')
);
const SkillVideoCurator = lazy(() => import('./pages/SkillVideoCurator'));
const StudentPublicBadges = lazy(() => import('./pages/StudentPublicBadges'));

// Supports deep-linking from search: /skill-matrix?courseId=123
const SkillMatrixRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  return <SkillMatrixCreator courseId={searchParams.get('courseId') ?? undefined} />;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Public routes - no login required */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/badges/share/:shareId" element={<StudentPublicBadges />} />

        {/* Either role - just needs to be logged in */}
        <Route element={<RequireRole roles={['student', 'instructor']} />}>
          <Route path="/" element={<RoleHome />} />
          <Route
            path="/settings"
            element={
              <Layout>
                <Settings />
              </Layout>
            }
          />
        </Route>

        {/* Instructor only */}
        <Route element={<RequireRole roles={['instructor']} />}>
          <Route
            path="/instructor-dashboard"
            element={
              <Layout>
                <InstructorDashboard />
              </Layout>
            }
          />
          <Route
            path="/skill-matrix"
            element={
              <Layout>
                <SkillMatrixRoute />
              </Layout>
            }
          />
          <Route
            path="/skill-assignment"
            element={
              <Layout>
                <SkillAssignmentInterface />
              </Layout>
            }
          />
          <Route
            path="/progress"
            element={
              <Layout>
                <StudentProgress />
              </Layout>
            }
          />
          <Route
            path="/skill-videos"
            element={
              <Layout>
                <SkillVideoCurator />
              </Layout>
            }
          />
        </Route>

        {/* Student only */}
        <Route element={<RequireRole roles={['student']} />}>
          <Route
            path="/student-dashboard"
            element={
              <Layout>
                <StudentDashboard />
              </Layout>
            }
          />
          <Route
            path="/courses"
            element={
              <Layout>
                <StudentCourses />
              </Layout>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <Layout>
                <StudentCourseDetail />
              </Layout>
            }
          />
          <Route
            path="/skills"
            element={
              <Layout>
                <StudentSkills />
              </Layout>
            }
          />
          <Route
            path="/badges"
            element={
              <Layout>
                <StudentBadges />
              </Layout>
            }
          />
          <Route
            path="/my-skill-videos"
            element={
              <Layout>
                <StudentSkillVideos />
              </Layout>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <RouteAnnouncer />
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
