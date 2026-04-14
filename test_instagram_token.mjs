import https from 'https';

const token = "IGAANVMPFNVktBZAGJpeXVMRGFVSFJod3NId3RTMHAzelpybjdfNjFHdXJIc20wZATBzMUg0RWJfLUlwdGI4N2E3em1keTg1U0JJa2lSZAXVBVE1TeF8wRVRtUkQ3U0VEcWFubnEtODNvMEladVZAvbmswMEoyLW9MakpLbWJEWVFwQQZDZD";

https.get(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Basic Display response:', data));
}).on('error', err => console.log(err));

// Note: If this is an IG Basic Display token from Instagram app, it's graph.instagram.com.
// If it's a Graph API token, it would be graph.facebook.com
https.get(`https://graph.facebook.com/v19.0/me?access_token=${token}`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Graph API response:', data));
}).on('error', err => console.log(err));
