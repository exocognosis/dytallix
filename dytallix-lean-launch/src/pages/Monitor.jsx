import React from 'react'
import BlockHeightWidget from '../components/BlockHeightWidget.jsx'
import PQCStatusCard from '../components/PQCStatusCard.jsx'

const Monitor = () => {
  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Network Monitor</h2>
          <p className="section-subtitle">Live network insights from the local node and PQC layer</p>
        </div>
        <div className="grid grid-2">
          <BlockHeightWidget />
          <PQCStatusCard />
        </div>
      </div>
    </div>
  )
}

export default Monitor
