import React from 'react'
import { MessageCircle, Bell, ChevronDown } from 'lucide-react'

function Header() {
  return (
    <header className="flex fixed top-0 left-60 right-0 z-50  items-center  justify-between bg-white px-6 py-4 border-b border-gray-200 shadow-lg">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600">Most useful analytics in this page</p>
      </div>

      <div className="flex items-center space-x-6">
        <div className="relative border  border-gray-400 p-2 rounded-full">
          <Bell className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer "/>
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-red-500 rounded-full">
            1
          </span>
        </div>

        <div className="relative border border-gray-400 p-2 rounded-full">
          <MessageCircle className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer"/>
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-red-500 rounded-full">
            3
          </span>
        </div>

        <div className="flex items-center space-x-2 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facepad&facepad=2&w=256&h=256&q=80"
            alt="User avatar"
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-gray-900">Demo User</span>
            <span className="text-xs text-gray-500">Demo.User@gmail.com</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </div>
      </div>
    </header>
  )
}

export default Header
