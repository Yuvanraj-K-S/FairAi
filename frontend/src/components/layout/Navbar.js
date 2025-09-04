import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiFileText, FiBarChart2, FiUser } from 'react-icons/fi';

function Navbar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: <FiHome className="mr-2" />, label: 'Home' },
    { path: '/loan', icon: <FiFileText className="mr-2" />, label: 'Loan Approval Model' },
    { path: '/facial-upload', icon: <FiUser className="mr-2" />, label: 'Facial Recognition Model' },
    { path: '/results', icon: <FiBarChart2 className="mr-2" />, label: 'Results' },
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                FairAI
              </span>
            </div>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600 hover:border-b-2 hover:border-blue-100'
                  }`}
                >
                  {React.cloneElement(item.icon, {
                    className: 'mr-2 h-5 w-5'
                  })}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition-colors duration-200">
              <FiUser className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
