import { Redirect } from 'expo-router';

export default function SuperadminRecipesRedirect() {
  return <Redirect href={'/(superadmin)/dashboard/recipes' as any} />;
}
