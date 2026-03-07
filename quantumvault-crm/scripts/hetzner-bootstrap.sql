-- Run this file as a PostgreSQL superuser on the Hetzner server.
-- Update the role name, database name, and password before use.

create role quantumvault_crm with
  login
  password 'change_me';

create database quantumvault_crm owner quantumvault_crm;

\connect quantumvault_crm

grant all privileges on schema public to quantumvault_crm;
alter default privileges in schema public grant all on tables to quantumvault_crm;
alter default privileges in schema public grant all on sequences to quantumvault_crm;
alter default privileges in schema public grant all on functions to quantumvault_crm;