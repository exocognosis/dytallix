import React from 'react'
import BlockHeightWidget from '../components/BlockHeightWidget.jsx'
import PQCStatusCard from '../components/PQCStatusCard.jsx'

const Monitor = () => {
  return (
    <div className="container section">
      <h2 className="section-title">Network Monitor</h2>
      <div className="grid grid-2">
        <BlockHeightWidget />
        <PQCStatusCard />
      </div>
    </div>
  )
}

export default Monitor
