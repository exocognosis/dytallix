import React, { useEffect, useState } from 'react';
import { getBlockHeight } from '../lib/api';

export default function BlockHeightWidget() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    getBlockHeight().then(setHeight);
    const id = setInterval(async () => {
      const h = await getBlockHeight();
      setHeight(h);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <strong>Block Height:</strong> {height}
    </div>
  );
}
