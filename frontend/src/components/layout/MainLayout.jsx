import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const MainLayout = ({ children }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="relative flex min-h-screen flex-col bg-primary-50">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-primary-200 bg-white/60 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C13.1046 2 14 2.89543 14 4C14 5.10457 13.1046 6 12 6C10.8954 6 10 5.10457 10 4C10 2.89543 10.8954 2 12 2Z"
                fill="currentColor"
              />
              <path
                d="M12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z"
                fill="currentColor"
              />
              <path
                d="M12 18C13.1046 18 14 18.8954 14 20C14 21.1046 13.1046 22 12 22C10.8954 22 10 21.1046 10 20C10 18.8954 10.8954 18 12 18Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-primary-800">Loan Application</h2>
        </motion.div>

        <div className="flex flex-1 items-center justify-end gap-4">
          <nav className="hidden md:flex items-center gap-6">
            {[
              { path: '/', name: 'Home' },
              { path: '/upload-model', name: 'Upload Model' },
              { path: '/loan-form', name: 'Loan Form' },
              { path: '/results', name: 'Results' },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {item.name}
                {isActive(item.path) && (
                  <motion.div
                    layoutId="nav-underline"
                    className="h-0.5 bg-primary-600 mt-1"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition-colors hover:bg-primary-200">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16.78 15.4C16.78 15.4 16.13 16.75 14.22 16.75C12.31 16.75 12.25 15.4 10.25 15.4C8.25 15.4 7.91 16.75 6.22 16.75C4.54 16.75 3.22 15.4 3.22 15.4C3.22 15.4 4.54 14.05 4.54 12C4.54 9.95 6.49 8 8.54 8C10.59 8 11.25 9.7 12 9.7C12.75 9.7 13.41 8 15.46 8C17.51 8 19.46 9.95 19.46 12C19.46 14.05 20.78 15.4 20.78 15.4Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
              <img
                src="https://randomuser.me/api/portraits/women/44.jpg"
                alt="User"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
