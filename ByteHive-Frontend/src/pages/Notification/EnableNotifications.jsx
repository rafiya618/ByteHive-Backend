import React from 'react'
import Layout from '../../components/Layout/Layout'
import { registerPush } from '../../helpers/registerPush'
import { useAuth } from '../../context/auth'

const EnableNotifications = () => {
    const {auth} = useAuth()
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-5">
        <h1 className="text-3xl font-bold mb-6">Enable Notifications</h1>
        <button
          onClick={() => registerPush(auth.user._id)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold transition-colors cursor-pointer"
        >
          Enable Notifications
        </button>
      </div>
    </Layout>
  )
}

export default EnableNotifications;
