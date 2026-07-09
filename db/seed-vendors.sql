-- Keep in sync with lib/feeds/sources.ts (ingest upserts these too; this seed
-- just makes the bubbles show up without waiting for the next ingest run).
insert into vendors (slug, name, homepage) values
  -- AI / LLM
  ('anthropic','Anthropic','https://www.anthropic.com'),
  ('openai','OpenAI','https://openai.com'),
  ('google-cloud','Google Cloud (Gemini / Vertex)','https://cloud.google.com'),
  ('perplexity','Perplexity','https://www.perplexity.ai'),
  ('groq','Groq','https://groq.com'),
  ('xai','xAI','https://x.ai'),
  ('openrouter','OpenRouter','https://openrouter.ai'),
  -- AI agent tooling
  ('langchain','LangChain','https://www.langchain.com'),
  ('langgraph','LangGraph','https://www.langchain.com/langgraph'),
  ('langsmith','LangSmith','https://smith.langchain.com'),
  ('composio','Composio','https://composio.dev'),
  ('e2b','E2B','https://e2b.dev'),
  ('browseruse','Browser Use','https://browser-use.com'),
  ('firecrawl','Firecrawl','https://www.firecrawl.dev'),
  ('exa','Exa','https://exa.ai'),
  ('linkup','Linkup','https://www.linkup.so'),
  ('apify','Apify','https://apify.com'),
  -- Voice / meetings
  ('elevenlabs','ElevenLabs','https://elevenlabs.io'),
  ('recallai','Recall.ai','https://www.recall.ai'),
  ('deepgram','Deepgram','https://deepgram.com'),
  -- Hosting / Infra
  ('vercel','Vercel','https://vercel.com'),
  ('netlify','Netlify','https://www.netlify.com'),
  ('cloudflare','Cloudflare','https://www.cloudflare.com'),
  ('render','Render','https://render.com'),
  ('flyio','Fly.io','https://fly.io'),
  ('aws','AWS','https://aws.amazon.com'),
  ('github','GitHub','https://github.com'),
  ('inngest','Inngest','https://www.inngest.com'),
  -- Database / Backend
  ('supabase','Supabase','https://supabase.com'),
  ('planetscale','PlanetScale','https://planetscale.com'),
  ('mongodb','MongoDB Atlas','https://www.mongodb.com'),
  ('upstash','Upstash','https://upstash.com'),
  ('postgresql','PostgreSQL','https://www.postgresql.org'),
  ('redis','Redis','https://redis.io'),
  ('chromadb','ChromaDB','https://www.trychroma.com'),
  -- Auth
  ('clerk','Clerk','https://clerk.com'),
  ('workos','WorkOS','https://workos.com'),
  ('auth0','Auth0','https://auth0.com'),
  -- Payments
  ('stripe','Stripe','https://stripe.com'),
  -- Email / Comms
  ('resend','Resend','https://resend.com'),
  ('twilio','Twilio','https://www.twilio.com'),
  ('sendgrid','SendGrid','https://sendgrid.com'),
  ('brevo','Brevo','https://www.brevo.com'),
  -- Monitoring / Observability
  ('sentry','Sentry','https://sentry.io'),
  ('datadog','Datadog','https://www.datadoghq.com'),
  ('posthog','PostHog','https://posthog.com'),
  ('svix','Svix','https://www.svix.com'),
  -- Frameworks / runtimes / libraries
  ('nextjs','Next.js','https://nextjs.org'),
  ('react','React','https://react.dev'),
  ('nodejs','Node.js','https://nodejs.org'),
  ('deno','Deno','https://deno.com'),
  ('bun','Bun','https://bun.sh'),
  ('prisma','Prisma','https://www.prisma.io'),
  ('tailwindcss','Tailwind CSS','https://tailwindcss.com'),
  ('fastapi','FastAPI','https://fastapi.tiangolo.com'),
  ('pydantic','Pydantic','https://pydantic.dev'),
  ('spring-boot','Spring Boot','https://spring.io/projects/spring-boot'),
  ('java','Java','https://www.java.com')
on conflict (slug) do nothing;
