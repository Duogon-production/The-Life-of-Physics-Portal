-- Bound persisted untrusted response payloads on the Free database. This does
-- not replace transport request limits/rate limits in the future HTTP adapter.
alter table public.assessment_responses add constraint assessment_response_size_limit
 check (octet_length(response::text)<=65536);
