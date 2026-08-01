import 'dotenv/config';

console.log("URL:", process.env.SUPABASE_URL);
console.log("Key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("Bucket:", process.env.SUPABASE_BUCKET);

const response = await fetch(
  `${process.env.SUPABASE_URL}/storage/v1/bucket`,
  {
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  }
);

console.log(response.status);
console.log(await response.text());