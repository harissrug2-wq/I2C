import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path, 'utf8');

const migration = read('supabase/migrations/202609030001_auth_isolated_workspaces.sql');
const dataContext = read('src/context/DataContext.jsx');
const authContext = read('src/context/AuthContext.jsx');
const app = read('src/App.jsx');
const login = read('src/pages/LoginPage.jsx');
const repository = read('src/domain/workspaceRepository.js');

assert.match(migration, /alter table public\.workspace_state enable row level security/i);
assert.match(migration, /owner_id = auth\.uid\(\)/i);
assert.match(migration, /on_auth_user_created_i2c/i);
assert.match(migration, /unique references auth\.users\(id\)/i);

assert.doesNotMatch(dataContext, /localStorage|i2cashflow_workspace_v/i, 'Operational workspace data must not use browser localStorage');
assert.match(dataContext, /loadWorkspaceState\(authUser\.id\)/);
assert.match(dataContext, /saveWorkspaceState/);
assert.match(repository, /\.eq\('owner_id', userId\)/);
assert.match(repository, /\.eq\('workspace_id', workspaceId\)/);

assert.match(authContext, /signInWithPassword/);
assert.match(authContext, /auth\.signUp/);
assert.match(authContext, /auth\.signOut/);
assert.match(login, /Create Account/);
assert.match(login, /No matching account was found/);
assert.match(app, /!user\.isAuthenticated/);
assert.match(app, /AuthProvider/);

console.log('✓ Auth + account isolation tests passed');
