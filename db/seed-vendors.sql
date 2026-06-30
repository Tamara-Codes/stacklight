insert into vendors (slug, name, homepage) values
  ('anthropic','Anthropic','https://www.anthropic.com'),
  ('vercel','Vercel','https://vercel.com'),
  ('supabase','Supabase','https://supabase.com'),
  ('clerk','Clerk','https://clerk.com'),
  ('openai','OpenAI','https://openai.com'),
  ('twilio','Twilio','https://www.twilio.com')
on conflict (slug) do nothing;
