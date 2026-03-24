import React, { JSX, useState } from 'react'

function App(): JSX.Element {
  const [count, setCount] = useState<number>(0)

  return (
    <div>
      <h1>React + Electron + TypeScript</h1>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  )
}

export default App