import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function LessonsScreen() {
  return (
    <View style={styles.container} testID="lessons-screen">
      <Text style={styles.title}>Lessons</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
