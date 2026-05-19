alter table content_sets
  add column if not exists language text not null default 'en';
