import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Navbar from './Navbar';
import Footer from './Footer';
import DemoHeader from './DemoHeader';
import GlobalStyles from '../styles/GlobalStyles';

const Main = styled.main`
  min-height: calc(100vh - 200px); // Adjust based on navbar and footer height
`;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Reset scroll position when navigating to a new page without a hash
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);
  
  return (
    <>
      <GlobalStyles />
      <DemoHeader />
      <Navbar />
      <Main>{children}</Main>
      <Footer />
    </>
  );
};

export default Layout; 