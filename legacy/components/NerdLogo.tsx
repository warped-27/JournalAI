import React, { useState, useEffect } from 'react';
import { Text, Platform, StyleSheet, TextStyle } from 'react-native';

interface NerdLogoProps {
  style?: TextStyle | TextStyle[];
  fontSize?: number;
}

export const NerdLogo: React.FC<NerdLogoProps> = ({ style, fontSize = 24 }) => {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink((b) => !b);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text
      style={[
        styles.logo,
        { fontSize },
        style,
      ]}
    >
      {`> NERD_JOURNAL${blink ? '_' : ' '}`}
    </Text>
  );
};

const styles = StyleSheet.create({
  logo: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#00FF41',
    fontWeight: 'bold',
    textShadowColor: '#00FF41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
