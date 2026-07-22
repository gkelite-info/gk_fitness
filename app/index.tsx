import { Redirect } from 'expo-router';

export default function Index() {
  // @ts-ignore: Suppress typed routes error for dynamic/unregistered path
  return <Redirect href="/(customer)/home" />;
}
