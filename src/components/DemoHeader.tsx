import React from 'react';
import styled from 'styled-components';
import ResetCountdown from './ResetCountdown';

const HeaderContainer = styled.div`
  background-color: #1f2937;
  color: white;
  padding: 8px 16px;
`;

const HeaderContent = styled.div`
  max-width: 80rem;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const AdminLink = styled.a`
  color: #93c5fd;
  text-decoration: underline;
  
  &:hover {
    color: #bfdbfe;
  }
`;

const Credentials = styled.span`
  color: #9ca3af;
`;

const DemoHeader: React.FC = () => {
  return (
    <HeaderContainer>
      <HeaderContent>
        <LeftSection>
          <AdminLink href="/admin">
            Try the admin center
          </AdminLink>
          <Credentials>
            (email: admin@here.com pass: admin)
          </Credentials>
        </LeftSection>
        <ResetCountdown />
      </HeaderContent>
    </HeaderContainer>
  );
};

export default DemoHeader;
