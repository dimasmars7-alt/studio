export const cloudConfig=Object.freeze({
 enabled:false,
 supabaseUrl:'',
 publishableKey:''
});

export function cloudConfigured(){
 return cloudConfig.enabled&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cloudConfig.supabaseUrl)&&cloudConfig.publishableKey.length>20;
}
