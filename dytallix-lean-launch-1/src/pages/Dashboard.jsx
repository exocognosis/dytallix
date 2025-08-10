import React from 'react'
import '../styles/global.css'
import BlockHeightWidget from '../components/BlockHeightWidget.jsx'
import PQCStatusCard from '../components/PQCStatusCard.jsx'

const Dashboard = () => {
  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Network Dashboard</h2>
          <p className="section-subtitle">Real-time network analytics, performance metrics, and activity.</p>
        </div>
        <div className="grid grid-2">
          <BlockHeightWidget />
          <PQCStatusCard />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
