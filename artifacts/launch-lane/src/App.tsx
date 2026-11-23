import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Home from '@/pages/page';
import HowItWorks from '@/pages/how_it_works';
import Explore from '@/pages/explore';
import Students from '@/pages/students';
import Residents from '@/pages/residents';
import About from '@/pages/about';
import Faq from '@/pages/faq';
import Login from '@/pages/login';
import Signup from '@/pages/signup';
import NotFound from '@/pages/not_found';

import './globals.css';

function Router() {
  return (
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/explore" component={Explore} />
        <Route path="/students" component={Students} />
        <Route path="/residents" component={Residents} />
        <Route path="/about" component={About} />
        <Route path="/faq" component={Faq} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/listings"><Redirect to="/explore" /></Route>
        <Route path="/apply"><Redirect to="/students#apply" /></Route>
        <Route path="/request"><Redirect to="/residents#post-a-job" /></Route>
        <Route path="/hirers"><Redirect to="/residents" /></Route>
        <Route path="/our-story"><Redirect to="/about" /></Route>
        <Route><NotFound /></Route>
      </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Header />
      <main><Router /></main>
      <Footer />
    </WouterRouter>
  );
}

export default App;
