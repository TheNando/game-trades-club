import { render } from 'preact';
import { LocationProvider, Router, Route } from 'preact-iso';

import { Header } from './components/Header';
import { AddListing } from './pages/addListing';
import { Admin } from './pages/admin';
import { Games } from './pages/games';
import { Home } from './pages/home';
import { Inbox } from './pages/inbox';
import { ListingDetail } from './pages/listingDetail';
import { Shops } from './pages/shops';
import { UserProfile } from './pages/userProfile';
import { NotFound } from './pages/_404';

import './style.css';

export function App() {
  return (
    <LocationProvider>
      <Header />
      <main>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/games" component={Games} />
          <Route path="/listings/:id" component={ListingDetail} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/inbox/:id" component={Inbox} />
          <Route path="/users/:id" component={UserProfile} />
          <Route path="/add-listing" component={AddListing} />
          <Route path="/shops" component={Shops} />
          <Route path="/admin/shops" component={Admin} />
          <Route default component={NotFound} />
        </Router>
      </main>
    </LocationProvider>
  );
}

render(<App />, document.getElementById('app'));
