begin;
savepoint "altered users table";
alter table users add column if not exists salt text;
end;