import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAboutSections, getTeamMembers, getUsers } from '../../services/apiService';

/**
 * Admin home page
 * Displays summary information and quick links
 */
const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [aboutCount, setAboutCount] = useState<number>(0);
  const [teamCount, setTeamCount] = useState<number>(0);
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const dataFetchedRef = useRef<boolean>(false);

  // Fetch summary data
  useEffect(() => {
    // Skip if data has already been fetched or user is not available
    if (dataFetchedRef.current || !user) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Use Promise.all to fetch data in parallel
        const [aboutSections, teamMembers] = await Promise.all([
          getAboutSections(),
          getTeamMembers()
        ]);
        
        setAboutCount(aboutSections.length);
        setTeamCount(teamMembers.length);
        
        // Fetch users (if admin)
        if (user?.isAdmin) {
          const users = await getUsers();
          setUserCount(users.length);
        }
        
        // Mark data as fetched
        dataFetchedRef.current = true;
      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  // Dashboard cards
  const cards = [
    {
      title: 'About Sections',
      count: aboutCount,
      description: 'Manage the content of the About page',
      link: '/admin/about',
      color: 'bg-blue-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      title: 'Team Members',
      count: teamCount,
      description: 'Manage team member profiles',
      link: '/admin/team',
      color: 'bg-green-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: 'Users',
      count: userCount,
      description: 'Manage user accounts and permissions',
      link: '/admin/users',
      color: 'bg-purple-600',
      adminOnly: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user?.firstName}! Here's an overview of your content.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards
            .filter((card) => !card.adminOnly || user?.isAdmin)
            .map((card) => (
              <Link
                key={card.title}
                to={card.link}
                className="block bg-white overflow-hidden rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-indigo-300"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 rounded-md p-3 ${card.color} text-white`}>
                      {card.icon}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-lg font-medium text-gray-900 truncate">{card.title}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-3xl font-semibold text-indigo-600">{card.count}</div>
                      </dd>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                  <div className="text-sm">
                    <div className="font-medium text-indigo-600 hover:text-indigo-700 flex items-center">
                      <span>{card.description}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1.5 h-4 w-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}

      <div className="mt-10 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Tips</h3>
          <p className="mt-1 text-sm text-gray-500">
            {user?.isAdmin ? 'How to manage your website content and users' : 'How to manage your website content'}
          </p>
        </div>
        <div>
          <dl>
            <div className="bg-gray-50 px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-900">About Sections</dt>
              <dd className="mt-1 text-sm text-gray-600 sm:mt-0 sm:col-span-2">
                Edit the content of your About page, including your story, mission, and values. You can add, edit, and reorder sections to create a compelling narrative about your organization.
              </dd>
            </div>
            {user?.isAdmin && (
              <div className="bg-white px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-900">Projects</dt>
                <dd className="mt-1 text-sm text-gray-600 sm:mt-0 sm:col-span-2">
                  Manage your portfolio projects, including titles, descriptions, and images. You can add new projects, edit existing ones, and reorder them to showcase your best work.
                </dd>
              </div>
            )}
            <div className={`${user?.isAdmin ? 'bg-gray-50' : 'bg-white'} px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4`}>
              <dt className="text-sm font-medium text-gray-900">Team Members</dt>
              <dd className="mt-1 text-sm text-gray-600 sm:mt-0 sm:col-span-2">
                Manage your team profiles, including names, titles, bios, and photos. Keep your team information up to date and showcase your organization's talent.
              </dd>
            </div>
            {user?.isAdmin && (
              <>
                <div className="bg-gray-50 px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-900">Users</dt>
                  <dd className="mt-1 text-sm text-gray-600 sm:mt-0 sm:col-span-2">
                    Manage user accounts and admin permissions. Create new users, modify existing ones, and control access levels to maintain security.
                  </dd>
                </div>
                <div className="bg-white px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-900">Settings</dt>
                  <dd className="mt-1 text-sm text-gray-600 sm:mt-0 sm:col-span-2">
                    Configure site-wide settings, including visual assets, general settings, and content translations. Customize your website's appearance and functionality.
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 