import React, { useEffect, useState } from 'react'
import { getBlockHeight } from '../lib/api.js'

const BlockHeightWidget = () => {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const fetchHeight = async () => {
      const h = await getBlockHeight()
      setHeight(h)
    }
    fetchHeight()
    const id = setInterval(fetchHeight, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card">
      <h3>Block Height</h3>
      <p>{height}</p>
    </div>
  )
}

export default BlockHeightWidget
