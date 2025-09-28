import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiConfig, createClient, defaultChains } from 'wagmi';
import { getDefaultProvider } from 'ethers';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';

import './styles/App.css';
import Dashboard from './components/Dashboard';
import TradingView from './components/TradingView';
import BotConfiguration from './components/BotConfiguration';
import Positions from './components/Positions';
import Trades from './components/Trades';
import DEXAggregator from './components/DEXAggregator';

// Configure Wagmi client for wallet connectivity
const chains = defaultChains;
const provider = getDefaultProvider();
const client = createClient({
  provider,
  chains,
});

// Configure Apollo Client for GraphQL if needed
const apolloClient = new ApolloClient({
  uri: '/graphql', // This would be your GraphQL endpoint
  cache: new InMemoryCache(),
});

function App() {
  return (
    <WagmiConfig client={client}>
      <RainbowKitProvider chains={chains} theme={darkTheme()}>
        <ApolloProvider client={apolloClient}>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/trading" element={<TradingView />} />
                <Route path="/bot-config" element={<BotConfiguration />} />
                <Route path="/positions" element={<Positions />} />
                <Route path="/trades" element={<Trades />} />
                <Route path="/dex-aggregator" element={<DEXAggregator />} />
              </Routes>
            </div>
          </Router>
        </ApolloProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;