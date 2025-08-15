import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const CountdownContainer = styled.div`
  background-color: #fef2f2;
  color: #dc2626;
  font-size: 0.75rem;
  padding: 4px 8px;
  text-align: center;
  font-weight: 500;
`;

const ResetCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>({
    minutes: 0,
    seconds: 0
  });

  // Calculate time until next hour
  const calculateTimeUntilNextHour = (): { minutes: number; seconds: number } => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1);
    nextHour.setMinutes(0);
    nextHour.setSeconds(0);
    nextHour.setMilliseconds(0);
    
    const diffMs = nextHour.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);
    
    return { minutes: diffMinutes, seconds: diffSeconds };
  };

  useEffect(() => {
    // Set initial time
    setTimeLeft(calculateTimeUntilNextHour());
    
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeUntilNextHour());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <CountdownContainer>
      This demo will reset in {timeLeft.minutes}m {timeLeft.seconds}s
    </CountdownContainer>
  );
};

export default ResetCountdown;
