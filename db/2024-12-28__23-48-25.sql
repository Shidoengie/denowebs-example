begin;
savepoint "created table users";
create table users(
    id uuid not null default gen_random_uuid() primary key,
    email text not null,
    hash text not null
);
commit;