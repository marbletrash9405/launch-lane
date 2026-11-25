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
import Dashboard from '@/pages/dashboard';
import CompleteProfile from '@/pages/complete-profile';
import ClerkSignInPage from '@/pages/clerk-sign-in';
import ClerkSignUpPage from '@/pages/clerk-sign-up';
import NotFound from '@/pages/not_found';
import ClerkAppShell from '@/components/ClerkAppShell';
import AdminPage from '@/pages/admin';
import GuardianApprovalPage from '@/pages/guardian-approval';
import MessagesPage from '@/pages/messages';
import TermsPage from '@/pages/terms';
import PrivacyPage from '@/pages/privacy';

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
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/messages/:threadId" component={MessagesPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/guardian/approval/:token" component={GuardianApprovalPage} />
        <Route path="/complete-profile" component={CompleteProfile} />
        <Route path="/sign-in/*?" component={ClerkSignInPage} />
        <Route path="/sign-up/*?" component={ClerkSignUpPage} />
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
      <ClerkAppShell>
        <Header />
        <main><Router /></main>
        <Footer />
      </ClerkAppShell>
    </WouterRouter>
  );
}

export default App;
