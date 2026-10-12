export const cloudConfig=Object.freeze({
 enabled:true,
 supabaseUrl:'https://kdxxetrfxpwgzatostfa.supabase.co',
 publishableKey:'sb_publishable_sYKY8BtYUk3ewdygDiMhRQ__bATXT08'
});

export function cloudConfigured(){
 return cloudConfig.enabled&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cloudConfig.supabaseUrl)&&cloudConfig.publishableKey.length>20;
}
