import React from "react"

import { BrowserRouter as Router, Switch, Route } from "react-router-dom"

import Login from "./Login"

function App() {
  return (
    <div style={{ fontFamily: 'Avenir' }}>
      <Router>
        {/* <AuthProvider> */}
          <Switch>
            
            <Route path="/" component={Login} />
          </Switch>
        {/* </AuthProvider> */}
      </Router>
    </div>
  )
}

export default App
