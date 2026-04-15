# Firestore Optimization Checklist (Dungeon Architect)

This checklist is designed to keep the Dungeon Architect application within the Firebase Free Tier (Spark Plan) while maintaining high performance and security.

## 1. Firestore Read & Call Minimization
- [ ] **Centralized Data Context**: Move `onSnapshot` listeners from `App.tsx` into a dedicated `DungeonDataContext.tsx`. This prevents redundant listeners if multiple components (like the Sidebar and Admin Dashboard) need access to the same level list.
- [ ] **Strict Query Limits**: Apply `.limit(50)` to the `levels` and `campaigns` collections. This prevents the app from downloading hundreds of dungeons at once, which would quickly exhaust the 50k daily read limit.
- [ ] **Mandatory Cleanup**: Ensure every `useEffect` that starts a listener returns its `unsubscribe` function. (Currently implemented in `App.tsx`, must be maintained).
- [ ] **UID Scoping**: When a user is managing their own levels, use `where('authorId', '==', user.uid)` to avoid scanning the entire global library.
- [ ] **Composite Indexing**: Use `orderBy('createdAt', 'desc').limit(20)` for the "Recent Levels" view to ensure efficient data retrieval.

## 2. AI Token & Context Management (Future Proofing)
- [ ] **Context Pruning**: If adding AI-generated dungeons, send only the tile types and coordinates to Gemini, not the full metadata of every tile.
- [ ] **Just-in-Time Fetching**: Use Gemini Function Calling to let the AI request specific level data only when needed for analysis or modification.

## 3. Security & Data Leak Prevention
- [ ] **Schema Enforcement**: Maintain `hasOnlyAllowedFields()` in `firestore.rules` to prevent unauthorized data injection.
- [ ] **Size Constraints**: Add `.size() < 100` for names and `.size() < 100000` (100KB) for the `data` (tiles) field in security rules to prevent "Resource Exhaustion" attacks.
- [ ] **PII Isolation**: Keep user emails restricted to the `users` collection with strict `isOwner()` read rules.

## 4. Quota & Error Resilience
- [ ] **Graceful Quota Handling**: Update `ErrorBoundary` to detect "Quota Exceeded" errors and display a user-friendly "Dungeon at Capacity" message instead of a generic crash.
- [ ] **Optimistic UI**: Extend optimistic updates (currently on Sitemaps) to Level saving and Campaign management so the UI feels instant.

## 5. Checklist for New Features
- [ ] Does this new feature reuse the existing `DungeonDataContext`?
- [ ] Is there a `limit()` on the new query?
- [ ] Are the security rules updated for any new data fields?
